import { chromium } from "@playwright/test";

const baseUrl = process.env.PROGRAM_HARBOR_BASE_URL || "http://localhost:3000";
const routes = ["/", "/admin", "/cfp", "/schedule", "/portal", "/api/docs"];
const samples = 3;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results: Array<Record<string, unknown>> = [];
  for (const route of routes) {
    const durations: number[] = [];
    for (let index = 0; index < samples; index += 1) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      const timing = await page.evaluate(() => {
        const entry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        return entry ? { responseEnd: entry.responseEnd, domContentLoaded: entry.domContentLoadedEventEnd, load: entry.loadEventEnd } : null;
      });
      if (timing) durations.push(Math.round(timing.responseEnd));
    }
    const sorted = [...durations].sort((a, b) => a - b);
    results.push({ route, samplesMs: durations, medianResponseEndMs: sorted[Math.floor(sorted.length / 2)] });
  }
  await browser.close();
  console.log(JSON.stringify({ baseUrl, samples, routes: results, scope: "local Chromium navigation timing; warm process; not a deployment benchmark" }, null, 2));
}

void main();
