import { firefox } from "playwright";

async function run() {
  console.log("Running final visual test...");
  const browser = await firefox.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  // 1. Check Seat Selection Page
  const seatUrl = "http://localhost:5173/schedules/tpl-tub-ceb-fc11-0500-2026-09-12/seats";
  await page.goto(seatUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Select Seat 5E
  const seat5E = page.locator('g[aria-label*="Seat 5E"]').first();
  await seat5E.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: "scripts/seat_final_balanced_total_due.png" });
  console.log("Screenshot saved: scripts/seat_final_balanced_total_due.png");

  // 2. Test map shrink from fullscreen back to embedded
  console.log("Testing map expand and close...");
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click map to expand
  const expandBtn = page.getByRole("button", { name: /Click map to browse in full screen/i });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(1200);
  }

  // Close map
  const closeMapBtn = page.locator('button[aria-label="Close Map View"]').first();
  if (await closeMapBtn.isVisible()) {
    await closeMapBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.screenshot({ path: "scripts/map_final_closed_centered.png" });
  console.log("Screenshot saved: scripts/map_final_closed_centered.png");

  await browser.close();
  console.log("Final visual test completed successfully!");
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
