import { appendFileSync } from "node:fs";

const baseUrl = process.env.PROGRAM_HARBOR_BASE_URL || "https://program-harbor.sourcebottle.workers.dev";
const durationMs = Number(process.env.PROGRAM_HARBOR_MONITOR_DURATION_MS || 30 * 60 * 1000);
const intervalMs = Number(process.env.PROGRAM_HARBOR_MONITOR_INTERVAL_MS || 30 * 1000);
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = `/tmp/program-harbor-live-monitor-${runId}.jsonl`;
const donePath = `${outputPath}.done`;
const userAgent = "ProgramHarborDeployCheck/0.1";

type Snapshot = {
  at: string;
  status: "healthy" | "degraded";
  healthCode: number;
  publicCode: number;
  storage: string;
  error?: string;
};

function record(value: unknown) {
  appendFileSync(outputPath, `${JSON.stringify(value)}\n`, "utf8");
}

async function readSnapshot(): Promise<Snapshot> {
  try {
    const [healthResponse, publicResponse] = await Promise.all([
      fetch(`${baseUrl}/api/health`, { headers: { "User-Agent": userAgent } }),
      fetch(`${baseUrl}/api/state?view=public`, { headers: { "User-Agent": userAgent } }),
    ]);
    const health = (await healthResponse.json()) as { storage?: string };
    return {
      at: new Date().toISOString(),
      status: healthResponse.ok && publicResponse.ok ? "healthy" : "degraded",
      healthCode: healthResponse.status,
      publicCode: publicResponse.status,
      storage: health.storage || "unknown",
    };
  } catch (error) {
    return {
      at: new Date().toISOString(),
      status: "degraded",
      healthCode: 0,
      publicCode: 0,
      storage: "unknown",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  record({ event: "started", at: startedAt, baseUrl, durationMs, intervalMs, userAgent });
  let previousStatus: string | undefined;
  const deadline = Date.now() + durationMs;

  while (Date.now() < deadline) {
    const snapshot = await readSnapshot();
    if (snapshot.status !== previousStatus) {
      record(snapshot);
      console.log(JSON.stringify(snapshot));
      previousStatus = snapshot.status;
    }
    const waitMs = Math.min(intervalMs, Math.max(0, deadline - Date.now()));
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const completedAt = new Date().toISOString();
  record({ event: "completed", at: completedAt, baseUrl, userAgent });
  appendFileSync(donePath, `${JSON.stringify({ completedAt, outputPath })}\n`, "utf8");
  console.log(JSON.stringify({ event: "completed", at: completedAt, outputPath, donePath }));
}

void main();
