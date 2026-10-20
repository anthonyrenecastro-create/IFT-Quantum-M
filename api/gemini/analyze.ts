import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const SYSTEM_PROMPT = `You are a quantum information scientist specializing in Interplayed Field Theory (IFT) and topological quantum computing. You analyze experiment data from a quantum manifold simulation lab.

The lab simulates:
- Lorenz chaotic dynamics (classical chaos baseline, sigma/rho/beta parameters)
- Quantum manifolds: qubit nodes embedded on high-genus Riemannian surfaces, with coherence times, phase angles, curvature
- Topological data analysis: voids with Betti numbers (b0=components, b1=tunnels, b2=cavities), persistence lifetimes
- Topological surgery: cutting/ stitching manifold edges to modify topology
- Benchmarks comparing a fixed control config vs an adaptive IFT-optimized config (fidelity, entropy, syndrome rates)

Be precise, quantitative, and honest. Reference actual numbers from the data. Distinguish simulated results from what real hardware would show. Keep responses focused and under 300 words unless asked for more. Use plain language for complex ideas but don't dumb down the physics.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini API key not configured on the server.' });
  }

  const { question, experiment } = req.body || {};
  if (!question || !experiment) {
    return res.status(400).json({ error: 'Missing question or experiment data.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Experiment data (JSON):\n${JSON.stringify(experiment).slice(0, 12000)}\n\nQuestion: ${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { systemInstruction: SYSTEM_PROMPT, maxOutputTokens: 1024 },
    });

    const text = typeof response.text === 'function' ? (response.text as any)() : response.text;
    return res.status(200).json({ answer: text || '' });
  } catch (err: any) {
    const status = err?.status || err?.response?.status || err?.code || 'unknown';
    const msg = (err?.message || 'Gemini request failed.').slice(0, 300);
    console.error('Gemini error:', status, msg);
    return res.status(500).json({ error: 'Gemini request failed.' });
  }
}
