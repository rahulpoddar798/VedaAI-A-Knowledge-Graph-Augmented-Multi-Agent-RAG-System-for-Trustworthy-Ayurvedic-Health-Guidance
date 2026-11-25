const neo4j = require('neo4j-driver');
const { graphSchema, nodeType, relationship } = require('../shared/catalog.mjs');
const { scrubInternalText } = require('../lib/response_sanitizer');

const query = `
  MATCH (a)-[r]->(b)
  WHERE type(r) IN $relationships AND any(l IN labels(a) WHERE l IN $labels)
    AND any(l IN labels(b) WHERE l IN $labels)
  WITH a, r, b LIMIT $limit
  RETURN [n IN [a,b] | {key: elementId(n), label: n.name,
    type: head([l IN labels(n) WHERE l IN $labels]), botanical: n.botanical_name,
    attribution: n.source}] AS endpoints, type(r) AS predicate,
    coalesce(r.source, r.reference, r.provenance) AS citation`;

async function readCatalogGraph(driver) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.executeRead(tx => tx.run(query, {
      relationships: relationship.options, labels: nodeType.options, limit: neo4j.int(24)
    }), { timeout: 5000 });
    const nodes = new Map();
    const edges = result.records.map((record, i) => {
      const { endpoints, predicate, citation } = record.toObject();
      const [source, target] = endpoints.map(node => {
        if (!nodes.has(node.key)) {
          const properties = {};
          if (node.botanical) properties.Botanical = scrubInternalText(node.botanical);
          if (node.attribution) properties.Source = scrubInternalText(node.attribution);
          nodes.set(node.key, { id: 'n' + nodes.size, label: scrubInternalText(node.label), type: node.type, properties });
        }
        return nodes.get(node.key).id;
      });
      return { id: 'r' + i, source, target, type: predicate,
        provenance: scrubInternalText(citation) || 'VedaAI project ontology', verification: 'unverified' };
    });
    return graphSchema.parse({ nodes: [...nodes.values()], edges });
  } finally {
    await session.close();
  }
}
module.exports = { readCatalogGraph };
