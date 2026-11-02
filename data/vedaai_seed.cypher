// ════════════════════════════════════════════════════════════════
// VedaAI Knowledge Graph — Seed Script
// Generated from IMPPAT 2.0 Database (imppat.ac.in)
// Team: Mohit Gupta, Prasun Sharma, Rahul Kumar, Ravi Baliyan
// Supervisor: Ms. Mahima Saxena | AKGEC Ghaziabad
// ════════════════════════════════════════════════════════════════

// STEP 0: Clear existing data (safe for fresh setup)
MATCH (n) DETACH DELETE n;

// ── DOSHAS ──────────────────────────────────────────────────────
CREATE (:Dosha {name: 'Vata', season_dominance: 'Varsha', qualities: 'dry,cold,light,mobile,subtle,rough'});
CREATE (:Dosha {name: 'Pitta', season_dominance: 'Grishma', qualities: 'hot,sharp,light,liquid,oily,spreading'});
CREATE (:Dosha {name: 'Kapha', season_dominance: 'Vasanta', qualities: 'heavy,slow,cold,oily,smooth,dense,soft,static'});

// ── SEASONS ─────────────────────────────────────────────────────
CREATE (:Season {name: 'Vasanta', english: 'Spring', months: 'March-April'});
CREATE (:Season {name: 'Grishma', english: 'Summer', months: 'May-June'});
CREATE (:Season {name: 'Varsha', english: 'Monsoon', months: 'July-August'});
CREATE (:Season {name: 'Sharada', english: 'Autumn', months: 'September-October'});
CREATE (:Season {name: 'Hemanta', english: 'Pre-Winter', months: 'November-December'});
CREATE (:Season {name: 'Shishira', english: 'Winter', months: 'January-February'});

// ── SEASON → DOSHA relationships ────────────────────────────────
MATCH (s:Season {name:'Grishma'}), (d:Dosha {name:'Pitta'}) CREATE (s)-[:DOMINANT_IN]->(d);
MATCH (s:Season {name:'Sharada'}), (d:Dosha {name:'Pitta'}) CREATE (s)-[:DOMINANT_IN]->(d);
MATCH (s:Season {name:'Varsha'}), (d:Dosha {name:'Vata'}) CREATE (s)-[:DOMINANT_IN]->(d);
MATCH (s:Season {name:'Hemanta'}), (d:Dosha {name:'Vata'}) CREATE (s)-[:DOMINANT_IN]->(d);
MATCH (s:Season {name:'Vasanta'}), (d:Dosha {name:'Kapha'}) CREATE (s)-[:DOMINANT_IN]->(d);
MATCH (s:Season {name:'Shishira'}), (d:Dosha {name:'Kapha'}) CREATE (s)-[:DOMINANT_IN]->(d);

// ── CHRONIC CONDITIONS ──────────────────────────────────────────
CREATE (:Condition {name: 'Acid Reflux'});
CREATE (:Condition {name: 'GERD'});
CREATE (:Condition {name: 'Inflammation'});
CREATE (:Condition {name: 'Anxiety'});
CREATE (:Condition {name: 'Arthritis'});
CREATE (:Condition {name: 'Constipation'});
CREATE (:Condition {name: 'Obesity'});
CREATE (:Condition {name: 'Diabetes'});
CREATE (:Condition {name: 'Respiratory Issues'});
CREATE (:Condition {name: 'Skin Disorders'});
CREATE (:Condition {name: 'Insomnia'});
CREATE (:Condition {name: 'Hypertension'});

// ── CONDITION → DOSHA associations ──────────────────────────────
MATCH (c:Condition {name:'Acid Reflux'}), (d:Dosha {name:'Pitta'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 5}]->(d);
MATCH (c:Condition {name:'GERD'}), (d:Dosha {name:'Pitta'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 5}]->(d);
MATCH (c:Condition {name:'Inflammation'}), (d:Dosha {name:'Pitta'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 4}]->(d);
MATCH (c:Condition {name:'Anxiety'}), (d:Dosha {name:'Vata'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 5}]->(d);
MATCH (c:Condition {name:'Arthritis'}), (d:Dosha {name:'Vata'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 4}]->(d);
MATCH (c:Condition {name:'Constipation'}), (d:Dosha {name:'Vata'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 4}]->(d);
MATCH (c:Condition {name:'Obesity'}), (d:Dosha {name:'Kapha'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 5}]->(d);
MATCH (c:Condition {name:'Diabetes'}), (d:Dosha {name:'Kapha'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 4}]->(d);
MATCH (c:Condition {name:'Respiratory Issues'}), (d:Dosha {name:'Kapha'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 4}]->(d);
MATCH (c:Condition {name:'Skin Disorders'}), (d:Dosha {name:'Pitta'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 4}]->(d);
MATCH (c:Condition {name:'Insomnia'}), (d:Dosha {name:'Vata'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 5}]->(d);
MATCH (c:Condition {name:'Hypertension'}), (d:Dosha {name:'Pitta'}) CREATE (c)-[:ASSOCIATED_WITH {strength: 3}]->(d);

// ── HERBS (from IMPPAT 2.0) ─────────────────────────────────────
CREATE (:Herb {
  name: 'Ginger',
  botanical_name: 'Zingiber officinale',
  sanskrit_name: 'Shunthi/Adrak',
  common_name: 'Ginger',
  rasa: 'Katu,Madhura',
  virya: 'Ushna',
  vipaka: 'Katu',
  guna: 'Laghu,Snigdha',
  family: 'Zingiberaceae',
  system_of_medicine: 'Ayurveda,Homeopathy,Siddha,Unani',
  therapeutic_uses: 'otitis media,immunomodulation,stomach ulcer,neurotic disorders,anasarca',
  synonyms: 'Adrak,Shunti,Sonth',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Turmeric',
  botanical_name: 'Curcuma longa',
  sanskrit_name: 'Haridra',
  common_name: 'Turmeric',
  rasa: 'Tikta,Katu',
  virya: 'Ushna',
  vipaka: 'Katu',
  guna: 'Laghu,Ruksha',
  family: 'Zingiberaceae',
  system_of_medicine: 'Ayurveda,Homeopathy,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'hysteria,common cold,fever,cardiovascular agents [pharmacological action],diarrhea',
  synonyms: 'Haldi,Turmeric',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Neem',
  botanical_name: 'Azadirachta indica',
  sanskrit_name: 'Nimba',
  common_name: 'Neem',
  rasa: 'Tikta,Kashaya',
  virya: 'Sheeta',
  vipaka: 'Katu',
  guna: 'Laghu,Ruksha',
  family: 'Meliaceae',
  system_of_medicine: 'Ayurveda,Homeopathy,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'liver diseases,skin care,intestinal diseases, parasitic,anti-infective agents, local,anti-infective agents',
  synonyms: 'Neem,Nimba,Margosa',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Indian Ginseng',
  botanical_name: 'Withania somnifera',
  sanskrit_name: 'Ashwagandha',
  common_name: 'Indian Ginseng',
  rasa: 'Madhura,Kashaya',
  virya: 'Ushna',
  vipaka: 'Madhura',
  guna: 'Guru,Snigdha',
  family: 'Solanaceae',
  system_of_medicine: 'Ayurveda,Homeopathy,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'anti-bacterial agents,antipyretics,dyspnea,dyssomnias,hypercholesterolemia',
  synonyms: 'Ashwagandha,Asgandh,Winter Cherry',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Holy Basil',
  botanical_name: 'Ocimum tenuiflorum',
  sanskrit_name: 'Tulasi',
  common_name: 'Holy Basil',
  rasa: 'Katu,Tikta',
  virya: 'Ushna',
  vipaka: 'Katu',
  guna: 'Laghu,Ruksha',
  family: 'Lamiaceae',
  system_of_medicine: 'Ayurveda,Homeopathy,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'chickenpox,bites and stings,antifungal agents,digestive system diseases,parkinson disease',
  synonyms: 'Tulsi,Tulasi,Holy Basil',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Giloy',
  botanical_name: 'Tinospora cordifolia',
  sanskrit_name: 'Guduchi',
  common_name: 'Giloy',
  rasa: 'Tikta,Kashaya',
  virya: 'Ushna',
  vipaka: 'Madhura',
  guna: 'Guru,Snigdha',
  family: 'Menispermaceae',
  system_of_medicine: 'Ayurveda',
  therapeutic_uses: '',
  synonyms: 'Giloy,Guduchi,Amrita',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Indian Gooseberry',
  botanical_name: 'Emblica officinalis',
  sanskrit_name: 'Amalaki',
  common_name: 'Indian Gooseberry',
  rasa: 'Amla,Madhura,Kashaya,Tikta,Katu',
  virya: 'Sheeta',
  vipaka: 'Madhura',
  guna: 'Laghu,Ruksha',
  family: '',
  system_of_medicine: 'Ayurveda',
  therapeutic_uses: '',
  synonyms: 'Amla,Amlaki,Amla Berry',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Chebulic Myrobalan',
  botanical_name: 'Terminalia chebula',
  sanskrit_name: 'Haritaki',
  common_name: 'Chebulic Myrobalan',
  rasa: 'Kashaya,Madhura,Amla,Tikta,Katu',
  virya: 'Ushna',
  vipaka: 'Madhura',
  guna: 'Laghu,Ruksha',
  family: 'Combretaceae',
  system_of_medicine: 'Ayurveda,Siddha,Sowa Rigpa',
  therapeutic_uses: 'cardiotonic agents,constipation,skin diseases,epilepsy,heart diseases',
  synonyms: 'Haritaki,Harad,Myrobalan',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Belleric Myrobalan',
  botanical_name: 'Terminalia bellirica',
  sanskrit_name: 'Bibhitaki',
  common_name: 'Belleric Myrobalan',
  rasa: 'Kashaya',
  virya: 'Ushna',
  vipaka: 'Madhura',
  guna: 'Laghu,Ruksha',
  family: 'Combretaceae',
  system_of_medicine: 'Ayurveda,Siddha,Sowa Rigpa',
  therapeutic_uses: 'eye disorders,leprosy,cathartics,antipyretics,dysentery',
  synonyms: 'Bibhitaki,Baheda,Beleric',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Water Hyssop',
  botanical_name: 'Bacopa monnieri',
  sanskrit_name: 'Brahmi',
  common_name: 'Water Hyssop',
  rasa: 'Tikta,Kashaya',
  virya: 'Sheeta',
  vipaka: 'Madhura',
  guna: 'Laghu,Snigdha',
  family: 'Plantaginaceae',
  system_of_medicine: 'Ayurveda,Homeopathy,Siddha,Unani',
  therapeutic_uses: 'fever,cough,asthma,pregnancy,anasarca',
  synonyms: 'Brahmi,Bacopa,Water Hyssop',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Indian Bdellium',
  botanical_name: 'Commiphora wightii',
  sanskrit_name: 'Guggulu',
  common_name: 'Indian Bdellium',
  rasa: 'Tikta,Kashaya,Katu',
  virya: 'Ushna',
  vipaka: 'Katu',
  guna: 'Laghu,Ruksha',
  family: 'Burseraceae',
  system_of_medicine: 'Ayurveda,Siddha',
  therapeutic_uses: 'urinary tract infections,cholesterol,antirheumatic agents,bronchitis,malnutrition',
  synonyms: 'Guggul,Guggulu,Indian Bdellium',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Indian Frankincense',
  botanical_name: 'Boswellia serrata',
  sanskrit_name: 'Shallaki',
  common_name: 'Indian Frankincense',
  rasa: 'Tikta,Madhura',
  virya: 'Ushna',
  vipaka: 'Katu',
  guna: 'Laghu,Ruksha',
  family: 'Burseraceae',
  system_of_medicine: 'Ayurveda,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'dysentery,wound healing,diuretics,jaundice,sweating/diaphoretic',
  synonyms: 'Shallaki,Boswellia,Frankincense',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Long Pepper',
  botanical_name: 'Piper longum',
  sanskrit_name: 'Pippali',
  common_name: 'Long Pepper',
  rasa: 'Katu',
  virya: 'Ushna',
  vipaka: 'Madhura',
  guna: 'Laghu,Snigdha,Tikshna',
  family: 'Piperaceae',
  system_of_medicine: 'Ayurveda,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'bronchitis,antirheumatic agents,menstruation-inducing agents,fever,coma',
  synonyms: 'Pippali,Long Pepper,Pipli',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Black Pepper',
  botanical_name: 'Piper nigrum',
  sanskrit_name: 'Maricha',
  common_name: 'Black Pepper',
  rasa: 'Katu',
  virya: 'Ushna',
  vipaka: 'Katu',
  guna: 'Laghu,Tikshna,Ruksha',
  family: 'Piperaceae',
  system_of_medicine: 'Ayurveda,Homeopathy,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'nausea,hemorrhoids,fever,asthma,rejuvenation',
  synonyms: 'Kali Mirch,Black Pepper,Maricha',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Coriander',
  botanical_name: 'Coriandrum sativum',
  sanskrit_name: 'Dhanya',
  common_name: 'Coriander',
  rasa: 'Tikta,Katu',
  virya: 'Sheeta',
  vipaka: 'Madhura',
  guna: 'Laghu,Snigdha',
  family: 'Apiaceae',
  system_of_medicine: 'Ayurveda,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'dyspepsia,tonics,rejuvenation,antirheumatic agents,headache',
  synonyms: 'Dhania,Coriander,Dhanya',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Fennel',
  botanical_name: 'Foeniculum vulgare',
  sanskrit_name: 'Shatapushpa',
  common_name: 'Fennel',
  rasa: 'Madhura,Katu',
  virya: 'Sheeta',
  vipaka: 'Madhura',
  guna: 'Laghu,Snigdha',
  family: 'Apiaceae',
  system_of_medicine: 'Ayurveda,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'antioxidants,anemia,antispasmodics,expectorants,cathartics',
  synonyms: 'Saunf,Fennel,Shatapushpa',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Licorice',
  botanical_name: 'Glycyrrhiza glabra',
  sanskrit_name: 'Yashtimadhu',
  common_name: 'Licorice',
  rasa: 'Madhura',
  virya: 'Sheeta',
  vipaka: 'Madhura',
  guna: 'Guru,Snigdha',
  family: 'Leguminosae',
  system_of_medicine: 'Ayurveda,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'antifungal agents,gout,wounds and injuries/trauma,diuretics,scorpion stings',
  synonyms: 'Mulethi,Licorice,Yashtimadhu',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Gotu Kola',
  botanical_name: 'Centella asiatica',
  sanskrit_name: 'Mandukparni',
  common_name: 'Gotu Kola',
  rasa: 'Tikta,Kashaya',
  virya: 'Sheeta',
  vipaka: 'Madhura',
  guna: 'Laghu,Snigdha',
  family: 'Apiaceae',
  system_of_medicine: 'Ayurveda,Homeopathy,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'gastritis,asthma,dysentery, amebic,hiccup,delirium',
  synonyms: 'Gotu Kola,Mandukparni,Brahmi',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Aloe Vera',
  botanical_name: 'Aloe vera',
  sanskrit_name: 'Ghritkumari',
  common_name: 'Aloe Vera',
  rasa: 'Tikta,Kashaya',
  virya: 'Sheeta',
  vipaka: 'Katu',
  guna: 'Guru,Snigdha,Tikshna',
  family: 'Xanthorrhoeaceae',
  system_of_medicine: 'Ayurveda,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'cough,asthma,abortifacient agents,anasarca,wound healing',
  synonyms: 'Aloe Vera,Ghritkumari,Kumari',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Spikenard',
  botanical_name: 'Nardostachys jatamansi',
  sanskrit_name: 'Jatamansi',
  common_name: 'Spikenard',
  rasa: 'Tikta,Kashaya,Madhura',
  virya: 'Sheeta',
  vipaka: 'Madhura',
  guna: 'Laghu,Snigdha',
  family: 'Caprifoliaceae',
  system_of_medicine: 'Ayurveda,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'skin care,anticonvulsants,antispasmodics,antineoplastic agents,sleep aids, pharmaceutical',
  synonyms: 'Jatamansi,Spikenard,Musk Root',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Country Mallow',
  botanical_name: 'Sida cordifolia',
  sanskrit_name: 'Bala',
  common_name: 'Country Mallow',
  rasa: 'Madhura',
  virya: 'Sheeta',
  vipaka: 'Madhura',
  guna: 'Guru,Snigdha',
  family: 'Malvaceae',
  system_of_medicine: 'Ayurveda,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'hemiplegia,tonics,disorder of ejaculation,hematuria,antipyretics',
  synonyms: 'Bala,Country Mallow,Sida',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Wild Asparagus',
  botanical_name: 'Asparagus racemosus',
  sanskrit_name: 'Shatavari',
  common_name: 'Wild Asparagus',
  rasa: 'Madhura,Tikta',
  virya: 'Sheeta',
  vipaka: 'Madhura',
  guna: 'Guru,Snigdha',
  family: 'Asparagaceae',
  system_of_medicine: 'Ayurveda,Siddha,Unani',
  therapeutic_uses: 'hypogalactia,postnatal care,diabetes mellitus,hoarseness,urination disorders',
  synonyms: 'Shatavari,Wild Asparagus,Satavar',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Velvet Bean',
  botanical_name: 'Mucuna pruriens',
  sanskrit_name: 'Kapikacchu',
  common_name: 'Velvet Bean',
  rasa: 'Madhura,Tikta',
  virya: 'Ushna',
  vipaka: 'Madhura',
  guna: 'Guru,Snigdha',
  family: 'Leguminosae',
  system_of_medicine: 'Ayurveda,Homeopathy,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'anti-bacterial agents,sexually transmitted diseases,hypotension,cathartics,asthma',
  synonyms: 'Kaunch,Kapikacchu,Velvet Bean',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'Drumstick Tree',
  botanical_name: 'Moringa oleifera',
  sanskrit_name: 'Shigru',
  common_name: 'Drumstick Tree',
  rasa: 'Tikta,Katu',
  virya: 'Ushna',
  vipaka: 'Katu',
  guna: 'Laghu,Ruksha,Tikshna',
  family: 'Moringaceae',
  system_of_medicine: 'Ayurveda,Siddha,Sowa Rigpa,Unani',
  therapeutic_uses: 'ulcer,fever,helminthiasis,cysts,eye disorders',
  synonyms: 'Sahjan,Moringa,Drumstick,Shigru',
  source: 'IMPPAT 2.0'
});
CREATE (:Herb {
  name: 'King of Bitters',
  botanical_name: 'Andrographis paniculata',
  sanskrit_name: 'Kalmegh',
  common_name: 'King of Bitters',
  rasa: 'Tikta',
  virya: 'Sheeta',
  vipaka: 'Katu',
  guna: 'Laghu,Ruksha',
  family: 'Acanthaceae',
  system_of_medicine: 'Ayurveda',
  therapeutic_uses: 'tonics,diarrhea,anemia,rejuvenation,cholera',
  synonyms: 'Kalmegh,King of Bitters,Chirayata',
  source: 'IMPPAT 2.0'
});

// ── HERB ↔ DOSHA relationships ──────────────────────────────────
MATCH (h:Herb {botanical_name:'Zingiber officinale'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:AGGRAVATES {strength: 4, reason: 'Ushna virya stimulates Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Zingiber officinale'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:PACIFIES {strength: 5, reason: 'Katu rasa and Ushna virya reduce Vata'}]->(d);
MATCH (h:Herb {botanical_name:'Zingiber officinale'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Ushna and Laghu guna reduce Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Curcuma longa'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:PACIFIES {strength: 3, reason: 'Tikta rasa moderates Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Curcuma longa'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Katu rasa reduces Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Curcuma longa'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:AGGRAVATES {strength: 2, reason: 'Ruksha guna can increase Vata'}]->(d);
MATCH (h:Herb {botanical_name:'Azadirachta indica'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:PACIFIES {strength: 5, reason: 'Tikta and Sheeta reduce excess Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Azadirachta indica'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Bitter taste reduces Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Withania somnifera'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:PACIFIES {strength: 5, reason: 'Madhura rasa and Snigdha guna ground Vata'}]->(d);
MATCH (h:Herb {botanical_name:'Withania somnifera'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:AGGRAVATES {strength: 3, reason: 'Guru guna can increase Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Ocimum tenuiflorum'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Ushna virya reduces Vata'}]->(d);
MATCH (h:Herb {botanical_name:'Ocimum tenuiflorum'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Katu rasa reduces Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Ocimum tenuiflorum'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:AGGRAVATES {strength: 3, reason: 'Ushna virya can stimulate Pitta in excess'}]->(d);
MATCH (h:Herb {botanical_name:'Emblica officinalis'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:PACIFIES {strength: 5, reason: 'Sheeta virya and Amla rasa balance Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Emblica officinalis'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Madhura rasa in vipaka pacifies Vata'}]->(d);
MATCH (h:Herb {botanical_name:'Emblica officinalis'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:PACIFIES {strength: 3, reason: 'Kashaya and Katu rasa reduce Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Glycyrrhiza glabra'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:PACIFIES {strength: 5, reason: 'Madhura rasa and Sheeta virya calm Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Glycyrrhiza glabra'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Snigdha guna soothes Vata'}]->(d);
MATCH (h:Herb {botanical_name:'Glycyrrhiza glabra'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:AGGRAVATES {strength: 4, reason: 'Guru and Snigdha increase Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Foeniculum vulgare'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Sheeta virya cools Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Foeniculum vulgare'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:PACIFIES {strength: 3, reason: 'Ushna in small doses reduces Vata'}]->(d);
MATCH (h:Herb {botanical_name:'Aloe vera'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:PACIFIES {strength: 5, reason: 'Sheeta virya strongly cools Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Aloe vera'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:AGGRAVATES {strength: 3, reason: 'Guru and Snigdha increase Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Bacopa monnieri'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Snigdha guna nourishes nervous system'}]->(d);
MATCH (h:Herb {botanical_name:'Bacopa monnieri'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:PACIFIES {strength: 3, reason: 'Sheeta virya reduces Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Piper longum'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:PACIFIES {strength: 5, reason: 'Katu rasa and Ushna virya strongly reduce Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Piper longum'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Ushna virya reduces Vata'}]->(d);
MATCH (h:Herb {botanical_name:'Piper longum'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:AGGRAVATES {strength: 4, reason: 'Katu and Ushna increase Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Asparagus racemosus'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:PACIFIES {strength: 5, reason: 'Madhura and Sheeta reduce Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Asparagus racemosus'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Snigdha and Guru nourish Vata'}]->(d);
MATCH (h:Herb {botanical_name:'Moringa oleifera'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Tikta rasa reduces Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Moringa oleifera'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:PACIFIES {strength: 3, reason: 'Ushna virya warms and reduces Vata'}]->(d);
MATCH (h:Herb {botanical_name:'Andrographis paniculata'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Tikta and Sheeta strongly pacify Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Andrographis paniculata'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Tikta rasa reduces Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Tinospora cordifolia'}), (d:Dosha {name:'Pitta'}) CREATE (h)-[:PACIFIES {strength: 4, reason: 'Sheeta virya cools excess Pitta'}]->(d);
MATCH (h:Herb {botanical_name:'Tinospora cordifolia'}), (d:Dosha {name:'Kapha'}) CREATE (h)-[:PACIFIES {strength: 3, reason: 'Tikta rasa reduces Kapha'}]->(d);
MATCH (h:Herb {botanical_name:'Tinospora cordifolia'}), (d:Dosha {name:'Vata'}) CREATE (h)-[:PACIFIES {strength: 3, reason: 'Madhura rasa balances Vata'}]->(d);

// ── HERB ↔ SEASON contraindications ─────────────────────────────
MATCH (h:Herb {botanical_name:'Zingiber officinale'}), (s:Season {name:'Grishma'}) CREATE (h)-[:CONTRAINDICATED_IN {reason: 'Ushna virya amplified in summer heat aggravates Pitta severely'}]->(s);
MATCH (h:Herb {botanical_name:'Piper longum'}), (s:Season {name:'Grishma'}) CREATE (h)-[:CONTRAINDICATED_IN {reason: 'Hot potency dangerous in peak summer'}]->(s);
MATCH (h:Herb {botanical_name:'Piper nigrum'}), (s:Season {name:'Grishma'}) CREATE (h)-[:CONTRAINDICATED_IN {reason: 'Katu+Ushna combination worsens Pitta in summer'}]->(s);
MATCH (h:Herb {botanical_name:'Aloe vera'}), (s:Season {name:'Varsha'}) CREATE (h)-[:CONTRAINDICATED_IN {reason: 'Excess moisture in monsoon + Kapha properties can worsen conditions'}]->(s);

// ── HERB → CONDITION (TREATS) from IMPPAT therapeutic data ─────
MATCH (h:Herb {botanical_name:'Zingiber officinale'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Zingiber officinale'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Zingiber officinale'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Zingiber officinale'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Curcuma longa'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Curcuma longa'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Curcuma longa'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Curcuma longa'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Azadirachta indica'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Azadirachta indica'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Azadirachta indica'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Azadirachta indica'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Withania somnifera'}), (c:Condition {name:'Insomnia'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Withania somnifera'}), (c:Condition {name:'Anxiety'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Withania somnifera'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Withania somnifera'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Withania somnifera'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Withania somnifera'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Ocimum tenuiflorum'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Ocimum tenuiflorum'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Ocimum tenuiflorum'}), (c:Condition {name:'Anxiety'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Ocimum tenuiflorum'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Ocimum tenuiflorum'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Terminalia chebula'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Terminalia chebula'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Terminalia chebula'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Terminalia chebula'}), (c:Condition {name:'Obesity'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Terminalia chebula'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Terminalia chebula'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Terminalia bellirica'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Terminalia bellirica'}), (c:Condition {name:'Insomnia'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Terminalia bellirica'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Terminalia bellirica'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Bacopa monnieri'}), (c:Condition {name:'Anxiety'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Bacopa monnieri'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Bacopa monnieri'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Bacopa monnieri'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Bacopa monnieri'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Commiphora wightii'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Commiphora wightii'}), (c:Condition {name:'Obesity'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Commiphora wightii'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Commiphora wightii'}), (c:Condition {name:'Obesity'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Commiphora wightii'}), (c:Condition {name:'Hypertension'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Commiphora wightii'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Commiphora wightii'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Boswellia serrata'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Boswellia serrata'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Boswellia serrata'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Boswellia serrata'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Piper longum'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Piper longum'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Piper longum'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Piper longum'}), (c:Condition {name:'Insomnia'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Piper nigrum'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Piper nigrum'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Coriandrum sativum'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Foeniculum vulgare'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Foeniculum vulgare'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Foeniculum vulgare'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Glycyrrhiza glabra'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Glycyrrhiza glabra'}), (c:Condition {name:'Anxiety'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Glycyrrhiza glabra'}), (c:Condition {name:'Hypertension'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Glycyrrhiza glabra'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Glycyrrhiza glabra'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Glycyrrhiza glabra'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Centella asiatica'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Centella asiatica'}), (c:Condition {name:'Hypertension'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Centella asiatica'}), (c:Condition {name:'Anxiety'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Centella asiatica'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Centella asiatica'}), (c:Condition {name:'Insomnia'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Aloe vera'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Aloe vera'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Aloe vera'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Aloe vera'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Aloe vera'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Nardostachys jatamansi'}), (c:Condition {name:'Insomnia'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Nardostachys jatamansi'}), (c:Condition {name:'Hypertension'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Nardostachys jatamansi'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Nardostachys jatamansi'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Sida cordifolia'}), (c:Condition {name:'Hypertension'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Asparagus racemosus'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Asparagus racemosus'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Asparagus racemosus'}), (c:Condition {name:'Hypertension'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Asparagus racemosus'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Mucuna pruriens'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Mucuna pruriens'}), (c:Condition {name:'Hypertension'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Mucuna pruriens'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Mucuna pruriens'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Moringa oleifera'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Moringa oleifera'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Moringa oleifera'}), (c:Condition {name:'Obesity'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Moringa oleifera'}), (c:Condition {name:'Insomnia'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Moringa oleifera'}), (c:Condition {name:'Arthritis'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Moringa oleifera'}), (c:Condition {name:'Hypertension'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Moringa oleifera'}), (c:Condition {name:'Inflammation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Andrographis paniculata'}), (c:Condition {name:'Diabetes'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);
MATCH (h:Herb {botanical_name:'Andrographis paniculata'}), (c:Condition {name:'Constipation'}) MERGE (h)-[:TREATS {source: 'IMPPAT 2.0'}]->(c);

// ── INDEXES (for fast synonym lookup) ──────────────────────────
CREATE INDEX herb_name_idx IF NOT EXISTS FOR (h:Herb) ON (h.name);
CREATE INDEX herb_botanical_idx IF NOT EXISTS FOR (h:Herb) ON (h.botanical_name);
CREATE INDEX dosha_name_idx IF NOT EXISTS FOR (d:Dosha) ON (d.name);
CREATE INDEX season_name_idx IF NOT EXISTS FOR (s:Season) ON (s.name);
CREATE INDEX condition_name_idx IF NOT EXISTS FOR (c:Condition) ON (c.name);

// ════════════════════════════════════════════════════════════════
// END OF SEED SCRIPT
// 25 Herbs | 3 Doshas | 6 Seasons | 12 Conditions | 150+ Relationships
// Source: IMPPAT 2.0 + Classical Ayurvedic Texts (Charaka Samhita)
// ════════════════════════════════════════════════════════════════
