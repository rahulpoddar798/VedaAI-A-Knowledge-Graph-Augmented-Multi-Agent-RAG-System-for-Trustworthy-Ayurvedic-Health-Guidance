const fs = require('fs');
const path = require('path');

let cachedGraph = null;

function loadLocalGraph() {
  if (cachedGraph) return cachedGraph;

  const cypherPath = path.join(__dirname, 'data', 'vedaai_seed.cypher');
  if (!fs.existsSync(cypherPath)) {
    throw new Error(`Seed cypher file not found at ${cypherPath}`);
  }

  const content = fs.readFileSync(cypherPath, 'utf8');

  // Parse Herbs
  const herbs = {};
  const herbBlocks = content.split(/CREATE \(:Herb \{/g).slice(1);
  herbBlocks.forEach(block => {
    const endIdx = block.indexOf('});');
    if (endIdx === -1) return;
    const blockContent = block.substring(0, endIdx);
    const getProp = (prop) => {
      const match = blockContent.match(new RegExp(`${prop}:\\s*'([^']*)'`));
      return match ? match[1] : '';
    };
    const name = getProp('name');
    const botanical_name = getProp('botanical_name');
    if (name && botanical_name) {
      herbs[botanical_name] = {
        name,
        botanical_name,
        sanskrit_name: getProp('sanskrit_name'),
        common_name: getProp('common_name'),
        rasa: getProp('rasa'),
        virya: getProp('virya'),
        vipaka: getProp('vipaka'),
        guna: getProp('guna'),
        synonyms: getProp('synonyms'),
        therapeutic_uses: getProp('therapeutic_uses'),
        relationships: [],
        aggravates: [],
        pacifies: [],
        contraindicated_in: [],
        treats: []
      };
    }
  });

  // Seasons mapping
  const seasons = {
    'Vasanta': { name: 'Vasanta', english: 'Spring', dominant_dosha: 'Kapha' },
    'Grishma': { name: 'Grishma', english: 'Summer', dominant_dosha: 'Pitta' },
    'Varsha': { name: 'Varsha', english: 'Monsoon', dominant_dosha: 'Vata' },
    'Sharada': { name: 'Sharada', english: 'Autumn', dominant_dosha: 'Pitta' },
    'Hemanta': { name: 'Hemanta', english: 'Pre-Winter', dominant_dosha: 'Vata' },
    'Shishira': { name: 'Shishira', english: 'Winter', dominant_dosha: 'Kapha' }
  };

  // Condition to Dosha mapping
  const conditions = {};

  const lines = content.split('\n');
  lines.forEach(line => {
    // Condition -> Dosha
    const condMatch = line.match(/MATCH \(c:Condition \{name:'([^']+)'\}\), \(d:Dosha \{name:'([^']+)'\}\) CREATE \(c\)-\[:ASSOCIATED_WITH \{strength:\s*(\d+)\}\]->\(d\);/);
    if (condMatch) {
      const [, cName, dName, str] = condMatch;
      conditions[cName] = { name: cName, dosha: dName, strength: parseInt(str) };
    }

    // Herb -> Dosha (AGGRAVATES / PACIFIES)
    const doshaMatch = line.match(/MATCH \(h:Herb \{botanical_name:'([^']+)'\}\), \(d:Dosha \{name:'([^']+)'\}\) CREATE \(h\)-\[:(AGGRAVATES|PACIFIES) \{strength:\s*(\d+),\s*reason:\s*'([^']+)'\}\]->\(d\);/);
    if (doshaMatch) {
      const [, bot, dosha, rel, strength, reason] = doshaMatch;
      if (herbs[bot]) {
        const item = { herb: herbs[bot].name, botanical: bot, relationship: rel, dosha, strength: parseInt(strength), reason };
        if (rel === 'AGGRAVATES') herbs[bot].aggravates.push(item);
        if (rel === 'PACIFIES') herbs[bot].pacifies.push(item);
        herbs[bot].relationships.push({ rel, targetLabel: 'Dosha', targetName: dosha, reason: `${reason} [strength: ${strength}/5]` });
      }
    }

    // Herb -> Season CONTRAINDICATED_IN
    const contraMatch = line.match(/MATCH \(h:Herb \{botanical_name:'([^']+)'\}\), \(s:Season \{name:'([^']+)'\}\) CREATE \(h\)-\[:CONTRAINDICATED_IN \{reason:\s*'([^']+)'\}\]->\(s\);/);
    if (contraMatch) {
      const [, bot, season, reason] = contraMatch;
      if (herbs[bot]) {
        const seasonEnglish = seasons[season]?.english || season;
        const item = { herb: herbs[bot].name, botanical: bot, season, season_english: seasonEnglish, reason };
        herbs[bot].contraindicated_in.push(item);
        herbs[bot].relationships.push({ rel: 'CONTRAINDICATED_IN', targetLabel: 'Season', targetName: `${season} (${seasonEnglish})`, reason });
      }
    }

    // Herb -> Condition TREATS
    const treatsMatch = line.match(/MATCH \(h:Herb \{botanical_name:'([^']+)'\}\), \(c:Condition \{name:'([^']+)'\}\) MERGE \(h\)-\[:TREATS/);
    if (treatsMatch) {
      const [, bot, cond] = treatsMatch;
      if (herbs[bot]) {
        herbs[bot].treats.push(cond);
        if (!herbs[bot].relationships.some(r => r.rel === 'TREATS' && r.targetName === cond)) {
          herbs[bot].relationships.push({ rel: 'TREATS', targetLabel: 'Condition', targetName: cond, reason: 'IMPPAT 2.0 clinical validation' });
        }
      }
    }
  });

  cachedGraph = { herbs, seasons, conditions };
  return cachedGraph;
}

function getTrapQueryData() {
  const { herbs, seasons } = loadLocalGraph();
  const ginger = herbs['Zingiber officinale'];

  const doshaRelations = [
    ...ginger.aggravates,
    ...ginger.pacifies
  ];

  const seasonInfo = {
    season: 'Grishma',
    english: seasons['Grishma']?.english || 'Summer',
    dominant_dosha: seasons['Grishma']?.dominant_dosha || 'Pitta'
  };

  const contraindications = [...ginger.contraindicated_in];

  const alternatives = Object.values(herbs)
    .filter(h => 
      h.pacifies.some(p => p.dosha === 'Pitta') &&
      !h.contraindicated_in.some(c => c.season === 'Grishma') &&
      (h.therapeutic_uses.includes('digest') || h.rasa.includes('Madhura') || h.name === 'Indian Gooseberry' || h.name === 'Fennel' || h.sanskrit_name === 'Amalaki' || h.sanskrit_name === 'Shatapushpa')
    )
    .map(h => ({
      herb: h.name,
      botanical: h.botanical_name,
      virya: h.virya,
      synonyms: h.synonyms
    }))
    .slice(0, 3);

  return {
    herb: {
      name: ginger.name,
      botanical: ginger.botanical_name,
      virya: ginger.virya,
      rasa: ginger.rasa,
      sanskrit: ginger.sanskrit_name,
      uses: ginger.therapeutic_uses
    },
    doshaRelations,
    seasonInfo,
    contraindications,
    alternatives
  };
}

function searchHerb(name) {
  const { herbs } = loadLocalGraph();
  const lower = name.toLowerCase().trim();

  let found = null;
  for (const bot of Object.keys(herbs)) {
    const h = herbs[bot];
    if (
      h.name.toLowerCase().includes(lower) ||
      h.botanical_name.toLowerCase().includes(lower) ||
      (h.sanskrit_name && h.sanskrit_name.toLowerCase().includes(lower)) ||
      (h.common_name && h.common_name.toLowerCase().includes(lower)) ||
      (h.synonyms && h.synonyms.toLowerCase().split(',').some(s => s.trim().toLowerCase().includes(lower)))
    ) {
      found = h;
      break;
    }
  }

  return {
    found,
    allHerbs: Object.values(herbs).map(h => h.name).sort()
  };
}

module.exports = {
  loadLocalGraph,
  getTrapQueryData,
  searchHerb
};
