import React from 'react';
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
} from 'lucide-react';

export const ManifoldControllerSection: React.FC = () => {
  const {
    isAdaptive,
    setIsAdaptive,
    configData,
    nodes,
    edges,
  } = useExperiment();

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
              <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono text-slate-400">
                Illustrative — model values, not measured
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

            {/* Manifold Metric Indicators */}
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
                <span className={`text-base font-semibold ${isAdaptive ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {configData.circuit_optimization.max_two_qubit_depth} gates
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isAdaptive ? '-70.3% gate reduction' : 'Unoptimized transpilation'}
                </span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl font-mono">
                <span className="text-[10px] uppercase text-slate-400 block">Mean Coherence (T₂)</span>
                <span className="text-base font-semibold text-purple-400">
                  {isAdaptive ? '96.8 µs' : '38.6 µs'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {isAdaptive ? '+150% decoherence delay' : 'Susceptible to phase drift'}
                </span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl font-mono">
                <span className="text-[10px] uppercase text-slate-400 block">Ricci Curvature (R)</span>
                <span className="text-base font-semibold text-sky-400">
                  {isAdaptive ? 'R = -0.15 (Equilibrated)' : 'R = -0.42 (Stress Pinch)'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Riemannian curvature</span>
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
                  <span className="text-slate-400">Classiq Synthesis Engine:</span>
                  <span className="text-purple-400 font-semibold">
                    {configData.circuit_optimization.engine}
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
