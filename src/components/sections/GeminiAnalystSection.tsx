import React, { useState } from 'react';
import { useExperiment } from '../../context/ExperimentContext.tsx';
import { askGemini } from '../../lib/api.ts';
import { Sparkles, Send, Loader2, AlertTriangle } from 'lucide-react';

const SUGGESTED = [
  'Explain what the benchmark comparison shows.',
  'What do the Betti numbers of the largest void mean?',
  'Is the adaptive config actually better? By how much?',
  'What would change on real quantum hardware?',
];

export const GeminiAnalystSection: React.FC = () => {
  const { configData, lorenzParams, benchmarkSeries, selectedStep, voids, surgeryResults } = useExperiment();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildExperiment = () => ({
    config: configData,
    lorenzParams,
    benchmark: {
      steps: benchmarkSeries.length,
      latest: benchmarkSeries[Math.min(selectedStep, benchmarkSeries.length - 1)],
      first: benchmarkSeries[0],
    },
    voids: voids.slice(0, 5).map(v => ({
      name: v.name, betti: v.betti,
      persistence: { lifetime: v.persistence.lifetime, confidence: v.persistence.confidence },
      genusContribution: v.genusContribution,
    })),
    surgeryResults,
  });

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const result = await askGemini(query, buildExperiment());
      setAnswer(result);
    } catch (e: any) {
      setError('Analyst unavailable right now — please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="analyst-section" className="py-14 lg:py-20 border-b border-slate-900 bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-purple-950 border border-purple-800 text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white font-mono">Gemini Experiment Analyst</h2>
            <p className="text-sm text-slate-400">Ask about your simulation — powered by Gemini, grounded in your live experiment data.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 my-5">
          {SUGGESTED.map(s => (
            <button
              key={s}
              onClick={() => { setQuestion(s); ask(s); }}
              disabled={loading}
              className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 hover:border-purple-600 text-xs font-mono text-slate-300 hover:text-white transition disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') ask(question); }}
            placeholder="Ask about the manifold, benchmarks, surgery results..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 font-mono"
          />
          <button
            onClick={() => ask(question)}
            disabled={loading || !question.trim()}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-sm font-bold flex items-center gap-2 transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Ask
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-200 font-mono">{error}</p>
          </div>
        )}

        {answer && (
          <div className="mt-4 p-5 rounded-xl bg-slate-900/80 border border-purple-800/40">
            <div className="flex items-center gap-2 mb-3 text-purple-300 font-mono text-xs font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>GEMINI ANALYSIS</span>
            </div>
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">{answer}</div>
          </div>
        )}
      </div>
    </section>
  );
};
