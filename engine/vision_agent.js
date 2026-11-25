require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { getSharedDriver } = require('../lib/neo4j_config');

class MultimodalVisionAgent {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey && this.apiKey !== 'YOUR_GEMINI_API_KEY') {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      // High-availability Flash-Lite models with active quota
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

    const session = this.getDriver().session();
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

      const result = await session.run(cypher, { detectedHerbs }, {timeout:5000});
      const rows = result.records.map(r => r.toObject());
      const matched = rows.filter(r=>!rows.some(other=>other.query_input===r.query_input && other.botanical_name!==r.botanical_name));

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
    const prompt = this.loadPrompt();
    const base64Data = imageBuffer.toString('base64');

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    let parsedJSON = null;

    for (const mName of this.candidateModels || []) {
      try {
        const m = this.genAI.getGenerativeModel({ model: mName }, { timeout: 12000 });
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
            maxOutputTokens: 2400, temperature: 0.1
          }
        });

        parsedJSON = JSON.parse(result.response.text());
        if (typeof parsedJSON?.is_ayurvedic_or_herbal === 'boolean' &&
            [parsedJSON.detected_herbs, parsedJSON.ingredients_detected].every(
              names => Array.isArray(names) && names.length<=40 && names.every(name => typeof name === 'string' && name.length<=120 && name.trim())
            )) break;
        parsedJSON = null;
      } catch {
        parsedJSON = null;
      }
    }
    if (!parsedJSON) return { status: 'ANALYSIS_UNAVAILABLE' };

    const names = [...new Set([...parsedJSON.detected_herbs, ...parsedJSON.ingredients_detected])];
    const herbal = parsedJSON.is_ayurvedic_or_herbal;
    const membership = herbal ? await this.verifyGraphMembership(names) : { verified: [], unverified: [] };
    const complete = membership.verified.length > 0 && !membership.unverified.length;
    const status = !herbal ? 'OUT_OF_DOMAIN' : complete ? 'ASSESSED'
      : membership.verified.length ? 'PARTIAL_ASSESSMENT' : 'INSUFFICIENT_DATA';

    return {
      ...parsedJSON,
      status,
      graph_membership: {
        status: complete ? 'VERIFIED_CANONICAL_HERBS' : status,
        verified_herbs: membership.verified,
        unverified_herbs: membership.unverified
      }
    };
  }
}

module.exports = new MultimodalVisionAgent();
