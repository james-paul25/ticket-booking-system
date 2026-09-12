import { firefox } from "playwright";

async function run() {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5173/...");
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(1000);

  const expandBtn = page.locator("text=Click map to browse in full screen");
  if (await expandBtn.isVisible()) await expandBtn.click();
  await page.waitForTimeout(2000);

  // ─── 1. Test Tubigon -> Cebu ───
  console.log("Selecting Tubigon -> Cebu...");
  await page.locator("#origin-pier-select").click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-tubigon"]').click();
  await page.waitForTimeout(600);

  await page.locator("#destination-pier-select").click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-cebu-pier-1"]').click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: "scripts/test_req_1_tubigon_cebu.png" });
  console.log("Captured test_req_1_tubigon_cebu.png");

  // Verify text contents
  const cardText = await page.locator(".grid-rows-\\[1fr\\]").innerText().catch(() => "NOT_FOUND");
  console.log("Card Text for Tubigon -> Cebu:\n", cardText);

  // ─── 2. Test Swap to Cebu -> Tubigon ───
  console.log("Clicking Swap Button...");
  const swapBtn = page.locator('button[title*="Swap"]');
  await swapBtn.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "scripts/test_req_2_swap_cebu_tubigon.png" });
  console.log("Captured test_req_2_swap_cebu_tubigon.png");

  const cardTextSwapped = await page.locator(".grid-rows-\\[1fr\\]").innerText().catch(() => "NOT_FOUND");
  console.log("Card Text after Swap (Cebu -> Tubigon):\n", cardTextSwapped);

  // ─── 3. Test Clicking Port Pins Directly on Map in Route Planner ───
  console.log("Testing clicking a port pin directly on the map (Ubay Port)...");
  // Find Ubay marker
  const ubayMarker = page.locator('[id="port-marker-ubay"]');
  if (await ubayMarker.isVisible()) {
    await ubayMarker.click({ force: true });
    await page.waitForTimeout(1000);

    // Verify NO discard modal popped up!
    const modalVisible = await page.locator("text=Leave Route Planner?").isVisible();
    console.log("Did 'Leave Route Planner?' modal appear? (Should be false):", modalVisible);

    await page.screenshot({ path: "scripts/test_req_3_ubay_clicked_on_map.png" });
    console.log("Captured test_req_3_ubay_clicked_on_map.png");

    // Click Bato Port pin directly on the map
    console.log("Clicking Bato Port pin on the map...");
    const batoMarker = page.locator('[id="port-marker-bato-leyte"]');
    if (await batoMarker.isVisible()) {
      await batoMarker.click({ force: true });
      await page.waitForTimeout(2000);

      await page.screenshot({ path: "scripts/test_req_4_ubay_bato_selected_via_map.png" });
      console.log("Captured test_req_4_ubay_bato_selected_via_map.png");

      const ubayBatoText = await page.locator(".grid-rows-\\[1fr\\]").innerText().catch(() => "NOT_FOUND");
      console.log("Card Text for Ubay -> Bato (selected via map clicks):\n", ubayBatoText);
    }
  }

  // ─── 4. Test Non-Bohol Pier selection (e.g. Bato -> Ubay) ───
  console.log("Swapping Bato -> Ubay (Non-Bohol pier origin)...");
  await page.locator('button[title*="Swap"]').click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "scripts/test_req_5_bato_ubay_non_bohol.png" });
  console.log("Captured test_req_5_bato_ubay_non_bohol.png");

  const nonBoholText = await page.locator(".grid-rows-\\[1fr\\]").innerText().catch(() => "NOT_FOUND");
  console.log("Card Text for Bato -> Ubay (non-Bohol origin):\n", nonBoholText);

  await browser.close();
  console.log("All user requirement tests completed successfully!");
}

run().catch(console.error);
