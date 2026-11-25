const { z } = require('zod');
const version = '1.0';
const ruleSchema = z.strictObject({
  id: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  validation: z.enum(['approved', 'pending']),
  source: z.string().min(1),
  population: z.literal('exact reported context'),
  herb: z.string().min(1),
  field: z.enum(['chronic_conditions', 'medications', 'allergies']),
  value: z.string().min(1),
  outcome: z.enum(['blocked', 'restricted']),
  expertApprovalRequired: z.literal(true),
});
// No clinically approved herb-specific rules were supplied with the project.
const registry = Object.freeze([]);
const guard = {
  id: 'legacy-season-edge',
  version,
  validation: 'engineering_policy',
  source: 'VedaAI seed ontology',
  description: 'A project-authored seasonal caution requires expert review.',
  trigger: 'CONTRAINDICATED_IN with matching reported season',
  requiredFields: ['current_season'],
  population: 'consultation',
  expertApprovalRequired: true,
  outcome: 'expert_review_required',
};
const contextGuard = Object.freeze({
  ...guard,
  id: 'legacy-context-review',
  description: 'A context-matched project ontology edge requires expert review.',
  trigger: 'AGGRAVATES with matching constitution, condition or season',
  requiredFields: ['prakriti or chronic_conditions or current_season'],
});
module.exports = { version, ruleSchema, registry, guard, contextGuard };
