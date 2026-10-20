/**
 * POST /api/manifold/measure
 *
 * Empirical manifold measurements — no hardcoded values.
 *
 * Accepts the rendered manifold graph { nodes: [{id}], edges: [{source, target}] }
 * and returns LIVE measurements:
 *
 * 1. twoQubitDepthUnoptimized / twoQubitDepthOptimized / reductionPct:
 *    builds a real circuit (one parameterized 2q block per edge, decomposed
 *    into basis gates), runs a live peephole optimizer, and MEASURES the
 *    2-qubit gate count before/after. The reduction is observed, not assumed.
 *
 * 2. meanRicciCurvature: Forman-Ricci curvature computed from the actual
 *    graph — FR(e) = 4 - deg(u) - deg(v) + 3*triangles(e), averaged over edges.
 *
 * 3. engine: the optimizer that actually ran ("ift-transpiler-live v1").
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GraphNode { id: string; }
interface GraphEdge { source: string; target: string; errorProbability?: number; }

type Gate = { kind: 'ry' | 'rz' | 'cnot'; q: number; q2?: number; angle?: number };

function buildCircuit(nodes: GraphNode[], edges: GraphEdge[]): Gate[] {
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  const gates: Gate[] = [];
  // Single-qubit layer: RY parameterized by node index (deterministic)
  nodes.forEach((n, i) => {
    gates.push({ kind: 'ry', q: i, angle: 0.1 * (i + 1) });
  });
  // Per-edge parameterized entangler, naively decomposed: CNOT-RZ-CNOT
  edges.forEach((e, k) => {
    const u = idx.get(e.source);
    const v = idx.get(e.target);
    if (u === undefined || v === undefined) return;
    const phi = 0.05 * (k + 1);
    gates.push({ kind: 'cnot', q: u, q2: v });
    gates.push({ kind: 'rz', q: v, angle: phi });
    gates.push({ kind: 'cnot', q: u, q2: v });
  });
  return gates;
}

function count2q(gates: Gate[]): number {
  return gates.filter((g) => g.kind === 'cnot').length;
}

/**
 * Live peephole optimizer: cancels adjacent CNOT pairs on the same qubit
 * pair (self-inverse), and merges adjacent same-axis rotations on a qubit.
 * Returns the optimized gate list. This actually runs — the measured
 * reduction is empirical.
 */
function peepholeOptimize(gates: Gate[]): Gate[] {
  const out: Gate[] = [];
  for (const g of gates) {
    const last = out[out.length - 1];
    // Cancel CNOT pairs: CNOT(a,b) followed by CNOT(a,b) = identity
    if (
      last && last.kind === 'cnot' && g.kind === 'cnot' &&
      last.q === g.q && last.q2 === g.q2
    ) {
      out.pop();
      continue;
    }
    // Merge adjacent same-axis rotations on the same qubit
    if (
      last && (last.kind === 'ry' || last.kind === 'rz') &&
      last.kind === g.kind && last.q === g.q &&
      last.angle !== undefined && g.angle !== undefined
    ) {
      last.angle += g.angle;
      continue;
    }
    out.push({ ...g });
  }
  // Drop zero-angle rotations (no-ops)
  return out.filter((g) => g.angle === undefined || Math.abs(g.angle) > 1e-9);
}

/**
 * Forman-Ricci curvature for unweighted graphs.
 * FR(e) = 4 - deg(u) - deg(v) + 3 * (triangles containing e)
 */
function formanRicci(nodes: GraphNode[], edges: GraphEdge[]): number {
  const adj = new Map<string, Set<string>>();
  nodes.forEach((n) => adj.set(n.id, new Set()));
  edges.forEach((e) => {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  });
  if (edges.length === 0) return 0;
  let sum = 0;
  for (const e of edges) {
    const nu = adj.get(e.source);
    const nv = adj.get(e.target);
    if (!nu || !nv) continue;
    let triangles = 0;
    for (const w of nu) {
      if (w !== e.target && nv.has(w)) triangles++;
    }
    sum += 4 - nu.size - nv.size + 3 * triangles;
  }
  return sum / edges.length;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { nodes, edges } = (req.body || {}) as { nodes?: GraphNode[]; edges?: GraphEdge[] };
  if (!Array.isArray(nodes) || !Array.isArray(edges) || nodes.length === 0) {
    return res.status(400).json({ error: 'Body must include nodes[] and edges[].' });
  }
  if (nodes.length > 64 || edges.length > 4096) {
    return res.status(400).json({ error: 'Graph too large.' });
  }

  const circuit = buildCircuit(nodes, edges);
  const unoptimized = count2q(circuit);
  const optimized = peepholeOptimize(circuit);
  const optimizedCount = count2q(optimized);
  const reductionPct = unoptimized > 0 ? ((unoptimized - optimizedCount) / unoptimized) * 100 : 0;
  const meanRicci = formanRicci(nodes, edges);

  // Expected circuit fidelity from the manifold's own edge error model:
  // F = prod over entangling ops of (1 - p_e). Uses the errorProbability
  // carried on each edge by generateQuantumManifold — the quantity that
  // actually differs between fixed and adaptive manifolds.
  let logFidelity = 0;
  let edgesWithModel = 0;
  for (const e of edges) {
    if (typeof e.errorProbability === 'number' && e.errorProbability >= 0 && e.errorProbability < 1) {
      // 2 CNOTs per edge block in the naive decomposition
      logFidelity += 2 * Math.log(1 - e.errorProbability);
      edgesWithModel++;
    }
  }
  const expectedFidelity = edgesWithModel > 0 ? Math.exp(logFidelity) : null;

  return res.status(200).json({
    engine: 'ift-transpiler-live v1',
    qubits: nodes.length,
    edges: edges.length,
    twoQubitDepthUnoptimized: unoptimized,
    twoQubitDepth: optimizedCount,
    reductionPct: Math.round(reductionPct * 10) / 10,
    expectedFidelity: expectedFidelity === null ? null : Math.round(expectedFidelity * 10000) / 10000,
    edgesWithErrorModel: edgesWithModel,
    meanRicciCurvature: Math.round(meanRicci * 1000) / 1000,
    measuredAt: new Date().toISOString(),
  });
}
