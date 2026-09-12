import { firefox } from "playwright";

(async () => {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Step 1: Go to home page");
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(1000);

  console.log("Step 2: Expand map to fullscreen");
  const expandBtn = page.locator("text=Click map to browse in full screen");
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(2500);
  }

  console.log("Step 3: Select Tubigon -> Cebu");
  await page.locator("#origin-pier-select").click();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="pier-option-tubigon"]').first().click();
  await page.waitForTimeout(500);

  await page.locator('[data-testid="pier-option-cebu-pier-1"]').last().click({ force: true });
  await page.waitForTimeout(1000);

  console.log("Step 4: Select sailing date & departure");
  const schedBtn = page.locator("[aria-label='Choose Sailing Date and Departures']");
  await schedBtn.click();
  await page.waitForTimeout(500);

  // Click first departure option in modal
  const firstDep = page.locator("div[role='dialog'] button:has-text('Select')").first();
  await firstDep.click();
  await page.waitForTimeout(600);

  console.log("Step 5: Click Proceed to Seat Selection");
  const proceedBtn = page.locator("button:has-text('Proceed to Seat Selection')");
  await proceedBtn.click();

  // Wait for seat selection page
  await page.waitForURL(/.*\/seats/, { timeout: 10000 });
  console.log("Step 6: Landed on seat selection page:", page.url());
  await page.waitForTimeout(1000);

  // Click seat 5E
  const seat5E = page.locator("g.cursor-pointer").nth(4);
  await seat5E.click();
  console.log("Step 7: Selected seat 5E");
  await page.waitForTimeout(500);

  // Click Close button X
  const closeBtn = page.locator("button[aria-label='Close seat selection']");
  await closeBtn.click();
  console.log("Step 8: Clicked Close button");
  await page.waitForTimeout(500);

  // Verify DirtyFormsModal
  const dirtyModal = page.locator("[role='alertdialog']");
  console.log("Is DirtyFormsModal visible?:", await dirtyModal.isVisible());

  // Click Discard & Leave
  const discardBtn = page.locator("button:has-text('Discard & Leave')");
  await discardBtn.click();
  console.log("Step 9: Clicked Discard & Leave");
  await page.waitForTimeout(1500);

  console.log("Step 10: Current URL after discard:", page.url());
  const returnedToMap = !page.url().includes("/seats");
  console.log(">>> Successfully returned to map?:", returnedToMap);

  await page.screenshot({ path: "scripts/exact_flow_returned_to_map.png" });

  await browser.close();
  console.log("Test finished successfully!");
})();
