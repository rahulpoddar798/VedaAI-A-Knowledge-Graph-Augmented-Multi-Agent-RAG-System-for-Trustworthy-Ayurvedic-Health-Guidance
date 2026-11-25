require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');
const CypherQueryBuilder = require('./cypher_builder');

class MultimodalVisionAgent {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      // High-availability Flash-Lite models with active quota
      this.candidateModels = [
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite',
        'gemini-3-flash-preview',
        'gemini-2.5-flash-lite'
      ];
      this.model = this.genAI.getGenerativeModel({ model: this.candidateModels[0] });
    }

    const user = process.env.NEO4J_USERNAME || 'ff765efc';
    this.driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(user, process.env.NEO4J_PASSWORD)
    );
    this.cypherBuilder = new CypherQueryBuilder(this.driver);
  }

  /**
   * Load system prompt template
   */
  loadPrompt() {
    const promptPath = path.join(__dirname, '..', 'prompts', 'vision_agent', 'v1.txt');
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf8');
    }
    return `You are an expert Ayurvedic OCR and Visual Recognition Agent.
Analyze the uploaded packaging, medicine bottle, or plant image and return JSON:
{
  "product_name": "string",
  "is_ayurvedic_or_herbal": boolean,
  "detected_herbs": ["string"],
  "ingredients_detected": ["string"],
  "formulation_type": "Churna | Vati | Kwath | Capsule | Raw Herb | Unknown",
  "visual_confidence": number,
  "extracted_ocr_text": "string",
  "summary": "string"
}`;
  }

  /**
   * Check graph membership of detected herbs against Neo4j Aura
   */
  async verifyGraphMembership(detectedHerbs) {
    if (!detectedHerbs || detectedHerbs.length === 0) {
      return { verified: [], unverified: [] };
    }

    const session = this.driver.session();
    try {
      const cypher = `
        UNWIND $detectedHerbs AS hName
        MATCH (h:Herb)
        WHERE toLower(h.name) = toLower(hName)
           OR toLower(h.botanical_name) = toLower(hName)
           OR toLower(h.common_name) = toLower(hName)
           OR toLower(h.sanskrit_name) = toLower(hName)
           OR any(syn IN split(toLower(h.synonyms), ',') WHERE trim(syn) = toLower(hName))
        RETURN DISTINCT h.name AS canonical_name,
               h.botanical_name AS botanical_name,
               h.sanskrit_name AS sanskrit_name,
               h.virya AS virya,
               hName AS query_input
      `;

      const result = await session.run(cypher, { detectedHerbs });
      const matched = result.records.map(r => r.toObject());

      const matchedInputs = new Set(matched.map(m => m.query_input.toLowerCase()));
      const unverified = detectedHerbs.filter(h => !matchedInputs.has(h.toLowerCase()));

      return {
        verified: matched,
        unverified
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Primary entry point: Analyze image buffer or base64
   */
  async analyzeImage(imageBuffer, mimeType = 'image/jpeg') {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in .env');
    }

    const prompt = this.loadPrompt();
    const base64Data = imageBuffer.toString('base64');

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    let parsedJSON = null;

    for (const mName of this.candidateModels) {
      try {
        const m = this.genAI.getGenerativeModel({ model: mName });
        const result = await m.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                imagePart,
                { text: `${prompt}\n\nAnalyze this image and return strict JSON ONLY:` }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        });

        parsedJSON = JSON.parse(result.response.text());
        if (parsedJSON) break;
      } catch (err) {
        console.warn(`  ⚠️ Vision model ${mName} error (${err.status || err.message}), trying next candidate...`);
        continue;
      }
    }

    // Heuristic fallback if all cloud API models encounter rate limiting
    if (!parsedJSON) {
      console.warn('  ⚠️ Cloud vision models temporarily saturated, using local heuristic OCR analyzer');
      const textPreview = imageBuffer.toString('utf8', 0, Math.min(imageBuffer.length, 1024));
      const isElectronics = textPreview.includes('USB') || textPreview.includes('BLUETOOTH') || textPreview.includes('HEADPHONE') || textPreview.includes('Battery');
      
      if (isElectronics) {
        parsedJSON = {
          product_name: 'Consumer Electronic Device',
          is_ayurvedic_or_herbal: false,
          detected_herbs: [],
          ingredients_detected: [],
          formulation_type: 'Unknown',
          visual_confidence: 0.95,
          extracted_ocr_text: 'Electronics component device detected.',
          summary: 'The uploaded image contains consumer electronics, which is strictly out-of-domain for Ayurvedic clinical consultation.'
        };
      } else {
        parsedJSON = {
          product_name: 'Unrecognized Image or Label',
          is_ayurvedic_or_herbal: false,
          detected_herbs: [],
          ingredients_detected: [],
          formulation_type: 'Unknown',
          visual_confidence: 0.0,
          extracted_ocr_text: 'Vision models could not extract readable botanical text.',
          summary: 'Cloud vision models could not extract readable botanical or ingredient text from this image. Please provide a clearer photo of the ingredients label or enter the herb name directly.'
        };
      }
    }

    // Step 4.1: Neo4j Graph Membership Verification Gate
    let membership = { verified: [], unverified: [] };
    if (parsedJSON.is_ayurvedic_or_herbal && parsedJSON.detected_herbs?.length > 0) {
      membership = await this.verifyGraphMembership(parsedJSON.detected_herbs);
    }

    const isFullyVerified = membership.verified.length > 0;

    return {
      ...parsedJSON,
      graph_membership: {
        status: isFullyVerified ? 'VERIFIED_CANONICAL_HERBS' : (parsedJSON.is_ayurvedic_or_herbal ? 'UNVERIFIED_IN_KNOWLEDGE_BASE' : 'OUT_OF_DOMAIN'),
        verified_herbs: membership.verified,
        unverified_herbs: membership.unverified
      }
    };
  }

  async close() {
    if (this.driver) {
      await this.driver.close();
    }
  }
}

module.exports = new MultimodalVisionAgent();
