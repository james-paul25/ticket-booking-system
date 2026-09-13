import { firefox } from "playwright";

(async () => {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(1200);

  const expandBtn = page.locator("text=Click map to browse in full screen");
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    console.log("Clicked expand");
  }
  await page.waitForTimeout(3000);

  await page.screenshot({ path: "scripts/after_expand_debug.png" });

  const hasOriginSelect = await page.locator("#origin-pier-select").count();
  console.log("#origin-pier-select count:", hasOriginSelect);

  const originVisible = await page.locator("#origin-pier-select").isVisible();
  console.log("#origin-pier-select visible:", originVisible);

  if (originVisible) {
    await page.locator("#origin-pier-select").click();
    await page.waitForTimeout(400);

    const tubigon = page.locator('[data-testid="pier-option-tubigon"]');
    console.log("Tubigon option count:", await tubigon.count());
    await tubigon.click();
    await page.waitForTimeout(600);

    // Click cebu in destination
    const cebu = page.locator('[data-testid="pier-option-cebu-pier-1"]').last();
    console.log("Cebu option visible:", await cebu.isVisible());
    await cebu.click({ force: true });
    console.log("Selected Cebu!");
    await page.waitForTimeout(2000);

    // Check modal
    const modal = page.locator("div[role='dialog']:has-text('Choose Sailing Date & Departures')");
    console.log(">>> Is Sailing Date Modal visible?:", await modal.isVisible());

    await page.screenshot({ path: "scripts/route_stroke_path_unobscured.png" });
  }

  await browser.close();
})();
