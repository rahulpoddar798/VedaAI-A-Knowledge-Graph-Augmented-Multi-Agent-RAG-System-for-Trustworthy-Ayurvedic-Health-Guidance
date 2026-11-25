import { graphSchema } from '../../../shared/catalog.mjs';
export type CatalogGraph = ReturnType<typeof graphSchema.parse>;

export async function fetchGraph(signal?: AbortSignal): Promise<CatalogGraph> {
  const response = await fetch('/api/graph', { signal });
  if (!response.ok) throw new Error('Graph catalog unavailable.');
  return graphSchema.parse(await response.json());
}
