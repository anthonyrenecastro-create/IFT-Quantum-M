import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useExperiment } from '../../context/ExperimentContext.tsx';
import { LorenzAndManifoldCanvas } from '../canvas/LorenzAndManifoldCanvas.tsx';
import {
  Network,
  Cpu,
  Minimize2,
  Maximize2,
  CheckCircle,
  Zap,
  Gauge,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface ManifoldMeasurements {
  engine: string;
  qubits: number;
  edges: number;
  twoQubitDepthUnoptimized: number;
  twoQubitDepth: number;
  reductionPct: number;
  expectedFidelity: number | null;
  meanRicciCurvature: number;
  measuredAt: string;
}

interface CoherenceResult {
  status: 'pending' | 'complete';
  effectiveT2Us?: number | null;
  fidelityRatio?: number;
  noisyStatus?: string;
  idealStatus?: string;
  provenance?: { note: string };
}

export const ManifoldControllerSection: React.FC = () => {
  const {
    isAdaptive,
    setIsAdaptive,
    configData,
    nodes,
    edges,
  } = useExperiment();

  // Live empirical measurements (replaces hardcoded illustrative values)
  const [measure, setMeasure] = useState<ManifoldMeasurements | null>(null);
  const [measureError, setMeasureError] = useState<string | null>(null);
  const [coherence, setCoherence] = useState<CoherenceResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Measure circuit depth + Ricci curvature whenever the manifold changes
  useEffect(() => {
    let cancelled = false;
    setMeasure(null);
    setMeasureError(null);
    fetch('/api/manifold/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes: nodes.map((n: any) => ({ id: n.id })),
        edges: edges.map((e: any) => ({
          source: e.source,
          target: e.target,
          errorProbability: (e as any).errorProbability,
        })),
      }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ManifoldMeasurements) => { if (!cancelled) setMeasure(data); })
      .catch((e) => { if (!cancelled) setMeasureError(e instanceof Error ? e.message : 'measurement failed'); });
    return () => { cancelled = true; };
  }, [nodes, edges]);

  // Run the DM1 coherence probe once per manifold mode
  useEffect(() => {
    let cancelled = false;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setCoherence(null);
    const angles = nodes.slice(0, 4).map((n: any, i: number) => Math.abs(((n as any).curvature ?? -0.15) + 1) * (i + 1) * 0.5);
    fetch('/api/manifold/coherence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ angles, shots: 500 }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
        return r.json();
      })
      .then((sub: { noisyTaskArn: string; idealTaskArn: string; twoQubitGates: number; gateTimeNs: number }) => {
        if (cancelled) return;
        const poll = async () => {
          try {
            const r = await fetch(
              `/api/manifold/coherence-result?noisy=${encodeURIComponent(sub.noisyTaskArn)}&ideal=${encodeURIComponent(sub.idealTaskArn)}&twoQubitGates=${sub.twoQubitGates}&gateTimeNs=${sub.gateTimeNs}`,
            );
            const data: CoherenceResult = await r.json();
            if (cancelled) return;
            setCoherence(data);
            if (data.status === 'complete' && pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          } catch { /* keep polling */ }
        };
        poll();
        pollRef.current = setInterval(poll, 6000);
      })
      .catch(() => { if (!cancelled) setCoherence({ status: 'pending' }); });
    return () => {
      cancelled = true;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [isAdaptive]);

  return (
    <section id="manifold-section" className="py-14 lg:py-20 border-b border-slate-900 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-800/60 text-xs font-mono text-purple-400 mb-3">
              <Network className="w-3.5 h-3.5" />
              <span>src/manifold/mesh.py &amp; src/manifold/geometry.py</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
              The Quantum Manifold <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Controller</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl">
              Transitioning continuous dynamical flows into discrete quantum circuits. 
              Information is mapped onto Riemannian geometry where logical qubits correspond to non-contractible homology cycles.
            </p>
            <div className="mt-3">
              <span className="px-3 py-1.5 rounded-full bg-emerald-950 border border-emerald-800 text-xs font-mono text-emerald-400">
                Live — measured on this manifold
              </span>
            </div>
          </div>

          {/* Interactive Switch Panel for Adaptive Manifold */}
          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-2xl flex items-center gap-3 shadow-xl">
            <span className="text-xs font-mono text-slate-300 pl-2">Topology State:</span>
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setIsAdaptive(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  !isAdaptive
                    ? 'bg-slate-800 text-amber-300 font-semibold shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Fixed Baseline</span>
              </button>
              <button
                onClick={() => setIsAdaptive(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  isAdaptive
                    ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-semibold shadow-lg shadow-purple-600/25 border border-purple-400/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                <span>Adaptive Manifold</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3D Visualizer & Manifold Geometry Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 3D Canvas rendering the Quantum Circuit Manifold */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <LorenzAndManifoldCanvas mode="manifold" height="h-[520px]" />

            {/* Manifold Metric Indicators — LIVE measurements */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl font-mono">
                <span className="text-[10px] uppercase text-slate-400 block">Topological Genus (g)</span>
                <span className="text-base font-semibold text-cyan-400">g = {configData.genus}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {configData.genus === 2 ? 'Double-Torus Manifold' : 'Rigid Rectangular Torus'}
                </span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl font-mono">
                <span className="text-[10px] uppercase text-slate-400 block">Circuit 2-Qubit Depth</span>
                {measure ? (
                  <>
                    <span className="text-base font-semibold text-emerald-400">
                      {measure.twoQubitDepth} gates
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {measure.expectedFidelity !== null
                        ? `Expected fidelity ${(measure.expectedFidelity * 100).toFixed(1)}% (edge error model)`
                        : 'Expected fidelity: no error model on edges'}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Transpiler: −{measure.reductionPct}% ({measure.twoQubitDepthUnoptimized} → {measure.twoQubitDepth})
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Measuring…
                  </span>
                )}
                {measureError && <span className="text-[10px] text-red-400 block mt-1">{measureError}</span>}
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl font-mono">
                <span className="text-[10px] uppercase text-slate-400 block">Effective T₂*</span>
                {coherence?.status === 'complete' && coherence.effectiveT2Us != null ? (
                  <>
                    <span className="text-base font-semibold text-purple-400">
                      {coherence.effectiveT2Us} µs
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      DM1 probe, fidelity ratio {coherence.fidelityRatio}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1 italic">
                      Noise-model derived, not hardware T₂
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {coherence?.status === 'pending' ? 'DM1 running…' : 'Probing…'}
                  </span>
                )}
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl font-mono">
                <span className="text-[10px] uppercase text-slate-400 block">Mean Ricci Curvature</span>
                {measure ? (
                  <>
                    <span className="text-base font-semibold text-sky-400">
                      R = {measure.meanRicciCurvature}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Forman-Ricci over {measure.edges} edges
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Computed from live mesh graph
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Measuring…
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Manifold Architecture Controls & Live Status */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Live Re-weaving Status Card */}
            <div className={`border p-5 rounded-2xl shadow-xl transition-all ${
              isAdaptive
                ? 'bg-gradient-to-br from-cyan-950/40 via-slate-900 to-purple-950/40 border-cyan-500/40 shadow-cyan-500/10'
                : 'bg-slate-900/90 border-slate-800'
            }`}>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-mono text-sm font-semibold text-white">Dynamic Re-weaving Engine</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  isAdaptive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                }`}>
                  {isAdaptive ? 'RE-WOVEN' : 'RIGID'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {isAdaptive
                  ? 'Adaptive algorithm re-orients 2-qubit couplers along minimal geodesic distance on the genus-2 manifold, eliminating parasitic cross-talk and minimizing error syndromes.'
                  : 'Fixed baseline executes on a rigid rectangular grid with fixed nearest-neighbor couplings, accumulating non-local SWAP routing overhead.'}
              </p>

              {/* Real-time stats */}
              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400">Total Qubit Nodes:</span>
                  <span className="text-white font-semibold">{nodes.length} Physical Qubits</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400">Active Entangling Couplers:</span>
                  <span className="text-cyan-400 font-semibold">{edges.length} CZ Links</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400">Synthesis Engine:</span>
                  <span className="text-purple-400 font-semibold">
                    {measure ? `${measure.engine} (live)` : 'Starting…'}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                  <span className="text-slate-400">Noise Threshold Cutoff:</span>
                  <span className="text-amber-400 font-semibold">
                    {configData.circuit_optimization.noise_threshold}
                  </span>
                </div>
              </div>
            </div>

            {/* Scientific Explanation Box */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center gap-2 mb-2 text-purple-300 font-mono text-xs font-semibold">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Topological Invariance in IFT</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                By modeling the quantum state as an Information Field over a Riemannian manifold with non-trivial first Betti number (&beta;<sub>1</sub> = 4), logical information is encoded in non-local Wilson loops around the manifold handles. 
                Local noise perturbations cannot disrupt these global topological invariants without spanning the entire perimeter of the handle.
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
