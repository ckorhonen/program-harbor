import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const baseUrl = process.env.PROGRAM_HARBOR_BASE_URL || "https://program-harbor.sourcebottle.workers.dev";
const outputDir = "artifacts/walkthrough";
mkdirSync(outputDir, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outputDir, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const video = page.video();

  async function caption(message: string, wait = 1_400) {
    await page.evaluate((text) => {
      const existing = document.getElementById("program-harbor-walkthrough-caption");
      existing?.remove();
      const element = document.createElement("div");
      element.id = "program-harbor-walkthrough-caption";
      element.textContent = text;
      Object.assign(element.style, {
        position: "fixed",
        left: "24px",
        bottom: "24px",
        zIndex: "2147483647",
        padding: "12px 16px",
        borderRadius: "999px",
        background: "rgba(12, 42, 48, .94)",
        color: "#d6f8df",
        font: "600 14px system-ui, sans-serif",
        boxShadow: "0 8px 30px rgba(12, 42, 48, .24)",
      });
      document.body.appendChild(element);
    }, message);
    await page.waitForTimeout(wait);
  }

  async function open(path: string, message: string, heading?: string) {
    await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
    if (heading) await page.getByRole("heading", { name: heading }).waitFor({ state: "visible", timeout: 12_000 });
    await caption(message);
  }

  await open("/", "Program Harbor · live Cloudflare Worker + D1 persistence", "Move every speaker from proposal to program.");
  await open("/admin", "Organizer dashboard · overdue work, readiness, and seeded conflicts", "Good morning, Maya");
  await open("/admin/settings", "Event configuration · timezone, tracks, rooms, and public identity", "Event settings");
  await caption("Event identity feeds the CFP, schedule, routing, and public program surfaces.");
  await open("/admin/forms", "Conditional CFP logic · Talk hides logistics; Workshop reveals the required answer", "CFP form builder");
  await page.getByLabel("Session format").selectOption({ label: "Talk" });
  await page.getByText("Conditional field hidden").waitFor({ state: "visible" });
  await page.getByLabel("Session format").selectOption({ label: "Workshop" });
  await page.getByLabel("Hands-on requirements").waitFor({ state: "visible" });
  await caption("The rule is enforced in the UI and again by the server.");

  await open("/cfp", "Public CFP · routed submission with speaker and co-speaker details", "Put a useful idea on the program.");
  await page.getByLabel("Session title").fill("Walkthrough: dependable agent systems");
  await page.getByLabel("Abstract").fill("A practical live walkthrough of dependable agent systems.");
  await page.getByLabel("Hands-on requirements").fill("Bring a laptop and a test harness.");
  await page.getByLabel("Primary speaker").fill("Walkthrough Speaker");
  await page.getByLabel("Email *").fill("walkthrough@example.test");
  await page.getByLabel("Co-speaker name").fill("Second Speaker");
  await page.getByLabel("Co-speaker email").fill("second@example.test");
  await page.getByRole("button", { name: /Review and submit/ }).click();
  await page.getByRole("heading", { name: "Your proposal is in the queue." }).waitFor({ state: "visible", timeout: 12_000 });
  await caption("Submission accepted into the review queue; no email is sent in demo mode.");

  await open("/admin/submissions", "Submission management · routing, review progress, and human status decisions", "Submission queue");
  await open("/evaluator", "Evaluator desk · assigned rubric, weighted scoring, and abstention boundary", "Review desk");
  for (let index = 0; index < 5; index += 1) {
    const select = page.locator(`#score-${index}`);
    if (await select.count()) await select.selectOption("4");
  }
  const saveReview = page.getByRole("button", { name: "Save review" });
  if (await saveReview.count()) await saveReview.click();
  await caption("Human review stays separate from the organizer’s accept or waitlist decision.");

  await open("/portal", "Speaker portal · scoped profile, task list, and private file metadata", "Welcome, Ava.");
  const saveProfile = page.getByRole("button", { name: "Save profile" });
  if (await saveProfile.count()) await saveProfile.click();
  await caption("Speaker changes are scoped to the current speaker and flow back to organizer state.");

  await open("/admin/schedule", "Agenda builder · canonical schedule, keyboard editing, conflict summary, and ICS", "Build the agenda");
  const firstSession = page.getByText("Threat modeling for agentic workflows", { exact: true });
  if (await firstSession.count()) await firstSession.click();
  await caption("Conflicts remain visible, override reasons are audited, and calendar output comes from the same schedule.");

  await open("/admin/communications", "Communications · preview-only templates and safe reminder scheduling", "Clear, timely messages");
  const previewMessage = page.getByRole("button", { name: "Preview message" });
  if (await previewMessage.count()) await previewMessage.click();
  await caption("Templates render against event context without sending to an unapproved recipient.");

  await open("/admin/integrations", "Integrations · observable Accelevents emulator dry-run with no external writes", "External systems, visible state");
  const dryRun = page.getByRole("button", { name: "Run dry-run diff" });
  if (await dryRun.count()) await dryRun.click();
  await caption("The emulator reports a diff and clearly marks live provider sync as unconfigured.");

  await open("/schedule", "Public schedule · responsive published agenda in the event timezone", "The program, without the hunt.");
  await open("/speakers", "Public gallery · publishable speaker fields only", "Meet the people building it.");
  await open("/api/docs", "Developer surface · OpenAPI 3.1, stable IDs, pagination, and public/private serializers", "A small API for the program.");

  await page.evaluate(async (url) => { await fetch(`${url}/api/reset`, { method: "POST" }); }, baseUrl);
  await caption("Walkthrough complete · remote D1 restored to the known seed state.", 1_800);
  await context.close();
  await browser.close();
  console.log(JSON.stringify({ baseUrl, video: video ? await video.path() : null }, null, 2));
}

void main();
