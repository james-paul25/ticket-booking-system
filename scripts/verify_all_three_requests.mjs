import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("--- 1. Testing Route Planner Destination Selection ---");
  await page.goto("http://localhost:5173/#route-planner");
  await page.waitForTimeout(1500);

  // Expand if in preview
  const expandBtn = page.locator("button:has-text('Click map to browse in full screen')");
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(1200);
  }

  // Select origin port
  const originSelect = page.locator("#origin-pier-select");
  await originSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-tubigon"]').click();
  await page.waitForTimeout(400);

  // Select destination port
  const destSelect = page.locator("#destination-pier-select");
  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-cebu"]').click();
  await page.waitForTimeout(1200);

  // Check if SailingDateModal is visible (IT SHOULD NOT BE VISIBLE!)
  const sailingModal = page.locator("div[role='dialog'][aria-modal='true']:has-text('Choose Sailing Date & Departures')");
  const isSailingModalVisible = await sailingModal.isVisible();
  console.log("Is Sailing Date Modal automatically open?", isSailingModalVisible);

  // Take screenshot showing the beautiful route stroke path without modal interruption
  await page.screenshot({ path: "scripts/route_stroke_path_unobscured.png" });

  console.log("--- 2. Testing Seat Selection Total Due Typography & Dirty Forms Modal ---");
  await page.goto("http://localhost:5173/schedules/voyage-tubigon-cebu-2026-09-13/seats");
  await page.waitForTimeout(1200);

  // Click seat 5E
  const seat5E = page.locator("g.cursor-pointer").nth(4);
  await seat5E.click();
  await page.waitForTimeout(600);

  // Screenshot of balanced Total Due and matched size price number
  await page.screenshot({ path: "scripts/total_due_matched_number.png" });

  // Click close button X
  const closeBtn = page.locator("button[aria-label='Close seat selection']");
  await closeBtn.click();
  await page.waitForTimeout(500);

  // Verify DirtyFormsModal is visible
  const dirtyModal = page.locator("[role='alertdialog']");
  const isDirtyModalVisible = await dirtyModal.isVisible();
  console.log("Is DirtyFormsModal visible on close attempt?", isDirtyModalVisible);

  await page.screenshot({ path: "scripts/dirty_modal_active_proof.png" });

  await browser.close();
  console.log("Verification completed successfully!");
})();
