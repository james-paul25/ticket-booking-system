import { firefox } from "playwright";

(async () => {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("1. Navigating to home page...");
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(1000);

  console.log("2. Expanding map...");
  const expandBtn = page.locator("text=Click map to browse in full screen");
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(2500);
  }

  console.log("3. Selecting origin and destination...");
  const originSelect = page.locator("#origin-pier-select");
  const destSelect = page.locator("#destination-pier-select");

  await originSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-tubigon"]').click();
  await page.waitForTimeout(300);

  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-cebu-pier-1"]').click();
  await page.waitForTimeout(800);

  // Set sailing date / schedule if needed or click Proceed
  const scheduleTrigger = page.locator("[aria-label='Choose Sailing Date and Departures']");
  if (await scheduleTrigger.isVisible()) {
    await scheduleTrigger.click();
    await page.waitForTimeout(400);
    // Select first departure
    const firstDeparture = page.locator("button:has-text('Select')").first();
    if (await firstDeparture.isVisible()) {
      await firstDeparture.click();
      await page.waitForTimeout(500);
    }
  }

  // Click proceed / search
  const proceedBtn = page.locator("button:has-text('Proceed to Seat Selection'), button:has-text('Find Trips & Vessels')").first();
  if (await proceedBtn.isVisible()) {
    console.log("Clicking proceed button:", await proceedBtn.innerText());
    await proceedBtn.click();
  }

  // Wait for seat selection page
  await page.waitForURL(/.*\/seats/, { timeout: 10000 });
  console.log("4. Arrived at seat selection page:", page.url());
  await page.waitForTimeout(1000);

  // Select a seat
  const seat5E = page.locator("g.cursor-pointer").nth(4);
  await seat5E.click();
  console.log("5. Selected a seat");
  await page.waitForTimeout(500);

  // Click Close button X
  const closeBtn = page.locator("button[aria-label='Close seat selection']");
  await closeBtn.click();
  console.log("6. Clicked Close button");
  await page.waitForTimeout(500);

  // Verify DirtyFormsModal is open
  const dirtyModal = page.locator("[role='alertdialog']");
  console.log("DirtyFormsModal visible?:", await dirtyModal.isVisible());

  // Click Discard & Leave
  const discardBtn = page.locator("button:has-text('Discard & Leave')");
  await discardBtn.click();
  console.log("7. Clicked 'Discard & Leave'");
  await page.waitForTimeout(1500);

  console.log("8. URL after Discard & Leave:", page.url());
  const isBackOnMap = page.url().includes("seats") === false;
  console.log(">>> Successfully brought back to the map?:", isBackOnMap);

  await page.screenshot({ path: "scripts/after_discard_back_on_map.png" });

  await browser.close();
})();
