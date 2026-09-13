import { firefox } from "playwright";

async function run() {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(1000);

  const expandBtn = page.locator("text=Click map to browse in full screen");
  if (await expandBtn.isVisible()) await expandBtn.click();
  await page.waitForTimeout(2000);

  // 1. Select Origin: Tubigon Port (via dropdown)
  console.log("Step 1: Select Tubigon as Origin");
  await page.locator("#origin-pier-select").click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-tubigon"]').click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: "scripts/test_flow_1_tubigon_selected_dest_highlight.png" });
  console.log("Captured test_flow_1_tubigon_selected_dest_highlight.png");

  // Check if Cebu Pier 1 marker has the highlighted destination styling
  const cebuMarkerHtml = await page.locator('[id="port-marker-cebu-pier-1"]').innerHTML();
  console.log("Cebu Marker HTML (should have animate-ping / emerald):", cebuMarkerHtml.includes("animate-ping"));

  // 2. Click Cebu Pier 1 pin directly on map to set Destination
  console.log("Step 2: Click Cebu pin on map");
  await page.locator('[id="port-marker-cebu-pier-1"]').click({ force: true });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "scripts/test_flow_2_cebu_destination_set.png" });
  console.log("Captured test_flow_2_cebu_destination_set.png");

  const routeCardText = await page.locator(".grid-rows-\\[1fr\\]").innerText();
  console.log("Route Card:\n", routeCardText);

  // 3. Click Overview button in header to zoom out map so all ports are in view
  console.log("Step 3: Click Overview button");
  const overviewBtn = page.locator('button:has-text("Overview")');
  if (await overviewBtn.isVisible()) await overviewBtn.click();
  await page.waitForTimeout(1500);

  // 4. Click Ubay Port pin on map
  console.log("Step 4: Click Ubay pin on map (should switch Origin to Ubay without discard modal)");
  await page.locator('[id="port-marker-ubay"]').click({ force: true });
  await page.waitForTimeout(1500);

  const modalAppeared = await page.locator("text=Leave Route Planner?").isVisible();
  console.log("Did discard modal appear? (must be false):", modalAppeared);

  await page.screenshot({ path: "scripts/test_flow_3_ubay_origin_set_via_map.png" });
  console.log("Captured test_flow_3_ubay_origin_set_via_map.png");

  // Check Bato Leyte marker has destination highlight
  const batoMarkerHtml = await page.locator('[id="port-marker-bato-leyte"]').innerHTML();
  console.log("Bato Marker HTML (should have animate-ping / emerald):", batoMarkerHtml.includes("animate-ping"));

  // 5. Click Bato Port pin on map to set Destination
  console.log("Step 5: Click Bato pin on map");
  await page.locator('[id="port-marker-bato-leyte"]').click({ force: true });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "scripts/test_flow_4_ubay_bato_route_set.png" });
  console.log("Captured test_flow_4_ubay_bato_route_set.png");

  const ubayBatoCardText = await page.locator(".grid-rows-\\[1fr\\]").innerText();
  console.log("Ubay -> Bato Route Card:\n", ubayBatoCardText);

  // 6. Swap Ubay <-> Bato (Non-Bohol pier origin test)
  console.log("Step 6: Swap to Bato -> Ubay (Non-Bohol pier origin)");
  await page.locator('button[title*="Swap"]').click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "scripts/test_flow_5_bato_ubay_swapped.png" });
  console.log("Captured test_flow_5_bato_ubay_swapped.png");

  const batoUbayCardText = await page.locator(".grid-rows-\\[1fr\\]").innerText();
  console.log("Bato -> Ubay Route Card:\n", batoUbayCardText);

  await browser.close();
  console.log("Flow test completed!");
}

run().catch(console.error);
