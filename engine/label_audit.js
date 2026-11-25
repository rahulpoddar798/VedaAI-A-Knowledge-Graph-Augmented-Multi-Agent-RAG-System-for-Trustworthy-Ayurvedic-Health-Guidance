/**
 * VedaAI — Ingredient-by-Ingredient Label Audit Module
 *
 * Extracts individual ingredients from an uploaded label photo, normalizes
 * them, verifies each against the Neo4j herb catalog, and runs the graph
 * safety workflow on verified ingredients.
 *
 * Reuses: vision model pool from vision_agent, Neo4j driver & CypherQueryBuilder
 * from cypher_builder, and the LLM retry logic from llm_client.
 */

const { CatalogUnavailableError } = require('../lib/security');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const CypherQueryBuilder = require('./cypher_builder');
const { getSharedDriver } = require('../lib/neo4j_config');

class LabelAuditAgent {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey && this.apiKey !== 'YOUR_GEMINI_API_KEY') {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.candidateModels = [
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite',
        'gemini-3-flash-preview',
        'gemini-2.5-flash-lite'
      ];
    }
  }

  getDriver() {
    return getSharedDriver();
  }

  get cypherBuilder() {
    return new CypherQueryBuilder(this.getDriver());
  }

  loadPrompt() {
    const promptPath = path.join(__dirname, '..', 'prompts', 'label_audit', 'v1.txt');
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf8');
    }
    throw new Error('Label audit prompt not found');
  }

  /**
   * Step 1: Send image to Gemini Vision and extract structured ingredient list
   */
  async extractIngredients(imageBuffer, mimeType) {
    const prompt = this.loadPrompt();
    const base64Data = imageBuffer.toString('base64');
    const imagePart = {
      inlineData: { data: base64Data, mimeType }
    };

    let parsed = null;
    for (const modelName of this.candidateModels || []) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName }, { timeout: 12000 });
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              imagePart,
              { text: `${prompt}\n\nAnalyze this label image and return strict JSON ONLY:` }
            ]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2400, temperature: 0.1
          }
        });
        parsed = JSON.parse(result.response.text());
        if (typeof parsed?.is_supplement_label === 'boolean' &&
            (!parsed.is_supplement_label || (Array.isArray(parsed.ingredients) &&
            parsed.ingredients.length <= 40 && parsed.ingredients.every(i => typeof i === 'string' || (i && typeof (i.printed_name || i.name) === 'string'))))) break;
        parsed = null;
      } catch {
        parsed = null;
      }
    }

    if (!parsed) return { status: 'ANALYSIS_UNAVAILABLE', extraction_failed: true };

    // Sanitize: ensure ingredients is always an array of objects
    if (!Array.isArray(parsed.ingredients)) {
      parsed.ingredients = [];
    }
    parsed.ingredients = parsed.ingredients.map(ing => {
      if (typeof ing === 'string') {
        return { printed_name: ing, common_name: null, uncertain: false };
      }
      return {
        printed_name: ing.printed_name || ing.name || 'Unknown',
        common_name: ing.common_name || null,
        uncertain: Boolean(ing.uncertain)
      };
    });

    return parsed;
  }

  /**
   * Step 2: Verify each ingredient against Neo4j herb catalog
   * Returns arrays of verified, unverified, and uncertain ingredients
   */
  async verifyIngredients(ingredients) {
    const toCheck = ingredients.filter(i => !i.uncertain);
    const uncertain = ingredients.filter(i => i.uncertain);

    if (toCheck.length === 0) {
      return {
        verified: [],
        unverified: [],
        uncertain: uncertain.map(i => ({
          ...i,
          status: 'uncertain',
          reason: 'Text was partially illegible on the label'
        }))
      };
    }

    // Build list of all name variants to check
    const nameVariants = [];
    for (const ing of toCheck) {
      nameVariants.push(ing.printed_name);
      if (ing.common_name && ing.common_name !== ing.printed_name) {
        nameVariants.push(ing.common_name);
      }
    }

    const session = this.getDriver().session();
    try {
      const cypher = `
        UNWIND $names AS queryName
        MATCH (h:Herb)
        WHERE toLower(h.name) = toLower(queryName)
           OR toLower(h.botanical_name) = toLower(queryName)
           OR toLower(h.common_name) = toLower(queryName)
           OR toLower(h.sanskrit_name) = toLower(queryName)
           OR any(syn IN split(toLower(h.synonyms), ',') WHERE trim(syn) = toLower(queryName))
        RETURN DISTINCT h.name AS canonical_name,
               h.botanical_name AS botanical_name,
               h.sanskrit_name AS sanskrit_name,
               h.virya AS virya,
               h.rasa AS rasa,
               queryName AS matched_query
      `;
      const result = await session.run(cypher, { names: nameVariants }, {timeout: 5000});
      const matchedMap = new Map();
      for (const record of result.records) {
        const obj = record.toObject();
        const key=obj.matched_query.toLowerCase();
        const previous=matchedMap.get(key);
        matchedMap.set(key, previous===undefined || previous?.botanical_name===obj.botanical_name ? obj : null);
      }

      const verified = [];
      const unverified = [];

      for (const ing of toCheck) {
        const lookups = [ing.printed_name.toLowerCase()];
        if (ing.common_name) lookups.push(ing.common_name.toLowerCase());

        const hits=lookups.filter(k=>matchedMap.has(k)).map(k=>matchedMap.get(k));
        const match=hits.length && hits.every(h=>h && h.botanical_name===hits[0]?.botanical_name) ? hits[0] : null;

        if (match) {
          verified.push({
            ...ing,
            status: 'verified',
            canonical_name: match.canonical_name,
            botanical_name: match.botanical_name,
            sanskrit_name: match.sanskrit_name,
            virya: match.virya,
            rasa: match.rasa
          });
        } else {
          unverified.push({
            ...ing,
            status: 'unverified',
            reason: 'Not found in the VedaAI herb knowledge base'
          });
        }
      }

      return {
        verified,
        unverified,
        uncertain: uncertain.map(i => ({
          ...i,
          status: 'uncertain',
          reason: 'Text was partially illegible on the label'
        }))
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Step 3: Run graph safety check on each verified ingredient
   * Checks AGGRAVATES, CONTRAINDICATED_IN, condition clashes
   */
  async runSafetyAudit(verifiedIngredients, { season, prakriti, conditions }) {
    if (verifiedIngredients.length === 0) return [];

    const herbNames = verifiedIngredients.map(v => v.canonical_name);

    const [doshaRelations, contraindications, seasonInfo, conditionInfo] = await Promise.all([
      this.cypherBuilder.getHerbDoshaRelations(herbNames),
      this.cypherBuilder.getSeasonalContraindications(herbNames, season),
      this.cypherBuilder.getSeasonDominance(season),
      this.cypherBuilder.getConditionAssociations(conditions || [])
    ]);

    const conditionDoshas = new Set(conditionInfo.map(c => String(c.dosha).toLowerCase()));
    const seasonDoshas = new Set(seasonInfo.map(s => String(s.dominant_dosha).toLowerCase()));
    const prakritiLower = String(prakriti || '').toLowerCase();

    const results = [];
    for (const herb of verifiedIngredients) {
      const flags = [];
      const paths = [];
      const reasoning = [];

      // Seasonal contraindications
      for (const ci of contraindications) {
        if (ci.herb !== herb.canonical_name) continue;
        flags.push('SEASONAL_CONTRAINDICATION');
        paths.push(`(${ci.herb})-[:CONTRAINDICATED_IN]->(${ci.season_sanskrit || ci.season_english})`);
        reasoning.push(ci.reason || `${ci.herb} is contraindicated in ${ci.season_english || ci.season_sanskrit}.`);
      }

      // Dosha aggravation clashes
      for (const rel of doshaRelations) {
        if (rel.herb !== herb.canonical_name || rel.relationship !== 'AGGRAVATES') continue;
        const dosha = String(rel.dosha || '').toLowerCase();
        paths.push(`(${herb.canonical_name})-[:AGGRAVATES]->(${rel.dosha})`);

        if (seasonDoshas.has(dosha)) {
          flags.push('SEASONAL_DOSHA_CLASH');
          reasoning.push(`${herb.canonical_name} aggravates ${rel.dosha}, dominant in the current season.`);
        }
        if (conditionDoshas.has(dosha)) {
          flags.push('CONDITION_CLASH');
          reasoning.push(`${herb.canonical_name} aggravates ${rel.dosha}, linked to a declared health condition.`);
        }
        if (prakritiLower.includes(dosha)) {
          flags.push('CONSTITUTIONAL_CLASH');
          reasoning.push(`${herb.canonical_name} aggravates ${rel.dosha}, part of the patient's Prakriti.`);
        }
      }

      results.push({
        ...herb,
        safety: {
          verdict: flags.length > 0 ? 'FLAGGED' : 'INSUFFICIENT_EVIDENCE',
          flags: [...new Set(flags)],
          paths: [...new Set(paths)],
          reasoning: [...new Set(reasoning)]
        }
      });
    }

    return results;
  }

  /**
   * Full audit pipeline: extract → verify → safety-check
   */
  async auditLabel(imageBuffer, mimeType, profile) {
    console.log('\n🏷️  [LABEL AUDIT] Starting ingredient-by-ingredient audit...');

    // Step 1: Extract
    console.log('  📸 Step 1: Extracting ingredients from image...');
    const extraction = await this.extractIngredients(imageBuffer, mimeType);

    if (extraction.extraction_failed || !extraction.is_supplement_label) {
      console.log('  ❌ Not a supplement label or extraction failed.');
      return {
        status: extraction.extraction_failed ? 'ANALYSIS_UNAVAILABLE' : 'OUT_OF_DOMAIN',
        extraction,
        ingredients: { verified: [], unverified: [], uncertain: [] },
        auditedIngredients: [],
        summary: {
          totalExtracted: 0,
          verified: 0,
          unverified: 0,
          uncertain: 0,
          flagged: 0,
          safe: 0
        }
      };
    }

    console.log(`  📋 Found ${extraction.ingredients.length} ingredient(s) on label.`);

    // Step 2: Verify against catalog
    console.log('  🔍 Step 2: Verifying against Neo4j herb catalog...');
    let verification, audited;
    try {
      verification = await this.verifyIngredients(extraction.ingredients);
      audited = await this.runSafetyAudit(verification.verified, profile);
    } catch (cause) {
      throw new CatalogUnavailableError(cause);
    }

    const flaggedCount = audited.filter(a => a.safety.verdict === 'FLAGGED').length;
    console.log(`  🏁 Audit complete. ${flaggedCount} ingredient(s) flagged.`);

    return {
      status: !verification.verified.length ? 'INSUFFICIENT_DATA'
        : verification.unverified.length || verification.uncertain.length ? 'PARTIAL_ASSESSMENT' : 'ASSESSED',
      extraction: {
        product_name: extraction.product_name,
        formulation_type: extraction.formulation_type,
        visual_confidence: extraction.visual_confidence,
        extracted_ocr_text: extraction.extracted_ocr_text,
        summary: extraction.summary,
        is_supplement_label: extraction.is_supplement_label
      },
      ingredients: verification,
      auditedIngredients: audited,
      summary: {
        totalExtracted: extraction.ingredients.length,
        verified: verification.verified.length,
        unverified: verification.unverified.length,
        uncertain: verification.uncertain.length,
        flagged: flaggedCount,
        safe: 0
      }
    };
  }
}

module.exports = new LabelAuditAgent();
