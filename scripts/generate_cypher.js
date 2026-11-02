/**
 * VedaAI — IMPPAT Data Parser & Cypher Generator
 * Reads the 3 downloaded TSV files and outputs a ready-to-paste .cypher seed script
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'vedaai_seed.cypher');

// ─── Target Ayurvedic Herbs (our 25 key herbs for VedaAI) ───────────────────
const TARGET_HERBS = [
  'Zingiber officinale',       // Ginger / Adrak
  'Curcuma longa',             // Turmeric / Haldi
  'Azadirachta indica',        // Neem
  'Withania somnifera',        // Ashwagandha
  'Ocimum tenuiflorum',        // Tulsi / Holy Basil
  'Tinospora cordifolia',      // Giloy / Guduchi
  'Emblica officinalis',       // Amla / Indian Gooseberry
  'Terminalia chebula',        // Haritaki
  'Terminalia bellirica',      // Bibhitaki
  'Bacopa monnieri',           // Brahmi
  'Commiphora wightii',        // Guggul
  'Boswellia serrata',         // Shallaki
  'Piper longum',              // Pippali / Long Pepper
  'Piper nigrum',              // Kali Mirch / Black Pepper
  'Coriandrum sativum',        // Dhania / Coriander
  'Foeniculum vulgare',        // Saunf / Fennel
  'Glycyrrhiza glabra',        // Mulethi / Licorice
  'Centella asiatica',         // Gotu Kola / Mandukparni
  'Aloe vera',                 // Ghritkumari
  'Nardostachys jatamansi',    // Jatamansi
  'Sida cordifolia',           // Bala
  'Asparagus racemosus',       // Shatavari
  'Mucuna pruriens',           // Kaunch Beej
  'Moringa oleifera',          // Sahjan / Drumstick
  'Andrographis paniculata',   // Kalmegh / King of Bitters
];

// ─── Dosha metadata (from Ayurvedic classical texts) ────────────────────────
const DOSHA_DATA = [
  { name: 'Vata', season: 'Varsha', qualities: 'dry,cold,light,mobile,subtle,rough' },
  { name: 'Pitta', season: 'Grishma', qualities: 'hot,sharp,light,liquid,oily,spreading' },
  { name: 'Kapha', season: 'Vasanta', qualities: 'heavy,slow,cold,oily,smooth,dense,soft,static' },
];

// ─── Season metadata ─────────────────────────────────────────────────────────
const SEASON_DATA = [
  { name: 'Vasanta', english: 'Spring', months: 'March-April' },
  { name: 'Grishma', english: 'Summer', months: 'May-June' },
  { name: 'Varsha', english: 'Monsoon', months: 'July-August' },
  { name: 'Sharada', english: 'Autumn', months: 'September-October' },
  { name: 'Hemanta', english: 'Pre-Winter', months: 'November-December' },
  { name: 'Shishira', english: 'Winter', months: 'January-February' },
];

// ─── Herb → Dosha relationships (from classical Ayurvedic texts) ─────────────
const HERB_DOSHA_RELATIONS = [
  { herb: 'Zingiber officinale',    dosha: 'Pitta', rel: 'AGGRAVATES', strength: 4, reason: 'Ushna virya stimulates Pitta' },
  { herb: 'Zingiber officinale',    dosha: 'Vata',  rel: 'PACIFIES',   strength: 5, reason: 'Katu rasa and Ushna virya reduce Vata' },
  { herb: 'Zingiber officinale',    dosha: 'Kapha', rel: 'PACIFIES',   strength: 4, reason: 'Ushna and Laghu guna reduce Kapha' },
  { herb: 'Curcuma longa',          dosha: 'Pitta', rel: 'PACIFIES',   strength: 3, reason: 'Tikta rasa moderates Pitta' },
  { herb: 'Curcuma longa',          dosha: 'Kapha', rel: 'PACIFIES',   strength: 4, reason: 'Katu rasa reduces Kapha' },
  { herb: 'Curcuma longa',          dosha: 'Vata',  rel: 'AGGRAVATES', strength: 2, reason: 'Ruksha guna can increase Vata' },
  { herb: 'Azadirachta indica',     dosha: 'Pitta', rel: 'PACIFIES',   strength: 5, reason: 'Tikta and Sheeta reduce excess Pitta' },
  { herb: 'Azadirachta indica',     dosha: 'Kapha', rel: 'PACIFIES',   strength: 4, reason: 'Bitter taste reduces Kapha' },
  { herb: 'Withania somnifera',     dosha: 'Vata',  rel: 'PACIFIES',   strength: 5, reason: 'Madhura rasa and Snigdha guna ground Vata' },
  { herb: 'Withania somnifera',     dosha: 'Kapha', rel: 'AGGRAVATES', strength: 3, reason: 'Guru guna can increase Kapha' },
  { herb: 'Ocimum tenuiflorum',     dosha: 'Vata',  rel: 'PACIFIES',   strength: 4, reason: 'Ushna virya reduces Vata' },
  { herb: 'Ocimum tenuiflorum',     dosha: 'Kapha', rel: 'PACIFIES',   strength: 4, reason: 'Katu rasa reduces Kapha' },
  { herb: 'Ocimum tenuiflorum',     dosha: 'Pitta', rel: 'AGGRAVATES', strength: 3, reason: 'Ushna virya can stimulate Pitta in excess' },
  { herb: 'Emblica officinalis',    dosha: 'Pitta', rel: 'PACIFIES',   strength: 5, reason: 'Sheeta virya and Amla rasa balance Pitta' },
  { herb: 'Emblica officinalis',    dosha: 'Vata',  rel: 'PACIFIES',   strength: 4, reason: 'Madhura rasa in vipaka pacifies Vata' },
  { herb: 'Emblica officinalis',    dosha: 'Kapha', rel: 'PACIFIES',   strength: 3, reason: 'Kashaya and Katu rasa reduce Kapha' },
  { herb: 'Glycyrrhiza glabra',     dosha: 'Pitta', rel: 'PACIFIES',   strength: 5, reason: 'Madhura rasa and Sheeta virya calm Pitta' },
  { herb: 'Glycyrrhiza glabra',     dosha: 'Vata',  rel: 'PACIFIES',   strength: 4, reason: 'Snigdha guna soothes Vata' },
  { herb: 'Glycyrrhiza glabra',     dosha: 'Kapha', rel: 'AGGRAVATES', strength: 4, reason: 'Guru and Snigdha increase Kapha' },
  { herb: 'Foeniculum vulgare',     dosha: 'Pitta', rel: 'PACIFIES',   strength: 4, reason: 'Sheeta virya cools Pitta' },
  { herb: 'Foeniculum vulgare',     dosha: 'Vata',  rel: 'PACIFIES',   strength: 3, reason: 'Ushna in small doses reduces Vata' },
  { herb: 'Aloe vera',              dosha: 'Pitta', rel: 'PACIFIES',   strength: 5, reason: 'Sheeta virya strongly cools Pitta' },
  { herb: 'Aloe vera',              dosha: 'Kapha', rel: 'AGGRAVATES', strength: 3, reason: 'Guru and Snigdha increase Kapha' },
  { herb: 'Bacopa monnieri',        dosha: 'Vata',  rel: 'PACIFIES',   strength: 4, reason: 'Snigdha guna nourishes nervous system' },
  { herb: 'Bacopa monnieri',        dosha: 'Pitta', rel: 'PACIFIES',   strength: 3, reason: 'Sheeta virya reduces Pitta' },
  { herb: 'Piper longum',           dosha: 'Kapha', rel: 'PACIFIES',   strength: 5, reason: 'Katu rasa and Ushna virya strongly reduce Kapha' },
  { herb: 'Piper longum',           dosha: 'Vata',  rel: 'PACIFIES',   strength: 4, reason: 'Ushna virya reduces Vata' },
  { herb: 'Piper longum',           dosha: 'Pitta', rel: 'AGGRAVATES', strength: 4, reason: 'Katu and Ushna increase Pitta' },
  { herb: 'Asparagus racemosus',    dosha: 'Pitta', rel: 'PACIFIES',   strength: 5, reason: 'Madhura and Sheeta reduce Pitta' },
  { herb: 'Asparagus racemosus',    dosha: 'Vata',  rel: 'PACIFIES',   strength: 4, reason: 'Snigdha and Guru nourish Vata' },
  { herb: 'Moringa oleifera',       dosha: 'Kapha', rel: 'PACIFIES',   strength: 4, reason: 'Tikta rasa reduces Kapha' },
  { herb: 'Moringa oleifera',       dosha: 'Vata',  rel: 'PACIFIES',   strength: 3, reason: 'Ushna virya warms and reduces Vata' },
  { herb: 'Andrographis paniculata',dosha: 'Pitta', rel: 'PACIFIES',   strength: 4, reason: 'Tikta and Sheeta strongly pacify Pitta' },
  { herb: 'Andrographis paniculata',dosha: 'Kapha', rel: 'PACIFIES',   strength: 4, reason: 'Tikta rasa reduces Kapha' },
  { herb: 'Tinospora cordifolia',   dosha: 'Pitta', rel: 'PACIFIES',   strength: 4, reason: 'Sheeta virya cools excess Pitta' },
  { herb: 'Tinospora cordifolia',   dosha: 'Kapha', rel: 'PACIFIES',   strength: 3, reason: 'Tikta rasa reduces Kapha' },
  { herb: 'Tinospora cordifolia',   dosha: 'Vata',  rel: 'PACIFIES',   strength: 3, reason: 'Madhura rasa balances Vata' },
];

// ─── Herb → Season contraindications ────────────────────────────────────────
const HERB_SEASON_CONTRAINDICATIONS = [
  { herb: 'Zingiber officinale', season: 'Grishma', reason: 'Ushna virya amplified in summer heat aggravates Pitta severely' },
  { herb: 'Piper longum',        season: 'Grishma', reason: 'Hot potency dangerous in peak summer' },
  { herb: 'Piper nigrum',        season: 'Grishma', reason: 'Katu+Ushna combination worsens Pitta in summer' },
  { herb: 'Aloe vera',           season: 'Varsha',  reason: 'Excess moisture in monsoon + Kapha properties can worsen conditions' },
];

// ─── Chronic conditions → Dosha associations ────────────────────────────────
const CONDITION_DOSHA = [
  { condition: 'Acid Reflux',       dosha: 'Pitta', strength: 5 },
  { condition: 'GERD',              dosha: 'Pitta', strength: 5 },
  { condition: 'Inflammation',      dosha: 'Pitta', strength: 4 },
  { condition: 'Anxiety',           dosha: 'Vata',  strength: 5 },
  { condition: 'Arthritis',         dosha: 'Vata',  strength: 4 },
  { condition: 'Constipation',      dosha: 'Vata',  strength: 4 },
  { condition: 'Obesity',           dosha: 'Kapha', strength: 5 },
  { condition: 'Diabetes',          dosha: 'Kapha', strength: 4 },
  { condition: 'Respiratory Issues',dosha: 'Kapha', strength: 4 },
  { condition: 'Skin Disorders',    dosha: 'Pitta', strength: 4 },
  { condition: 'Insomnia',          dosha: 'Vata',  strength: 5 },
  { condition: 'Hypertension',      dosha: 'Pitta', strength: 3 },
];

// ────────────────────────────────────────────────────────────────────────────

function parseTSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split('\t').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split('\t');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || '').trim(); });
    return obj;
  });
}

function esc(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function main() {
  console.log('📂 Reading IMPPAT TSV files...');

  const plants = parseTSV(path.join(DATA_DIR, 'Plant_Information_IMPPAT.tsv'));
  const therapeutic = parseTSV(path.join(DATA_DIR, 'IMPPAT_TherapeuticUse_Plant_Association.tsv'));
  const formulations = parseTSV(path.join(DATA_DIR, 'IMPPAT_SingleHerbalFormulations.tsv'));

  // Filter to our 25 target herbs
  const targetPlants = plants.filter(p =>
    TARGET_HERBS.some(t => p['Indian_Medicinal_plant'] && p['Indian_Medicinal_plant'].toLowerCase().includes(t.toLowerCase().substring(0, 10)))
  );

  console.log(`✅ Found ${targetPlants.length} matching herbs from IMPPAT`);

  // Build therapeutic use map
  const therapeuticMap = {};
  therapeutic.forEach(row => {
    const plant = row['Indian_Medicinal_plant'];
    if (!therapeuticMap[plant]) therapeuticMap[plant] = new Set();
    if (row['Therapeutic_use']) therapeuticMap[plant].add(row['Therapeutic_use'].toLowerCase().trim());
  });

  // Build formulation map
  const formulationMap = {};
  formulations.forEach(row => {
    const plant = row['Plant_name_standardised'];
    if (!formulationMap[plant]) formulationMap[plant] = [];
    if (row['Formulation_name_in_API_original']) {
      formulationMap[plant].push({
        name: row['Formulation_name_in_API_original'].substring(0, 60),
        uses: (row['Therapeutic_uses_standardised'] || '').split('|').slice(0, 3).join(', ')
      });
    }
  });

  let cypher = '';

  cypher += `// ════════════════════════════════════════════════════════════════
// VedaAI Knowledge Graph — Seed Script
// Generated from IMPPAT 2.0 Database (imppat.ac.in)
// Team: Mohit Gupta, Prasun Sharma, Rahul Kumar, Ravi Baliyan
// Supervisor: Ms. Mahima Saxena | AKGEC Ghaziabad
// ════════════════════════════════════════════════════════════════

// STEP 0: Clear existing data (safe for fresh setup)
MATCH (n) DETACH DELETE n;

`;

  // ── DOSHAS ──────────────────────────────────────────────────────────────────
  cypher += `// ── DOSHAS ──────────────────────────────────────────────────────\n`;
  DOSHA_DATA.forEach(d => {
    cypher += `CREATE (:Dosha {name: '${d.name}', season_dominance: '${d.season}', qualities: '${d.qualities}'});\n`;
  });

  // ── SEASONS ─────────────────────────────────────────────────────────────────
  cypher += `\n// ── SEASONS ─────────────────────────────────────────────────────\n`;
  SEASON_DATA.forEach(s => {
    cypher += `CREATE (:Season {name: '${s.name}', english: '${s.english}', months: '${s.months}'});\n`;
  });

  // ── SEASON → DOSHA dominant ──────────────────────────────────────────────
  cypher += `\n// ── SEASON → DOSHA relationships ────────────────────────────────\n`;
  const seasonDoshaMap = [
    { season: 'Grishma', dosha: 'Pitta' },
    { season: 'Sharada', dosha: 'Pitta' },
    { season: 'Varsha',  dosha: 'Vata' },
    { season: 'Hemanta', dosha: 'Vata' },
    { season: 'Vasanta', dosha: 'Kapha' },
    { season: 'Shishira',dosha: 'Kapha' },
  ];
  seasonDoshaMap.forEach(sd => {
    cypher += `MATCH (s:Season {name:'${sd.season}'}), (d:Dosha {name:'${sd.dosha}'}) CREATE (s)-[:DOMINANT_IN]->(d);\n`;
  });

  // ── CHRONIC CONDITIONS ───────────────────────────────────────────────────
  cypher += `\n// ── CHRONIC CONDITIONS ──────────────────────────────────────────\n`;
  CONDITION_DOSHA.forEach(cd => {
    cypher += `CREATE (:Condition {name: '${esc(cd.condition)}'});\n`;
  });
  cypher += `\n// ── CONDITION → DOSHA associations ──────────────────────────────\n`;
  CONDITION_DOSHA.forEach(cd => {
    cypher += `MATCH (c:Condition {name:'${esc(cd.condition)}'}), (d:Dosha {name:'${cd.dosha}'}) CREATE (c)-[:ASSOCIATED_WITH {strength: ${cd.strength}}]->(d);\n`;
  });

  // ── HERBS ────────────────────────────────────────────────────────────────
  cypher += `\n// ── HERBS (from IMPPAT 2.0) ─────────────────────────────────────\n`;

  // Build full herb info by merging IMPPAT data with our Ayurvedic metadata
  const herbMeta = {
    'Zingiber officinale':      { sanskrit: 'Shunthi/Adrak', common: 'Ginger', rasa: 'Katu,Madhura', virya: 'Ushna', vipaka: 'Katu', guna: 'Laghu,Snigdha', synonyms: 'Adrak,Shunti,Sonth' },
    'Curcuma longa':            { sanskrit: 'Haridra', common: 'Turmeric', rasa: 'Tikta,Katu', virya: 'Ushna', vipaka: 'Katu', guna: 'Laghu,Ruksha', synonyms: 'Haldi,Turmeric' },
    'Azadirachta indica':       { sanskrit: 'Nimba', common: 'Neem', rasa: 'Tikta,Kashaya', virya: 'Sheeta', vipaka: 'Katu', guna: 'Laghu,Ruksha', synonyms: 'Neem,Nimba,Margosa' },
    'Withania somnifera':       { sanskrit: 'Ashwagandha', common: 'Indian Ginseng', rasa: 'Madhura,Kashaya', virya: 'Ushna', vipaka: 'Madhura', guna: 'Guru,Snigdha', synonyms: 'Ashwagandha,Asgandh,Winter Cherry' },
    'Ocimum tenuiflorum':       { sanskrit: 'Tulasi', common: 'Holy Basil', rasa: 'Katu,Tikta', virya: 'Ushna', vipaka: 'Katu', guna: 'Laghu,Ruksha', synonyms: 'Tulsi,Tulasi,Holy Basil' },
    'Tinospora cordifolia':     { sanskrit: 'Guduchi', common: 'Giloy', rasa: 'Tikta,Kashaya', virya: 'Ushna', vipaka: 'Madhura', guna: 'Guru,Snigdha', synonyms: 'Giloy,Guduchi,Amrita' },
    'Emblica officinalis':      { sanskrit: 'Amalaki', common: 'Indian Gooseberry', rasa: 'Amla,Madhura,Kashaya,Tikta,Katu', virya: 'Sheeta', vipaka: 'Madhura', guna: 'Laghu,Ruksha', synonyms: 'Amla,Amlaki,Amla Berry' },
    'Terminalia chebula':       { sanskrit: 'Haritaki', common: 'Chebulic Myrobalan', rasa: 'Kashaya,Madhura,Amla,Tikta,Katu', virya: 'Ushna', vipaka: 'Madhura', guna: 'Laghu,Ruksha', synonyms: 'Haritaki,Harad,Myrobalan' },
    'Terminalia bellirica':     { sanskrit: 'Bibhitaki', common: 'Belleric Myrobalan', rasa: 'Kashaya', virya: 'Ushna', vipaka: 'Madhura', guna: 'Laghu,Ruksha', synonyms: 'Bibhitaki,Baheda,Beleric' },
    'Bacopa monnieri':          { sanskrit: 'Brahmi', common: 'Water Hyssop', rasa: 'Tikta,Kashaya', virya: 'Sheeta', vipaka: 'Madhura', guna: 'Laghu,Snigdha', synonyms: 'Brahmi,Bacopa,Water Hyssop' },
    'Commiphora wightii':       { sanskrit: 'Guggulu', common: 'Indian Bdellium', rasa: 'Tikta,Kashaya,Katu', virya: 'Ushna', vipaka: 'Katu', guna: 'Laghu,Ruksha', synonyms: 'Guggul,Guggulu,Indian Bdellium' },
    'Boswellia serrata':        { sanskrit: 'Shallaki', common: 'Indian Frankincense', rasa: 'Tikta,Madhura', virya: 'Ushna', vipaka: 'Katu', guna: 'Laghu,Ruksha', synonyms: 'Shallaki,Boswellia,Frankincense' },
    'Piper longum':             { sanskrit: 'Pippali', common: 'Long Pepper', rasa: 'Katu', virya: 'Ushna', vipaka: 'Madhura', guna: 'Laghu,Snigdha,Tikshna', synonyms: 'Pippali,Long Pepper,Pipli' },
    'Piper nigrum':             { sanskrit: 'Maricha', common: 'Black Pepper', rasa: 'Katu', virya: 'Ushna', vipaka: 'Katu', guna: 'Laghu,Tikshna,Ruksha', synonyms: 'Kali Mirch,Black Pepper,Maricha' },
    'Coriandrum sativum':       { sanskrit: 'Dhanya', common: 'Coriander', rasa: 'Tikta,Katu', virya: 'Sheeta', vipaka: 'Madhura', guna: 'Laghu,Snigdha', synonyms: 'Dhania,Coriander,Dhanya' },
    'Foeniculum vulgare':       { sanskrit: 'Shatapushpa', common: 'Fennel', rasa: 'Madhura,Katu', virya: 'Sheeta', vipaka: 'Madhura', guna: 'Laghu,Snigdha', synonyms: 'Saunf,Fennel,Shatapushpa' },
    'Glycyrrhiza glabra':       { sanskrit: 'Yashtimadhu', common: 'Licorice', rasa: 'Madhura', virya: 'Sheeta', vipaka: 'Madhura', guna: 'Guru,Snigdha', synonyms: 'Mulethi,Licorice,Yashtimadhu' },
    'Centella asiatica':        { sanskrit: 'Mandukparni', common: 'Gotu Kola', rasa: 'Tikta,Kashaya', virya: 'Sheeta', vipaka: 'Madhura', guna: 'Laghu,Snigdha', synonyms: 'Gotu Kola,Mandukparni,Brahmi' },
    'Aloe vera':                { sanskrit: 'Ghritkumari', common: 'Aloe Vera', rasa: 'Tikta,Kashaya', virya: 'Sheeta', vipaka: 'Katu', guna: 'Guru,Snigdha,Tikshna', synonyms: 'Aloe Vera,Ghritkumari,Kumari' },
    'Nardostachys jatamansi':   { sanskrit: 'Jatamansi', common: 'Spikenard', rasa: 'Tikta,Kashaya,Madhura', virya: 'Sheeta', vipaka: 'Madhura', guna: 'Laghu,Snigdha', synonyms: 'Jatamansi,Spikenard,Musk Root' },
    'Sida cordifolia':          { sanskrit: 'Bala', common: 'Country Mallow', rasa: 'Madhura', virya: 'Sheeta', vipaka: 'Madhura', guna: 'Guru,Snigdha', synonyms: 'Bala,Country Mallow,Sida' },
    'Asparagus racemosus':      { sanskrit: 'Shatavari', common: 'Wild Asparagus', rasa: 'Madhura,Tikta', virya: 'Sheeta', vipaka: 'Madhura', guna: 'Guru,Snigdha', synonyms: 'Shatavari,Wild Asparagus,Satavar' },
    'Mucuna pruriens':          { sanskrit: 'Kapikacchu', common: 'Velvet Bean', rasa: 'Madhura,Tikta', virya: 'Ushna', vipaka: 'Madhura', guna: 'Guru,Snigdha', synonyms: 'Kaunch,Kapikacchu,Velvet Bean' },
    'Moringa oleifera':         { sanskrit: 'Shigru', common: 'Drumstick Tree', rasa: 'Tikta,Katu', virya: 'Ushna', vipaka: 'Katu', guna: 'Laghu,Ruksha,Tikshna', synonyms: 'Sahjan,Moringa,Drumstick,Shigru' },
    'Andrographis paniculata':  { sanskrit: 'Kalmegh', common: 'King of Bitters', rasa: 'Tikta', virya: 'Sheeta', vipaka: 'Katu', guna: 'Laghu,Ruksha', synonyms: 'Kalmegh,King of Bitters,Chirayata' },
  };

  TARGET_HERBS.forEach(botanicalName => {
    const meta = herbMeta[botanicalName] || {};
    const imppat = plants.find(p => p['Indian_Medicinal_plant'] && p['Indian_Medicinal_plant'].toLowerCase().includes(botanicalName.toLowerCase().substring(0,10)));
    const family = imppat ? esc(imppat['Family'] || '') : '';
    const system = imppat ? esc(imppat['System_of_Medicine'] || 'Ayurveda') : 'Ayurveda';
    const uses = therapeuticMap[botanicalName] ? Array.from(therapeuticMap[botanicalName]).slice(0,5).join(',') : '';

    cypher += `CREATE (:Herb {\n`;
    cypher += `  name: '${esc(meta.common || botanicalName)}',\n`;
    cypher += `  botanical_name: '${esc(botanicalName)}',\n`;
    cypher += `  sanskrit_name: '${esc(meta.sanskrit || '')}',\n`;
    cypher += `  common_name: '${esc(meta.common || '')}',\n`;
    cypher += `  rasa: '${esc(meta.rasa || '')}',\n`;
    cypher += `  virya: '${esc(meta.virya || '')}',\n`;
    cypher += `  vipaka: '${esc(meta.vipaka || '')}',\n`;
    cypher += `  guna: '${esc(meta.guna || '')}',\n`;
    cypher += `  family: '${family}',\n`;
    cypher += `  system_of_medicine: '${system}',\n`;
    cypher += `  therapeutic_uses: '${esc(uses)}',\n`;
    cypher += `  synonyms: '${esc(meta.synonyms || '')}',\n`;
    cypher += `  source: 'IMPPAT 2.0'\n`;
    cypher += `});\n`;
  });

  // ── HERB → DOSHA relationships ────────────────────────────────────────────
  cypher += `\n// ── HERB ↔ DOSHA relationships ──────────────────────────────────\n`;
  HERB_DOSHA_RELATIONS.forEach(r => {
    const meta = herbMeta[r.herb];
    const commonName = meta ? meta.common : r.herb;
    cypher += `MATCH (h:Herb {botanical_name:'${esc(r.herb)}'}), (d:Dosha {name:'${r.dosha}'}) `;
    cypher += `CREATE (h)-[:${r.rel} {strength: ${r.strength}, reason: '${esc(r.reason)}'}]->(d);\n`;
  });

  // ── HERB → SEASON contraindications ─────────────────────────────────────
  cypher += `\n// ── HERB ↔ SEASON contraindications ─────────────────────────────\n`;
  HERB_SEASON_CONTRAINDICATIONS.forEach(r => {
    cypher += `MATCH (h:Herb {botanical_name:'${esc(r.herb)}'}), (s:Season {name:'${r.season}'}) `;
    cypher += `CREATE (h)-[:CONTRAINDICATED_IN {reason: '${esc(r.reason)}'}]->(s);\n`;
  });

  // ── HERB → CONDITION (TREATS) from IMPPAT ────────────────────────────────
  cypher += `\n// ── HERB → CONDITION (TREATS) from IMPPAT therapeutic data ─────\n`;
  const conditionNames = CONDITION_DOSHA.map(c => c.condition.toLowerCase());
  TARGET_HERBS.forEach(botanicalName => {
    const uses = therapeuticMap[botanicalName] || new Set();
    uses.forEach(use => {
      const matchedCondition = CONDITION_DOSHA.find(cd =>
        use.includes(cd.condition.toLowerCase()) || cd.condition.toLowerCase().includes(use)
      );
      if (matchedCondition) {
        cypher += `MATCH (h:Herb {botanical_name:'${esc(botanicalName)}'}), (c:Condition {name:'${esc(matchedCondition.condition)}'}) `;
        cypher += `MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);\n`;
      }
    });
  });

  // ── Indexes for fast lookup ───────────────────────────────────────────────
  cypher += `\n// ── INDEXES (for fast synonym lookup) ──────────────────────────\n`;
  cypher += `CREATE INDEX herb_name_idx IF NOT EXISTS FOR (h:Herb) ON (h.name);\n`;
  cypher += `CREATE INDEX herb_botanical_idx IF NOT EXISTS FOR (h:Herb) ON (h.botanical_name);\n`;
  cypher += `CREATE INDEX dosha_name_idx IF NOT EXISTS FOR (d:Dosha) ON (d.name);\n`;
  cypher += `CREATE INDEX season_name_idx IF NOT EXISTS FOR (s:Season) ON (s.name);\n`;
  cypher += `CREATE INDEX condition_name_idx IF NOT EXISTS FOR (c:Condition) ON (c.name);\n`;

  cypher += `\n// ════════════════════════════════════════════════════════════════
// END OF SEED SCRIPT
// 25 Herbs | 3 Doshas | 6 Seasons | 12 Conditions | 150+ Relationships
// Source: IMPPAT 2.0 + Classical Ayurvedic Texts (Charaka Samhita)
// ════════════════════════════════════════════════════════════════\n`;

  fs.writeFileSync(OUTPUT_FILE, cypher, 'utf8');
  console.log(`\n✅ Cypher seed script written to: ${OUTPUT_FILE}`);
  console.log(`📊 Stats:`);
  console.log(`   Herbs: ${TARGET_HERBS.length}`);
  console.log(`   Doshas: ${DOSHA_DATA.length}`);
  console.log(`   Seasons: ${SEASON_DATA.length}`);
  console.log(`   Conditions: ${CONDITION_DOSHA.length}`);
  console.log(`   Herb-Dosha relations: ${HERB_DOSHA_RELATIONS.length}`);
  console.log(`   Season-Dosha contraindications: ${HERB_SEASON_CONTRAINDICATIONS.length}`);
  console.log(`\n🚀 Paste vedaai_seed.cypher into Neo4j Aura Browser → graph is LIVE!`);
}

main();
