import { z } from 'zod';

const label = z.string().min(1).max(512);
export const nodeType = z.enum(['Herb', 'Condition', 'Dosha', 'Season']);
export const relationship = z.enum(['AGGRAVATES', 'PACIFIES', 'CONTRAINDICATED_IN', 'TREATS', 'DOMINANT_IN', 'ASSOCIATED_WITH']);
export const graphSchema = z.object({
  nodes: z.array(z.object({
    id: label, label, type: nodeType, properties: z.record(z.string(), label)
  })).max(48),
  edges: z.array(z.object({
    id: label, source: label, target: label, type: relationship,
    provenance: label, verification: z.literal('unverified')
  })).max(24)
}).refine(graph => {
  const ids = new Set(graph.nodes.map(node => node.id));
  return ids.size === graph.nodes.length && new Set(graph.edges.map(edge => edge.id)).size === graph.edges.length &&
    graph.edges.every(edge => ids.has(edge.source) && ids.has(edge.target));
}, 'Invalid graph references');

const text = z.string().max(8192);
export const catalogSchema = z.object({
  herbs: z.array(z.object({
    name: label, botanical_name: text, sanskrit_name: text, virya: text, rasa: text,
    therapeutic_uses: text, source: text.optional(), pacifies: z.array(label), aggravates: z.array(label)
  })).max(500)
});
