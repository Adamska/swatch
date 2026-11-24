import { expect, test, type Page } from "@playwright/test";

async function loadSample(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name }).click();
  await expect(page.getByText("Specimen ready")).toBeVisible();
}

const exportSource = (page: Page) => page.locator("pre").innerText();

test("loads a sample and walks every specimen tab", async ({ page }) => {
  await loadSample(page, "Halcyon Quarterly");
  await expect(page.getByText("Halcyon Quarterly · 11 clusters")).toBeVisible();
  for (const tab of [/Typography/, /Measure/, /Compare/, /Color/]) {
    await page.getByRole("tab", { name: tab }).click();
    await expect(page.getByRole("tabpanel")).toBeVisible();
  }
  await expect(page.getByText("Tonal scales · OKLCH 50 to 950")).toBeVisible();
});

test("lifts contrast, then undoes it with the keyboard", async ({ page }) => {
  await loadSample(page, "Northwind Ledger");
  const before = await exportSource(page);
  await page.getByRole("button", { name: /Lift \d+ to AA/ }).click();
  await expect.poll(() => exportSource(page)).not.toBe(before);
  await page.getByText("Swatch · MIT License").click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect.poll(() => exportSource(page)).toBe(before);
});

test("assigns a palette sample to a role by selecting it", async ({ page }) => {
  await loadSample(page, "Kiln & Clay");
  await page.getByRole("button", { name: /^Select #7d8c6a/ }).click();
  await page.getByRole("button", { name: "Assign #7d8c6a to Primary" }).click();
  await expect(page.locator("pre")).toContainText('DEFAULT: "#7d8c6a"');
});

test("switches schemes and export formats", async ({ page }) => {
  await loadSample(page, "Graphite Shell");
  await page.getByRole("button", { name: /^Light/ }).click();
  await expect(page.getByText("#F8FAFE").first()).toBeVisible();
  await page.getByRole("tab", { name: "shadcn/ui" }).click();
  await expect(page.locator("pre")).toContainText(".dark {");
  await page.getByRole("tab", { name: "Design Tokens" }).click();
  await expect(page.locator("pre")).toContainText('"$type": "color"');
});

test("restores a shared link with its metadata", async ({ page, context, baseURL }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  await loadSample(page, "Northwind Ledger");
  await page.getByRole("button", { name: "Share link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const fresh = await context.newPage();
  await fresh.goto(link);
  await expect(fresh.getByText("Northwind Ledger · 12 clusters")).toBeVisible();
  await expect(fresh).toHaveTitle("Northwind Ledger · Swatch");
});

test("refuses private targets at the API", async ({ request }) => {
  for (const url of ["http://127.0.0.1/", "http://169.254.169.254/latest/meta-data/", "http://localhost:3400/"]) {
    const response = await request.post("/api/extract", { data: { url } });
    expect(response.status()).toBe(403);
    expect((await response.json()).error.code).toBe("blocked_target");
  }
});
