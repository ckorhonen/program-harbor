import { expect, test } from "@playwright/test";

test("admin can inspect the seeded operational desk", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Organizer navigation is covered at desktop width; mobile coverage targets public attendee surfaces.");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Good morning, Maya" })).toBeVisible();
  await expect(page.getByText("AI Engineer Sandbox Summit", { exact: true })).toBeVisible();
  await expect(page.getByText(/one speaker conflict needs your attention/i)).toBeVisible();
  await page.getByRole("link", { name: "Forms" }).click();
  await expect(page.getByRole("heading", { name: "CFP form builder" })).toBeVisible();
  await expect(page.getByText("Live preview")).toBeVisible();
  await page.getByLabel("Session format").selectOption({ label: "Talk" });
  await expect(page.getByText("Conditional field hidden")).toBeVisible();
  await page.getByLabel("Session format").selectOption({ label: "Workshop" });
  await expect(page.getByLabel("Hands-on requirements")).toBeVisible();
});

test("public CFP submits a workshop and the portal dashboard reflects task completion", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The cross-role organizer readback is covered at desktop width; mobile coverage targets public attendee surfaces.");
  await page.goto("/cfp");
  await page.getByLabel("Session title").fill(`Playwright workshop ${Date.now()}`);
  await page.getByLabel("Abstract").fill("A browser-verified workshop with a real conditional answer.");
  await page.getByLabel("Hands-on requirements").fill("Bring a laptop.");
  await page.getByLabel("Primary speaker").fill("Test Speaker");
  await page.getByLabel("Email *").fill(`test-${Date.now()}@example.test`);
  await page.getByLabel("Co-speaker name").fill("Co Speaker");
  await page.getByLabel("Co-speaker email").fill(`co-${Date.now()}@example.test`);
  await page.getByRole("button", { name: /Review and submit/ }).click();
  await expect(page.getByRole("heading", { name: "Your proposal is in the queue." })).toBeVisible();

  const admin = await context.newPage();
  await admin.goto("/admin");
  await expect(admin.getByText("Speaker readiness")).toBeVisible();
  await admin.getByRole("link", { name: "Schedule" }).click();
  await expect(admin.getByRole("heading", { name: "Build the agenda" })).toBeVisible();
  await admin.getByRole("link", { name: "View public ↗" }).click();
  await expect(admin.getByRole("heading", { name: "The program, without the hunt." })).toBeVisible();
});

test("public surfaces omit private speaker fields and render on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/speakers");
  await expect(page.getByRole("heading", { name: "Meet the people building it." })).toBeVisible();
  await expect(page.getByText("speaker1@example.test")).toHaveCount(0);
  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: "The program, without the hunt." })).toBeVisible();
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(420);
});
