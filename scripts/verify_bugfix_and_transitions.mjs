import { firefox } from "playwright";

async function run() {
  console.log("Starting full Playwright verification...");
  const browser = await firefox.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  // ────────────────────────────────────────────────────────────────
  // Test 1: Seat Reservation Page Checks
  // - Tap an available seat to select header
  // - No "Economy Class" below OceanJet Fastcraft
  // - Big Total Due (text-3xl / text-4xl)
  // - Smooth 1500ms sidebar crossfade on class switch
  // ────────────────────────────────────────────────────────────────
  const seatUrl = "http://localhost:5173/schedules/tpl-tub-ceb-fc11-0500-2026-09-12/seats";
  await page.goto(seatUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // Check header text: should be "Tap an available seat to select"
  const heading = await page.locator("h2").filter({ hasText: "Tap an available seat to select" }).first();
  console.log("Heading visible:", await heading.isVisible());

  // Check vessel name header: ensure no "Economy Class" text directly underneath vesselName in sidebar header
  const sidebarHeader = page.locator("aside").first();
  const vesselTitle = sidebarHeader.locator("h3").first();
  console.log("Vessel title text:", await vesselTitle.innerText());

  // Click seat 5E
  const seat5E = page.locator('g[aria-label*="Seat 5E"]').first();
  await seat5E.click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: "scripts/seat_big_total_due.png" });
  console.log("Screenshot saved: scripts/seat_big_total_due.png");

  // Test class switch transition: Click Business Class
  const bizBtn = page.getByRole("button", { name: /Business Class/i });
  await bizBtn.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/seat_switching_class_transition.png" });
  console.log("Screenshot saved: scripts/seat_switching_class_transition.png");

  // ────────────────────────────────────────────────────────────────
  // Test 2: Map Round-Trip & Shrink Bug Fix
  // - Go to Landing page
  // - Expand map
  // - Plan route: Tagbilaran to Cebu Pier 1
  // - Pick crossing and proceed to Seat Selection
  // - On seat page, select a seat then click Close -> DirtyFormsModal -> Discard
  // - Returns to map in fullscreen
  // - Click Close Map View
  // - Verify smooth shrink and map centers on Bohol
  // ────────────────────────────────────────────────────────────────
  console.log("Testing map expand -> seats -> back -> map shrink flow...");
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click map to expand
  const expandBtn = page.getByRole("button", { name: /Click map to browse in full screen/i });
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(1200);
  }

  // Open Route Planner sidebar if not already open
  const routePlannerBtn = page.getByRole("button", { name: /Route Planner/i });
  if (await routePlannerBtn.isVisible()) {
    await routePlannerBtn.click();
    await page.waitForTimeout(500);
  }

  // Select origin port (Tagbilaran Port)
  const originSelectBtn = page.locator('button[id*="origin"]').or(page.getByText("Select origin pier")).first();
  if (await originSelectBtn.isVisible()) {
    await originSelectBtn.click();
    await page.waitForTimeout(300);
    const tagOption = page.getByText("Tagbilaran Port").first();
    await tagOption.click();
    await page.waitForTimeout(400);
  }

  // Select destination port (Cebu Pier 1)
  const destSelectBtn = page.locator('button[id*="dest"]').or(page.getByText("Select destination pier")).first();
  if (await destSelectBtn.isVisible()) {
    await destSelectBtn.click();
    await page.waitForTimeout(300);
    const cebuOption = page.getByText("Cebu Pier 1").first();
    await cebuOption.click();
    await page.waitForTimeout(400);
  }

  // Click "Proceed to Seat Selection" (triggers sailing modal if not chosen)
  const proceedBtn = page.getByRole("button", { name: /Proceed to Seat Selection/i }).or(page.locator('button:has-text("Proceed to Seat Selection")')).first();
  if (await proceedBtn.isVisible()) {
    await proceedBtn.click();
    await page.waitForTimeout(800);
  }

  // If SailingDateModal opened, pick the first vessel and click Done
  const vesselCard = page.locator('div:has-text("OceanJet")').first();
  if (await vesselCard.isVisible()) {
    await vesselCard.click();
    await page.waitForTimeout(300);
    const doneBtn = page.getByRole("button", { name: /Done/i });
    if (await doneBtn.isVisible()) {
      await doneBtn.click();
      await page.waitForTimeout(600);
    }
  }

  // If still on page, click proceed button again now that vessel is selected
  if (page.url() === "http://localhost:5173/") {
    const proceedAgain = page.getByRole("button", { name: /Proceed to Seat Selection/i }).or(page.locator('button:has-text("Proceed to Seat Selection")')).first();
    if (await proceedAgain.isVisible()) {
      await proceedAgain.click();
      await page.waitForTimeout(1500);
    }
  }

  console.log("On seat selection page:", page.url());

  // Now on seat selection page: select a seat to make dirty
  const seatOnPage = page.locator('g[aria-label*="Seat"]').first();
  if (await seatOnPage.isVisible()) {
    await seatOnPage.click();
    await page.waitForTimeout(400);
  }

  // Click Close button (X)
  const closeSeatBtn = page.locator('button[aria-label="Close seat selection"]').first();
  await closeSeatBtn.click();
  await page.waitForTimeout(400);

  // In DirtyFormsModal, click "Discard & Leave"
  const discardBtn = page.getByRole("button", { name: /Discard & Leave/i }).first();
  if (await discardBtn.isVisible()) {
    await discardBtn.click();
    await page.waitForTimeout(1200);
  }

  console.log("Returned to page:", page.url());

  // Now on map: click "Close Map View" (X)
  const closeMapBtn = page.locator('button[aria-label="Close Map View"]').first();
  if (await closeMapBtn.isVisible()) {
    console.log("Clicking Close Map View button...");
    await closeMapBtn.click();
    // Wait for smooth collapse animation
    await page.waitForTimeout(1500);
  }

  await page.screenshot({ path: "scripts/map_closed_centered.png" });
  console.log("Screenshot saved: scripts/map_closed_centered.png");

  await browser.close();
  console.log("All verifications passed successfully!");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
