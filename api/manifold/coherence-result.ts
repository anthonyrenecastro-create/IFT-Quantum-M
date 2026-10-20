/**
 * GET /api/manifold/coherence-result?noisy=<arn>&ideal=<arn>&twoQubitGates=3&gateTimeNs=300
 *
 * Reads both DM1 task results from S3 and computes the EFFECTIVE T2*:
 *
 *   fidelity_ratio = P_noisy(target) / P_ideal(target)
 *   t_circuit      = twoQubitGates * gateTimeNs
 *   T2*            = -t_circuit / ln(fidelity_ratio)
 *
 * Returns { status: 'pending' } while either task is incomplete, or the
 * measurement with full provenance when both are done.
 *
 * Honest labeling: this is an effective decoherence time under DM1's
 * depolarizing noise model with an assumed gate time — NOT a hardware T2.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BraketClient, GetQuantumTaskCommand } from '@aws-sdk/client-braket';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const RESULTS_BUCKET = 'ift-quantum-lab-artifacts-397450412448';

async function taskStatus(client: BraketClient, arn: string) {
  const out = await client.send(new GetQuantumTaskCommand({ quantumTaskArn: arn }));
  return out;
}

async function readDistribution(s3: S3Client, bucket: string, prefix: string): Promise<Record<string, number>> {
  const key = `${prefix.replace(/\/$/, '')}/results.json`;
  const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const text = await out.Body!.transformToString();
  const data = JSON.parse(text);
  const counts: Record<string, number> = {};
  const shots = (data.measurements as number[][]) || [];
  for (const shot of shots) {
    const bits = shot.map((b) => String(Math.round(b))).join('');
    counts[bits] = (counts[bits] || 0) + 1;
  }
  const total = shots.length || 1;
  const dist: Record<string, number> = {};
  for (const [k, v] of Object.entries(counts)) dist[k] = v / total;
  return dist;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { noisy, ideal, twoQubitGates, gateTimeNs } = req.query as Record<string, string>;
  if (!noisy || !ideal || !noisy.startsWith('arn:') || !ideal.startsWith('arn:')) {
    return res.status(400).json({ error: 'Query must include noisy and ideal task ARNs.' });
  }
  const gates = Math.max(1, parseInt(twoQubitGates || '3', 10));
  const gateNs = Math.max(1, parseInt(gateTimeNs || '300', 10));

  const keyId = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  if (!keyId || !secret) {
    return res.status(503).json({ error: 'AWS credentials not configured.' });
  }
  const braket = new BraketClient({
    region: 'us-east-1',
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  });
  const s3 = new S3Client({
    region: 'us-east-1',
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  });

  try {
    const [nTask, iTask] = await Promise.all([
      taskStatus(braket, noisy),
      taskStatus(braket, ideal),
    ]);
    if (nTask.status !== 'COMPLETED' || iTask.status !== 'COMPLETED') {
      return res.status(200).json({
        status: 'pending',
        noisyStatus: nTask.status,
        idealStatus: iTask.status,
      });
    }
    const [nDist, iDist] = await Promise.all([
      readDistribution(s3, RESULTS_BUCKET, nTask.outputS3KeyPrefix || ''),
      readDistribution(s3, RESULTS_BUCKET, iTask.outputS3KeyPrefix || ''),
    ]);
    // Fidelity proxy: probability mass on the ideal distribution's mode
    const mode = Object.entries(iDist).sort((a, b) => b[1] - a[1])[0]?.[0] || '0000';
    const pNoisy = nDist[mode] || 0;
    const pIdeal = iDist[mode] || 1;
    const ratio = pIdeal > 0 ? pNoisy / pIdeal : 0;
    const tCircuitNs = gates * gateNs;
    // T2* = -t / ln(ratio); guard degenerate cases
    const t2Ns = ratio > 0 && ratio < 1 ? -tCircuitNs / Math.log(ratio) : null;

    return res.status(200).json({
      status: 'complete',
      mode,
      pNoisy: Math.round(pNoisy * 10000) / 10000,
      pIdeal: Math.round(pIdeal * 10000) / 10000,
      fidelityRatio: Math.round(ratio * 10000) / 10000,
      effectiveT2Ns: t2Ns === null ? null : Math.round(t2Ns),
      effectiveT2Us: t2Ns === null ? null : Math.round(t2Ns / 1000 * 10) / 10,
      provenance: {
        device: 'DM1 (density-matrix simulator)',
        noiseModel: 'depolarizing pragmas after each gate',
        gateTimeAssumptionNs: gateNs,
        note: 'Effective T2* under DM1 noise model — not a hardware T2 measurement.',
      },
      measuredAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(502).json({
      error: `Result retrieval failed: ${err instanceof Error ? err.message.slice(0, 200) : 'unknown'}`,
    });
  }
}
