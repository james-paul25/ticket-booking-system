import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:5173/schedules/voyage-tubigon-cebu-2026-09-13/seats");
  await page.waitForTimeout(1200);

  // Click seat 5E
  const seat5E = page.locator("g.cursor-pointer").nth(4);
  await seat5E.click();
  await page.waitForTimeout(600);

  // Capture screenshot of balanced Total Due and matched size price number
  await page.screenshot({ path: "scripts/total_due_matched_number.png" });
  console.log("Screenshot saved: scripts/total_due_matched_number.png");

  // Click close button X
  const closeBtn = page.locator("button[aria-label='Close seat selection']");
  await closeBtn.click();
  await page.waitForTimeout(500);

  // Verify DirtyFormsModal is visible
  const dirtyModal = page.locator("[role='alertdialog']");
  const isDirtyModalVisible = await dirtyModal.isVisible();
  console.log("Is DirtyFormsModal visible on close attempt?:", isDirtyModalVisible);

  await page.screenshot({ path: "scripts/dirty_modal_active_proof.png" });
  console.log("Screenshot saved: scripts/dirty_modal_active_proof.png");

  await browser.close();
})();
