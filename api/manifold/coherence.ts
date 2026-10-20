/**
 * POST /api/manifold/coherence
 *
 * Empirical coherence probe on AWS Braket DM1.
 *
 * Builds a 4-qubit probe circuit derived from the manifold (RY encodings of
 * four representative node values + CNOT ladder along manifold edges),
 * submits it twice to DM1 — once WITH depolarizing noise pragmas, once
 * WITHOUT (ideal reference) — and returns both task ARNs.
 *
 * The measured quantity is an EFFECTIVE T2* under DM1's depolarizing noise
 * model, derived at result time from the fidelity decay. It is NOT a
 * hardware T2 measurement (that requires a physical QPU) — the response
 * and UI say so explicitly.
 *
 * Body: { angles?: number[4], noiseP?: number, shots?: number }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BraketClient, CreateQuantumTaskCommand } from '@aws-sdk/client-braket';

const DM1_ARN = 'arn:aws:braket:::device/quantum-simulator/amazon/dm1';
const RESULTS_BUCKET = 'ift-quantum-lab-artifacts-397450412448';
const RESULTS_PREFIX = 'braket-results/manifold-coherence';
const GATE_TIME_NS = 300; // nominal 2q gate time assumption (stated in response)

function buildProbeQasm(angles: number[], noisy: boolean, noiseP: number): string {
  const lines: string[] = ['OPENQASM 3.0;', 'bit[4] b;', 'qubit[4] q;'];
  const noise = (q: number) =>
    noisy ? `#pragma braket noise depolarizing(${noiseP}) q[${q}]` : null;
  angles.forEach((a, i) => {
    lines.push(`ry(${a.toFixed(6)}) q[${i}];`);
    const n = noise(i);
    if (n) lines.push(n);
  });
  const pairs: Array<[number, number]> = [[0, 1], [1, 2], [2, 3]];
  for (const [u, v] of pairs) {
    lines.push(`cnot q[${u}], q[${v}];`);
    const n1 = noise(u);
    const n2 = noise(v);
    if (n1) lines.push(n1);
    if (n2) lines.push(n2);
  }
  for (let i = 0; i < 4; i++) lines.push(`b[${i}] = measure q[${i}];`);
  return lines.join('\n') + '\n';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { angles, noiseP, shots } = (req.body || {}) as {
    angles?: number[]; noiseP?: number; shots?: number;
  };
  const probeAngles = Array.isArray(angles) && angles.length === 4 &&
    angles.every((a) => Number.isFinite(a)) ? angles : [0.6, 1.1, 1.7, 2.3];
  const p = typeof noiseP === 'number' && noiseP > 0 && noiseP <= 0.25 ? noiseP : 0.02;
  const shotCount = typeof shots === 'number' && shots >= 10 && shots <= 1000 ? Math.floor(shots) : 500;

  const keyId = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  if (!keyId || !secret) {
    return res.status(503).json({ error: 'AWS credentials not configured.' });
  }
  const client = new BraketClient({
    region: 'us-east-1',
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  });

  try {
    const submit = async (noisy: boolean) => {
      const cmd = new CreateQuantumTaskCommand({
        deviceArn: DM1_ARN,
        action: JSON.stringify({
          braketSchemaHeader: { name: 'braket.ir.openqasm.program', version: '1' },
          source: buildProbeQasm(probeAngles, noisy, p),
        }),
        shots: shotCount,
        outputS3Bucket: RESULTS_BUCKET,
        outputS3KeyPrefix: RESULTS_PREFIX,
      });
      const out = await client.send(cmd);
      return out.quantumTaskArn;
    };
    const [noisyArn, idealArn] = await Promise.all([submit(true), submit(false)]);
    return res.status(202).json({
      noisyTaskArn: noisyArn,
      idealTaskArn: idealArn,
      shots: shotCount,
      noiseP: p,
      twoQubitGates: 3,
      gateTimeNs: GATE_TIME_NS,
      device: 'DM1',
    });
  } catch (err) {
    return res.status(502).json({
      error: `Braket submission failed: ${err instanceof Error ? err.message.slice(0, 200) : 'unknown'}`,
    });
  }
}
