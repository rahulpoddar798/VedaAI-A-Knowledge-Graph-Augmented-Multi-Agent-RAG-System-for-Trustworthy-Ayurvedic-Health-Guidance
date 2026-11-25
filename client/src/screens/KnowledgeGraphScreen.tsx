import React, { useEffect, useMemo, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, GitBranch, Info } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { fetchGraph, type CatalogGraph } from '../data/graph';
import { EmptyPanel, ErrorPanel, LoadingPanel } from '../components/ui/StatePanels';
import type { KGEdge, KGNode } from '../types/veda';

const NODE_COLORS: Record<
  KGNode['type'],
  { fill: string; stroke: string; badge: string }
> = {
  Herb: { fill: '#173D32', stroke: '#0F2A22', badge: 'bg-[#173D32] text-white' },
  Dosha: { fill: '#164B45', stroke: '#0F3530', badge: 'bg-[#164B45] text-white' },
  Season: { fill: '#B79A5B', stroke: '#8E743C', badge: 'bg-[#B79A5B] text-white' },
  Condition: { fill: '#B64040', stroke: '#8D2D2D', badge: 'bg-[#B64040] text-white' },
  Drug: { fill: '#356B91', stroke: '#234C69', badge: 'bg-[#356B91] text-white' }
};

export const KnowledgeGraphScreen: React.FC = () => {
  const [graph, setGraph] = useState<CatalogGraph | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchGraph(controller.signal).then(value => {
      if (!controller.signal.aborted) setGraph(value);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [attempt]);
  if (failed) return <ErrorPanel title="Graph unavailable" message="The catalog could not be loaded."
    onRetry={() => { setFailed(false); setAttempt(a => a + 1); }} />;
  if (!graph) return <LoadingPanel title="Loading graph" description="Reading the Neo4j catalog." />;
  if (!graph.nodes.length) return <EmptyPanel title="Empty graph" description="No catalog relationships were returned." />;
  return <GraphView graph={graph} />;
};

export function GraphView({ graph }: { graph: CatalogGraph }) {
  const nodes: KGNode[] = useMemo(() => graph.nodes.map((n, i) => {
    const angle = 2 * Math.PI * i / graph.nodes.length;
    return { ...n, x: 480 + 375 * Math.cos(angle), y: 270 + 210 * Math.sin(angle) };
  }), [graph.nodes]);
  const edges = graph.edges;
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(edges[0]?.id ?? null);
  const [visibleTypes, setVisibleTypes] = useState<Record<KGNode['type'], boolean>>({
    Herb: true,
    Dosha: true,
    Season: true,
    Condition: true,
    Drug: true
  });
  const [zoom, setZoom] = useState(1);

  const visibleNodes = useMemo(
    () => nodes.filter(n => visibleTypes[n.type]),
    [nodes, visibleTypes]
  );

  const visibleNodeSet = useMemo(
    () => new Set(visibleNodes.map(n => n.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(
    () => edges.filter(e => visibleNodeSet.has(e.source) && visibleNodeSet.has(e.target)),
    [edges, visibleNodeSet]
  );

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
  const selectedEdge = edges.find(e => e.id === selectedEdgeId) || null;

  const connectedEdges = useMemo(
    () =>
      selectedNode
        ? visibleEdges.filter(
            e => e.source === selectedNode.id || e.target === selectedNode.id
          )
        : [],
    [selectedNode, visibleEdges]
  );

  const toggleType = (t: KGNode['type']) => {
    setVisibleTypes(prev => ({ ...prev, [t]: !prev[t] }));
  };

  const getEdgeColor = (type: KGEdge['type']) => {
    if (type === 'CONTRAINDICATED_IN' || type === 'AGGRAVATES' || type === 'INTERACTS_WITH') {
      return '#B64040';
    }
    if (type === 'PACIFIES' || type === 'TREATS') return '#247A58';
    return '#758078';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Neo4j Ontology Inspection"
        title="Knowledge Graph Explorer"
        description="Explore up to 24 relationships from the live Neo4j catalog. These project-authored ontology relationships are clinically unverified."
      />

      {/* Controls & Restrained Legend */}
      <div className="bg-white border border-[#DDE4DE] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#26332D] mr-1">Node Legend &amp; Filter:</span>
          {(['Herb', 'Dosha', 'Season', 'Condition'] as const).map(type => {
            const active = visibleTypes[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition cursor-pointer ${
                  active
                    ? 'bg-[#F7F5EE] border-[#A8B8A0] text-[#26332D]'
                    : 'bg-white border-[#DDE4DE] text-[#758078] opacity-55'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: NODE_COLORS[type].fill }}
                />
                <span>{type}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.75, +(z - 0.1).toFixed(2)))}
            className="p-2 rounded-lg border border-[#DDE4DE] bg-white text-[#26332D] hover:bg-[#F7F5EE] cursor-pointer"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium tabular-nums text-[#758078] w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(1.35, +(z + 0.1).toFixed(2)))}
            className="p-2 rounded-lg border border-[#DDE4DE] bg-white text-[#26332D] hover:bg-[#F7F5EE] cursor-pointer"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setSelectedNodeId(nodes[0]?.id);
              setSelectedEdgeId(edges[0]?.id ?? null);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-[#DDE4DE] bg-white text-xs text-[#26332D] hover:bg-[#F7F5EE] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Central Graph Canvas + Detail Side Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-8 bg-white border border-[#DDE4DE] rounded-xl p-4 overflow-hidden">
          <div className="rounded-lg border border-[#DDE4DE] bg-[#F7F5EE] overflow-auto">
            <svg
              viewBox="0 0 960 580"
              className="w-full h-[460px] sm:h-[520px] select-none"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            >
              <defs>
                <marker
                  id="arrow-muted"
                  viewBox="0 0 10 10"
                  refX="26"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#758078" />
                </marker>
                <marker
                  id="arrow-danger"
                  viewBox="0 0 10 10"
                  refX="26"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#B64040" />
                </marker>
                <marker
                  id="arrow-safe"
                  viewBox="0 0 10 10"
                  refX="26"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#247A58" />
                </marker>
              </defs>

              {/* Edges — only show label for selected/connected edge to avoid clutter */}
              {visibleEdges.map(edge => {
                const src = nodes.find(n => n.id === edge.source);
                const tgt = nodes.find(n => n.id === edge.target);
                if (!src || !tgt) return null;

                const isSelected = selectedEdgeId === edge.id;
                const isConnected =
                  selectedNodeId === edge.source || selectedNodeId === edge.target;
                const color = getEdgeColor(edge.type);
                const marker =
                  color === '#B64040'
                    ? 'url(#arrow-danger)'
                    : color === '#247A58'
                    ? 'url(#arrow-safe)'
                    : 'url(#arrow-muted)';
                const midX = (src.x + tgt.x) / 2;
                const midY = (src.y + tgt.y) / 2;

                return (
                  <g
                    key={edge.id}
                    onClick={() => setSelectedEdgeId(edge.id)}
                    className="cursor-pointer"
                  >
                    <line
                      x1={src.x}
                      y1={src.y}
                      x2={tgt.x}
                      y2={tgt.y}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : isConnected ? 2 : 1.25}
                      strokeOpacity={isSelected || isConnected ? 0.95 : 0.35}
                      markerEnd={marker}
                    />
                    {(isSelected || isConnected) && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-56"
                          y="-10"
                          width="112"
                          height="20"
                          rx="4"
                          fill="#FFFFFF"
                          stroke={isSelected ? color : '#DDE4DE'}
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle"
                          y="3.5"
                          fontSize="9.5"
                          fontWeight="600"
                          fill={color}
                          fontFamily="DM Sans, sans-serif"
                        >
                          {edge.type}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {visibleNodes.map(node => {
                const isSelected = selectedNodeId === node.id;
                const style = NODE_COLORS[node.type];
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      const firstRel = visibleEdges.find(
                        e => e.source === node.id || e.target === node.id
                      );
                      if (firstRel) setSelectedEdgeId(firstRel.id);
                    }}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <circle r="31" fill="none" stroke="#173D32" strokeWidth="2.5" strokeDasharray="4 3" />
                    )}
                    <circle
                      r="24"
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth="2"
                    />
                    <text
                      y="38"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="600"
                      fill="#26332D"
                      fontFamily="DM Sans, sans-serif"
                    >
                      {node.label}
                    </text>
                    {isSelected && node.sublabel && (
                      <text
                        y="52"
                        textAnchor="middle"
                        fontSize="10"
                        fill="#758078"
                        fontFamily="DM Sans, sans-serif"
                      >
                        {node.sublabel}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        {/* Right Detail Panel */}
        <aside className="xl:col-span-4 space-y-4">
          {selectedNode && (
            <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#DDE4DE]">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      NODE_COLORS[selectedNode.type].badge
                    }`}
                  >
                    {selectedNode.type} Node
                  </span>
                  <h2 className="font-editorial text-xl font-semibold text-[#26332D] mt-1">
                    {selectedNode.label}
                  </h2>
                  {selectedNode.sublabel && (
                    <p className="text-xs italic text-[#758078]">{selectedNode.sublabel}</p>
                  )}
                </div>
              </div>

              <dl className="space-y-2 text-xs">
                {Object.entries(selectedNode.properties).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-start justify-between gap-3 py-1.5 border-b border-[#DDE4DE]/60 last:border-b-0"
                  >
                    <dt className="text-[#758078] font-medium">{k}</dt>
                    <dd className="text-[#26332D] font-semibold text-right">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-[#26332D]">
                  Connected Relationships ({connectedEdges.length})
                </p>
                <div className="space-y-1.5">
                  {connectedEdges.map(edge => {
                    const src = nodes.find(n => n.id === edge.source)?.label;
                    const tgt = nodes.find(n => n.id === edge.target)?.label;
                    return (
                      <button
                        key={edge.id}
                        type="button"
                        onClick={() => setSelectedEdgeId(edge.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-[11px] font-mono transition cursor-pointer ${
                          selectedEdgeId === edge.id
                            ? 'bg-[#E8EFE8] border-[#173D32] text-[#173D32]'
                            : 'bg-[#F7F5EE] border-[#DDE4DE] text-[#26332D] hover:bg-[#E8EFE8]/40'
                        }`}
                      >
                        ({src})-[:{edge.type}]-&gt;({tgt})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {selectedEdge && (
            <div className="bg-white border border-[#DDE4DE] rounded-xl p-5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#164B45]">
                <GitBranch className="w-4 h-4" />
                <span>Selected Relationship Provenance</span>
              </div>
              <p className="font-mono text-xs bg-[#F7F5EE] border border-[#DDE4DE] rounded px-2.5 py-1.5 text-[#26332D]">
                :{selectedEdge.type}
              </p>
              <p>Project ontology ? {selectedEdge.verification}</p>
              <p className="text-[11px] text-[#758078] inline-flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#164B45]" />
                Provenance: {selectedEdge.provenance}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
