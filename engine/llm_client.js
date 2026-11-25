require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class LLMClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey && this.apiKey !== 'YOUR_GEMINI_API_KEY') {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      // High-speed, high-availability Gemini models with verified active quota
      this.candidateModels = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
      this.modelName = this.candidateModels[0];
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
    }
  }

  /**
   * Load prompt template from prompts/ directory
   */
  loadPrompt(category, version = 'v1') {
    const promptPath = path.join(__dirname, '..', 'prompts', category, `${version}.txt`);
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, 'utf8');
    }
    return '';
  }

  /**
   * Generate raw text response
   */
  async generateText(prompt, options = {}) {
    if (!this.isConfigured) {
      throw new Error('GEMINI_API_KEY is not configured in .env');
    }

    for (const modelCandidate of this.candidateModels) {
      try {
        const m = this.genAI.getGenerativeModel({ model: modelCandidate }, { timeout: 10000 });
        const result = await m.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature || 0.1,
            maxOutputTokens: options.maxTokens || 300
          }
        });
        return result.response.text();
      } catch (err) {
        if (err.message && (err.message.includes('503') || err.message.includes('429'))) {
          continue;
        }
        throw err;
      }
    }
    throw new Error('All Gemini candidate models are temporarily unavailable.');
  }

  /**
   * Execute prompt with Gemini API and enforce JSON response
   */
  async generateJSON(systemPrompt, userContent) {
    if (!this.isConfigured) {
      throw new Error(
        'GEMINI_API_KEY is not configured in .env. Please add your key from https://aistudio.google.com/app/apikey'
      );
    }

    const fullPrompt = `${systemPrompt}\n\nINPUT DATA:\n${typeof userContent === 'string' ? userContent : JSON.stringify(userContent, null, 2)}\n\nRespond with strict JSON ONLY:`;

    let failureKind = 'provider_unavailable';
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const modelCandidate of this.candidateModels) {
        try {
          const m = this.genAI.getGenerativeModel({ model: modelCandidate }, { timeout: 10000 });
          const result = await m.generateContent({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 1600
            }
          });

          const responseText = result.response.text();
          const parsed = JSON.parse(responseText);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new SyntaxError('Invalid structured result.');
          this.modelName = modelCandidate;
          return parsed;
        } catch (err) {
          if (err instanceof SyntaxError) {
            failureKind = 'invalid_model_output';
            continue;
          }
          failureKind = 'provider_unavailable';
          const message = String(err.message || '');
          const transient = message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504') || message.includes('429') || message.includes('RESOURCE_EXHAUSTED');
          if (!transient) throw err;
        }
      }
      if (attempt < 2) await sleep(1500 * (attempt + 1));
    }

    throw Object.assign(new Error('Structured analysis temporarily unavailable.'), {
      statusCode: 503, reason: failureKind
    });
  }
}

module.exports = new LLMClient();
