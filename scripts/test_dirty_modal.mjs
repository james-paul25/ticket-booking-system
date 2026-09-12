import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  
  // Listen to beforeunload dialogs
  page.on("dialog", async (dialog) => {
    console.log("Dialog triggered:", dialog.type(), dialog.message());
    await dialog.dismiss();
  });

  await page.goto("http://localhost:5173/schedules/voyage-port-port-2026-09-12/seats");
  await page.waitForTimeout(1000);

  // Take initial screenshot
  await page.screenshot({ path: "scripts/dirty_test_1_initial.png" });

  // Click seat 5E
  const seatLocator = page.locator("g.cursor-pointer").nth(4);
  await seatLocator.click();
  await page.waitForTimeout(600);

  await page.screenshot({ path: "scripts/dirty_test_2_seat_clicked.png" });

  // Click the close button
  const closeBtn = page.locator("button[aria-label='Close seat selection']");
  await closeBtn.click();
  await page.waitForTimeout(600);

  const dirtyModal = page.locator("[role='alertdialog']");
  const modalVisible = await dirtyModal.isVisible();
  console.log("Is DirtyFormsModal visible?", modalVisible);

  await page.screenshot({ path: "scripts/dirty_test_3_after_close.png" });

  // Test beforeunload: reload page when dirty
  // Re-select seat if discarded or unmounted
  console.log("Current URL:", page.url());

  await browser.close();
})();
