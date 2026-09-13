import { firefox } from "playwright";

async function run() {
  console.log("Starting Playwright visual verification...");
  const browser = await firefox.launch();
  
  // Test on standard laptop 1366x768 (checking no-scroll behavior)
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  // 1. Navigate to FastCat Tubigon to Cebu
  const urlFastCat = "http://localhost:5173/schedules/tpl-tub-ceb-fc11-0500-2026-09-12/seats";
  await page.goto(urlFastCat, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Check FastCat Economy Class overview
  await page.screenshot({ path: "scripts/seat_step1_overview.png" });
  console.log("Screenshot saved: scripts/seat_step1_overview.png");

  // 2. Select Seat 5E
  const seat5E = page.locator('g[aria-label*="Seat 5E"]').first();
  await seat5E.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: "scripts/seat_step2_selected_card.png" });
  console.log("Screenshot saved: scripts/seat_step2_selected_card.png");

  // 3. Switch to Business Class (should show authentic FastCat Business Class ₱490)
  const bizBtn = page.getByRole("button", { name: /Business Class/i });
  await bizBtn.click();
  await page.waitForTimeout(600);

  // Select a Business Class seat (e.g. J1B)
  const seatJ1B = page.locator('g[aria-label*="Seat J1B"]').first();
  await seatJ1B.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: "scripts/seat_step3_business_class.png" });
  console.log("Screenshot saved: scripts/seat_step3_business_class.png");

  // 4. Test OceanJet Tagbilaran to Cebu (should show Economy ₱800 / Business ₱1,200)
  const urlOceanJet = "http://localhost:5173/schedules/tpl-tag-ceb-oj88-0600-2026-09-12/seats";
  await page.goto(urlOceanJet, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Select seat in OceanJet Economy
  const seatEcoOJ = page.locator('g[aria-label*="Seat 4C"]').first();
  await seatEcoOJ.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "scripts/seat_step4_oceanjet_economy.png" });
  console.log("Screenshot saved: scripts/seat_step4_oceanjet_economy.png");

  // Switch to OceanJet Business Class
  const ojBizBtn = page.getByRole("button", { name: /Business Class/i });
  await ojBizBtn.click();
  await page.waitForTimeout(600);

  const seatBizOJ = page.locator('g[aria-label*="Seat J1B"]').first();
  await seatBizOJ.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "scripts/seat_step5_oceanjet_business.png" });
  console.log("Screenshot saved: scripts/seat_step5_oceanjet_business.png");

  await browser.close();
  console.log("Verification completed successfully!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
