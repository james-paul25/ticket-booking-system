import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto("http://localhost:5173/#route-planner");
  await page.waitForTimeout(1500);

  // Click map or preview button to expand into fullscreen
  const expandBtn = page.locator("button:has-text('Click map to browse in full screen')");
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(1200);
  }

  // Open origin selector
  const originTrigger = page.locator("button:has-text('Select origin port')").first();
  await originTrigger.click();
  await page.waitForTimeout(400);
  // select Tubigon
  await page.locator("button:has-text('Tubigon Port')").first().click();
  await page.waitForTimeout(500);

  // Select destination
  const destTrigger = page.locator("button:has-text('Select destination port')").first();
  await destTrigger.click();
  await page.waitForTimeout(400);
  // select Cebu
  await page.locator("button:has-text('Cebu Pier 1 / Pier 5')").first().click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "scripts/map_discard_test_step1.png" });

  // Close the sailing date modal if it opened, or press Escape
  const sailingModalClose = page.locator("button[aria-label='Close departure selection dialog']");
  if (await sailingModalClose.isVisible()) {
    console.log("Sailing date modal popped up! Closing it to test map exit...");
    await sailingModalClose.click();
    await page.waitForTimeout(500);
  }

  // Press Escape to request exit
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  const discardDialog = page.locator("[role='dialog']:has-text('Discard Booking Selection?')");
  const isDiscardVisible = await discardDialog.isVisible();
  console.log("Is Map Discard Modal Visible after Escape?", isDiscardVisible);

  await page.screenshot({ path: "scripts/map_discard_modal_test.png" });

  await browser.close();
})();
