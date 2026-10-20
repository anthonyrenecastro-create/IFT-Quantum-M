import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useExperiment } from '../../context/ExperimentContext.tsx';
import { LorenzAndManifoldCanvas } from '../canvas/LorenzAndManifoldCanvas.tsx';
import {
  Compass,
  Scissors,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  HelpCircle,
  Eye,
} from 'lucide-react';

export const TdaExplorerSection: React.FC = () => {
  const {
    voids,
    selectedVoid,
    setSelectedVoid,
    isPerformingSurgery,
    surgeryResults,
    runTopologicalSurgery,
  } = useExperiment();

  return (
    <section id="tda-section" className="py-14 lg:py-20 border-b border-slate-900 bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-xs font-mono text-emerald-400 mb-3">
              <Compass className="w-3.5 h-3.5" />
              <span>src/manifold/invariants.py • src/topology/betti.py</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
              Topological Data Analysis <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400">(TDA) Explorer</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl">
              Persistent homology and Betti numbers identify structural voids and homological cycles in the quantum circuit. 
              Topological surgery repairs degraded cycles to maintain fault-tolerant logical states.
            </p>
          </div>

          {/* Topological Surgery Action Trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={runTopologicalSurgery}
              disabled={isPerformingSurgery}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-xl ${
                isPerformingSurgery
                  ? 'bg-amber-600/50 text-amber-200 border border-amber-500 cursor-wait'
                  : 'bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white border border-rose-400/50 shadow-rose-900/30'
              }`}
            >
              <Scissors className={`w-4 h-4 ${isPerformingSurgery ? 'animate-spin' : ''}`} />
              <span>{isPerformingSurgery ? 'Executing Surgery...' : 'Execute Topological Surgery'}</span>
            </button>
          </div>
        </div>

        {/* 3D Visualizer + TDA Invariants Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 3D Canvas in TDA mode */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="relative">
              <LorenzAndManifoldCanvas mode="tda" height="h-[520px]" />
              
              {/* Overlay Surgery Animation State Banner */}
              <AnimatePresence>
                {isPerformingSurgery && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 rounded-xl bg-slate-900/90 border border-rose-500/80 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-mono text-rose-300"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></div>
                    <span>src/topology/surgery.py: Excising noisy non-contractible links &amp; re-stitching geodesic boundary loops...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {surgeryResults && !isPerformingSurgery && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/80 shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-mono text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {surgeryResults.cutCount === 0
                      ? `No high-noise couplers found; stitched ${surgeryResults.stitchedCount} boundary stabilizers`
                      : `Surgery Complete: Excised ${surgeryResults.cutCount} high-noise couplers • Stitched ${surgeryResults.stitchedCount} boundary stabilizers`}
                  </span>
                </div>
              )}
            </div>

            {/* Void Selector Pills */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-xs font-mono text-slate-400 pl-2">Select Structural Void:</span>
              {voids.map((v) => {
                const isSelected = selectedVoid?.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoid(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30 border border-purple-400'
                        : 'bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 text-purple-300" />
                    <span>{v.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Inspector: Betti Numbers, Persistent Homology & Surgery Log */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Active Void Invariants Card */}
            {selectedVoid && (
              <div className="bg-slate-900/90 border border-purple-500/30 p-5 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <h3 className="font-mono text-sm font-semibold text-white">{selectedVoid.name}</h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    Genus +{selectedVoid.genusContribution}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {selectedVoid.description}
                </p>

                {/* Betti Numbers Display (src/topology/betti.py) */}
                <div className="mb-4">
                  <span className="text-[11px] font-mono text-slate-400 block mb-2 uppercase font-semibold">
                    Topological Invariants: Betti Numbers
                  </span>
                  <div className="grid grid-cols-3 gap-2 font-mono text-center">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">β₀ (Components)</span>
                      <span className="text-base font-bold text-cyan-400">{selectedVoid.betti.b0}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">β₁ (1D Cycles)</span>
                      <span className="text-base font-bold text-purple-400">{selectedVoid.betti.b1}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-sans">β₂ (2D Voids)</span>
                      <span className="text-base font-bold text-emerald-400">{selectedVoid.betti.b2}</span>
                    </div>
                  </div>
                </div>

                {/* Persistent Homology Metrics (src/topology/persistent.py) */}
                <div>
                  <span className="text-[11px] font-mono text-slate-400 block mb-2 uppercase font-semibold">
                    Persistent Homology Filtration (ε Scale)
                  </span>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
                      <span className="text-slate-400">Filtration Birth (ε_b):</span>
                      <span className="text-white font-semibold">{selectedVoid.persistence.birth}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
                      <span className="text-slate-400">Filtration Death (ε_d):</span>
                      <span className="text-white font-semibold">{selectedVoid.persistence.death}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
                      <span className="text-slate-400">Persistence Lifetime (τ):</span>
                      <span className="text-emerald-400 font-semibold">{selectedVoid.persistence.lifetime} (High)</span>
                    </div>
                    <div className="flex justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80">
                      <span className="text-slate-400">Topological Confidence:</span>
                      <span className="text-cyan-400 font-semibold">{(selectedVoid.persistence.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 mt-2">
                    Illustrative — model values, not measured.
                  </p>
                </div>

              </div>
            )}

            {/* Persistent Barcode Mini-Diagram */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs font-mono font-semibold text-white block mb-2">
                Vietoris-Rips Persistence Barcode
              </span>
              <p className="text-[11px] text-slate-400 mb-3">
                Features with long horizontal persistence intervals correspond to genuine topological invariants, while short bars represent high-frequency noise.
              </p>
              
              <div className="space-y-2 font-mono text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span className="font-sans">H₁ Generator (Handle α):</span>
                    <span className="text-purple-400">0.12 → 4.85</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-purple-500 h-full rounded-full ml-[2%] w-[90%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span className="font-sans">H₁ Generator (Handle β):</span>
                    <span className="text-purple-400">0.14 → 4.92</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-purple-500 h-full rounded-full ml-[3%] w-[92%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span className="font-sans">H₂ Cavity (γ-Neck):</span>
                    <span className="text-emerald-400">0.35 → 3.88</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-emerald-500 h-full rounded-full ml-[7%] w-[72%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span className="font-sans">Noise Perturbations:</span>
                    <span className="text-slate-400">0.80 → 1.15</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-slate-600 h-full rounded-full ml-[16%] w-[7%]"></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
