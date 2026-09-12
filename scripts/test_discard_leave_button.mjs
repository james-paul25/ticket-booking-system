import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // First go to the home page (the map) so history entry exists
  console.log("1. Going to home page (the map)...");
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(1000);

  // Now navigate to seat selection (just like triggerCabinTransition does)
  console.log("2. Navigating to seat selection with state...");
  await page.evaluate(() => {
    window.history.pushState({ transitionFromMap: true }, "", "/schedules/voyage-tubigon-cebu-2026-09-13/seats");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  // Or direct goto
  await page.goto("http://localhost:5173/schedules/voyage-tubigon-cebu-2026-09-13/seats");
  await page.waitForTimeout(1200);

  console.log("Current URL:", page.url());

  // Select seat 5E
  const seat = page.locator("g.cursor-pointer").nth(4);
  await seat.click();
  console.log("3. Selected seat 5E");
  await page.waitForTimeout(400);

  // Click Close button X
  const closeBtn = page.locator("button[aria-label='Close seat selection']");
  await closeBtn.click();
  console.log("4. Clicked Close button");
  await page.waitForTimeout(400);

  // Verify DirtyFormsModal
  const dirtyModal = page.locator("[role='alertdialog']");
  const modalVisible = await dirtyModal.isVisible();
  console.log("DirtyFormsModal visible?:", modalVisible);

  // Click Discard & Leave
  const discardBtn = page.locator("button:has-text('Discard & Leave')");
  await discardBtn.click();
  console.log("5. Clicked Discard & Leave button!");
  await page.waitForTimeout(1200);

  console.log("6. URL after Discard & Leave:", page.url());
  const returnedToMap = !page.url().includes("/seats");
  console.log(">>> Successfully returned to map?:", returnedToMap);

  await page.screenshot({ path: "scripts/after_discard_returned_to_map.png" });

  await browser.close();
})();
