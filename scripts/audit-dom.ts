import { chromium } from "@playwright/test";

const baseUrl = process.env.PROGRAM_HARBOR_BASE_URL || "http://localhost:3000";
const routes = ["/", "/admin", "/admin/forms", "/evaluator", "/portal", "/cfp", "/schedule", "/speakers", "/api/docs"];

async function main() {
  const browser = await chromium.launch();
  const results: Array<Record<string, unknown>> = [];
  let failed = false;

  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: route === "/schedule" || route === "/portal" ? 390 : 1280, height: 900 } });
    const consoleErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const audit = await page.evaluate(() => {
      const missingAlt = Array.from(document.querySelectorAll("img:not([alt])")).length;
      const unnamedControls = Array.from(document.querySelectorAll("button, a, input, select, textarea")).filter((element) => {
        if (element instanceof HTMLInputElement && ["hidden", "checkbox", "radio"].includes(element.type)) return false;
        const label = element.getAttribute("aria-label") || element.getAttribute("title") || (element as HTMLInputElement).labels?.[0]?.textContent || element.textContent;
        return !label?.trim();
      }).length;
      const ids = Array.from(document.querySelectorAll("[id]"), (element) => element.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      return { missingAlt, unnamedControls, duplicateIds: [...new Set(duplicateIds)], bodyWidth: document.body.scrollWidth, viewportWidth: window.innerWidth };
    });
    const routeFailed = audit.missingAlt > 0 || audit.unnamedControls > 0 || audit.duplicateIds.length > 0 || audit.bodyWidth > audit.viewportWidth + 2 || consoleErrors.length > 0;
    if (routeFailed) failed = true;
    results.push({ route, ...audit, consoleErrors });
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify({ baseUrl, routes: results, status: failed ? "FAIL" : "PASS" }, null, 2));
  if (failed) process.exitCode = 1;
}

void main();
