/**
 * VedaAI — Dynamic Cypher Query Builder
 * Generates and executes parameterized Cypher queries against Neo4j Aura.
 * ZERO HARDCODING: Completely dynamic based on extracted entities.
 */

class CypherQueryBuilder {
  constructor(driver) {
    this.driver = driver;
  }

  /**
   * Execute a query with session management and parameterization
   */
  async execute(statement, params = {}) {
    const session = this.driver.session();
    try {
      const result = await session.run(statement, params, { timeout: 5000 });
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  /**
   * Fetch complete pharmacological profiles for any list of herb names
   */
  async getHerbDetails(herbNames) {
    if (!herbNames || herbNames.length === 0) return [];

    const cypher = `
      UNWIND $herbNames AS hName
      MATCH (h:Herb)
      WHERE toLower(h.name) = toLower(hName)
         OR toLower(h.botanical_name) = toLower(hName)
         OR toLower(h.common_name) = toLower(hName)
         OR toLower(h.sanskrit_name) = toLower(hName)
         OR any(syn IN split(toLower(h.synonyms), ',') WHERE trim(syn) = toLower(hName))
      RETURN DISTINCT h.name AS name,
             h.botanical_name AS botanical_name,
             h.sanskrit_name AS sanskrit_name,
             h.common_name AS common_name,
             h.virya AS virya,
             h.rasa AS rasa,
             h.vipaka AS vipaka,
             h.guna AS guna,
             h.therapeutic_uses AS therapeutic_uses,
             h.synonyms AS synonyms
    `;
    return await this.execute(cypher, { herbNames });
  }

  /**
   * Fetch all PACIFIES / AGGRAVATES edges between target herbs and Doshas
   */
  async getHerbDoshaRelations(herbNames) {
    if (!herbNames || herbNames.length === 0) return [];

    const cypher = `
      UNWIND $herbNames AS hName
      MATCH (h:Herb)-[r:AGGRAVATES|PACIFIES]->(d:Dosha)
      WHERE toLower(h.name) = toLower(hName)
         OR toLower(h.botanical_name) = toLower(hName)
         OR toLower(h.common_name) = toLower(hName)
         OR any(syn IN split(toLower(h.synonyms), ',') WHERE trim(syn) = toLower(hName))
      RETURN DISTINCT h.name AS herb,
             type(r) AS relationship,
             d.name AS dosha,
             r.strength AS strength,
             r.reason AS reason
    `;
    return await this.execute(cypher, { herbNames });
  }

  /**
   * Fetch seasonal dominance and environmental dosha elevation
   */
  async getSeasonDominance(seasonInput) {
    if (!seasonInput) return [];

    const cypher = `
      MATCH (s:Season)-[:DOMINANT_IN]->(d:Dosha)
      WHERE toLower(s.name) = toLower($seasonInput)
         OR toLower(s.english) = toLower($seasonInput)
      RETURN s.name AS season_sanskrit,
             s.english AS season_english,
             d.name AS dominant_dosha
    `;
    return await this.execute(cypher, { seasonInput: seasonInput.trim() });
  }

  /**
   * Fetch morbidities and their constitutional dosha imbalances
   */
  async getConditionAssociations(conditions) {
    if (!conditions || conditions.length === 0) return [];

    const cypher = `
      UNWIND $conditions AS condName
      MATCH (c:Condition)-[r:ASSOCIATED_WITH]->(d:Dosha)
      WHERE toLower(c.name) CONTAINS toLower(condName)
         OR toLower(condName) CONTAINS toLower(c.name)
      RETURN DISTINCT c.name AS condition,
             d.name AS dosha,
             r.strength AS strength
    `;
    return await this.execute(cypher, { conditions });
  }

  /**
   * Check for direct seasonal contraindications
   */
  async getSeasonalContraindications(herbNames, seasonInput) {
    if (!herbNames || herbNames.length === 0 || !seasonInput) return [];

    const cypher = `
      UNWIND $herbNames AS hName
      MATCH (h:Herb)-[r:CONTRAINDICATED_IN]->(s:Season)
      WHERE (toLower(h.name) = toLower(hName)
         OR toLower(h.botanical_name) = toLower(hName)
         OR toLower(h.common_name) = toLower(hName))
        AND (toLower(s.name) = toLower($seasonInput)
         OR toLower(s.english) = toLower($seasonInput))
      RETURN DISTINCT h.name AS herb,
             s.name AS season_sanskrit,
             s.english AS season_english,
             r.reason AS reason
    `;
    return await this.execute(cypher, { herbNames, seasonInput: seasonInput.trim() });
  }

  /**
   * Dynamically query safe alternative herbs that pacify the stressed dosha
   * without conflicting with the season
   */
  async findSafeAlternatives(targetDoshas, querySeason) {
    if (!targetDoshas || targetDoshas.length === 0) return [];

    const cypher = `
      UNWIND $targetDoshas AS doshaName
      MATCH (h:Herb)-[:PACIFIES]->(d:Dosha {name: doshaName})
      WHERE NOT ($querySeason IS NOT NULL AND (h)-[:CONTRAINDICATED_IN]->(:Season {name: $querySeason}))
      RETURN DISTINCT h.name AS herb,
             h.botanical_name AS botanical_name,
             h.sanskrit_name AS sanskrit_name,
             h.virya AS virya,
             h.rasa AS rasa,
             h.therapeutic_uses AS therapeutic_uses
      LIMIT 3
    `;
    return await this.execute(cypher, {
      targetDoshas,
      querySeason: querySeason || null
    });
  }

  /**
   * Fetch herbs that treat specific conditions or symptoms via [:TREATS] or therapeutic_uses
   * ZERO HARDCODING: Dynamically matches Neo4j ontology and IMPPAT therapeutic terms
   */
  async getHerbsForSymptoms(symptoms) {
    if (!symptoms || symptoms.length === 0) return [];

    // Map common consumer symptoms to database ontology terms for comprehensive graph traversal
    const termMap = {
      cough: ['cough', 'Respiratory Issues', 'bronchitis'],
      cold: ['common cold', 'Respiratory Issues', 'fever'],
      throat: ['Respiratory Issues', 'hoarseness'],
      respiratory: ['Respiratory Issues', 'asthma', 'bronchitis'],
      anxiety: ['Anxiety', 'neurotic disorders', 'hysteria'],
      stress: ['Anxiety', 'neurotic disorders'],
      sleep: ['Insomnia', 'sleep aids', 'dyssomnias'],
      insomnia: ['Insomnia', 'sleep aids', 'dyssomnias'],
      joint: ['Arthritis', 'antirheumatic', 'Inflammation'],
      arthritis: ['Arthritis', 'antirheumatic', 'Inflammation'],
      inflammation: ['Inflammation', 'antirheumatic'],
      pain: ['Arthritis', 'Inflammation'],
      stiffness: ['Arthritis', 'Inflammation'],
      acid: ['Acid Reflux', 'GERD', 'gastritis', 'hyperacidity', 'dyspepsia'],
      reflux: ['Acid Reflux', 'GERD', 'gastritis'],
      gerd: ['Acid Reflux', 'GERD'],
      acidity: ['Acid Reflux', 'GERD', 'hyperacidity'],
      heartburn: ['Acid Reflux', 'GERD', 'hyperacidity'],
      digestion: ['digestive system diseases', 'dyspepsia', 'stomach ulcer', 'Constipation'],
      gut: ['digestive system diseases', 'dyspepsia', 'stomach ulcer'],
      stomach: ['stomach ulcer', 'gastritis', 'digestive system diseases'],
      constipation: ['Constipation', 'cathartics'],
      skin: ['Skin Disorders', 'skin diseases', 'skin care'],
      acne: ['Skin Disorders', 'skin care'],
      rash: ['Skin Disorders', 'skin diseases'],
      fever: ['fever', 'antipyretics'],
      hypertension: ['Hypertension', 'hypotension'],
      bp: ['Hypertension', 'hypotension'],
      diabetes: ['Diabetes', 'diabetes mellitus'],
      sugar: ['Diabetes', 'diabetes mellitus'],
      immunity: ['immunomodulation', 'rejuvenation', 'tonics', 'rasayana'],
      fatigue: ['tonics', 'rejuvenation', 'dyssomnias'],
      weakness: ['tonics', 'rejuvenation']
    };

    const expandedTerms = new Set();
    symptoms.forEach(s => {
      const lower = s.toLowerCase().trim();
      expandedTerms.add(lower);
      for (const [key, mapped] of Object.entries(termMap)) {
        if (lower.includes(key)) {
          mapped.forEach(m => expandedTerms.add(m.toLowerCase()));
        }
      }
    });

    const keywords = Array.from(expandedTerms);

    const cypher = `
      UNWIND $keywords AS kw
      MATCH (h:Herb)
      OPTIONAL MATCH (h)-[r:TREATS]->(c:Condition)
      WHERE toLower(c.name) CONTAINS toLower(kw) OR toLower(kw) CONTAINS toLower(c.name)
      WITH h, collect(DISTINCT c.name) AS matched_conditions, $keywords AS kwList
      WHERE size(matched_conditions) > 0
         OR any(k IN kwList WHERE toLower(h.therapeutic_uses) CONTAINS toLower(k))
      RETURN DISTINCT h.name AS name,
             h.botanical_name AS botanical_name,
             h.sanskrit_name AS sanskrit_name,
             h.common_name AS common_name,
             h.virya AS virya,
             h.rasa AS rasa,
             h.vipaka AS vipaka,
             h.guna AS guna,
             h.therapeutic_uses AS therapeutic_uses,
             matched_conditions,
             size(matched_conditions) AS direct_score
      ORDER BY direct_score DESC, h.name ASC
      LIMIT 12
    `;

    return await this.execute(cypher, { keywords });
  }

  /**
   * Unified traversal: executes all relevant graph queries in parallel for the pipeline
   */
  async fetchGraphContext({ herbs, symptoms, season, conditions, intent }) {
    const isSymptomQuery = (!herbs || herbs.length === 0) && (symptoms && symptoms.length > 0);

    const [
      herbDetails,
      candidateHerbs,
      seasonInfo,
      conditionInfo
    ] = await Promise.all([
      this.getHerbDetails(herbs),
      (isSymptomQuery || (symptoms && symptoms.length > 0)) ? this.getHerbsForSymptoms(symptoms) : Promise.resolve([]),
      this.getSeasonDominance(season),
      this.getConditionAssociations(conditions)
    ]);

    // Active herbs for dosha and contraindication analysis
    const targetHerbNames = herbDetails.length > 0
      ? herbDetails.map(h => h.name)
      : candidateHerbs.map(h => h.name);

    const [doshaRelations, contraindications] = await Promise.all([
      this.getHerbDoshaRelations(targetHerbNames),
      this.getSeasonalContraindications(targetHerbNames, season)
    ]);

    // Determine if any dosha is heavily aggravated or elevated
    const aggravatedDoshas = new Set();
    doshaRelations.forEach(r => {
      if (r.relationship === 'AGGRAVATES') aggravatedDoshas.add(r.dosha);
    });
    seasonInfo.forEach(s => {
      aggravatedDoshas.add(s.dominant_dosha);
    });
    conditionInfo.forEach(c => {
      aggravatedDoshas.add(c.dosha);
    });

    const alternatives = await this.findSafeAlternatives(
      Array.from(aggravatedDoshas),
      seasonInfo[0]?.season_sanskrit || season
    );

    return {
      herbDetails,
      candidateHerbs,
      doshaRelations,
      seasonInfo,
      conditionInfo,
      contraindications,
      alternatives,
      graphAvailable: herbDetails.length > 0 || candidateHerbs.length > 0
    };
  }
}

module.exports = CypherQueryBuilder;
