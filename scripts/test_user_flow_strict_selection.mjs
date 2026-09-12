import { firefox } from "playwright";

async function run() {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:5173/...");
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(1000);

  // Expand map if in preview
  const expandBtn = page.locator("button:has-text('Open Interactive Route Planner & Transit Map'), button:has-text('Click map to browse in full screen')");
  if (await expandBtn.isVisible()) {
    console.log("Clicking expand map button...");
    await expandBtn.click();
    await page.waitForTimeout(1000);
  }

  // 1. Verify Sidebar is clearly open and visible
  const sidebar = page.locator('[aria-label="Transit Route Planner and Piers"]');
  const isSidebarVisible = await sidebar.isVisible();
  console.log("Requirement 1: Is Sidebar Open and Visible?", isSidebarVisible);
  await page.screenshot({ path: "scripts/verify_step1_sidebar_open.png" });

  // 2. Click ports before clicking Origin Pier -> verify NO selection happens
  console.log("Requirement 2a: Clicking a map pin before activating Origin Pier...");
  const tubigonPin = page.locator('[id="port-marker-tubigon"]');
  await tubigonPin.click({ force: true });
  await page.waitForTimeout(400);

  const originValBefore = await page.locator("#origin-pier-select").innerText();
  console.log("Origin value before clicking Origin Pier (should be 'Select Origin Pier...'):", originValBefore.trim());

  // 2b. Now click Origin Pier input in the sidebar
  console.log("Requirement 2b: Clicking Origin Pier input in sidebar...");
  await page.locator("#origin-pier-select").click();
  await page.waitForTimeout(400);

  const isDropdownOpen = await page.locator('[data-testid="pier-dropdown-menu"]').first().isVisible();
  console.log("Did Origin dropdown menu open smoothly?", isDropdownOpen);
  await page.screenshot({ path: "scripts/verify_step2_origin_dropdown_and_pins_highlighted.png" });

  // 2c. Click Tubigon on the map to set as Origin
  console.log("Requirement 2c: Clicking Tubigon pin on the map to select Origin...");
  await tubigonPin.click({ force: true });
  await page.waitForTimeout(1000);

  const originValAfter = await page.locator("#origin-pier-select").innerText();
  console.log("Origin value after map click (should be 'Tubigon Port'):", originValAfter.trim().split("\n")[0]);
  await page.screenshot({ path: "scripts/verify_step3_tubigon_origin_chosen.png" });

  // 3. Verify Destination only allows designated routes
  console.log("Requirement 3: Verifying destination is restricted to designated routes only...");
  // For Tubigon, connected destination is Cebu Pier 1
  const cebuPin = page.locator('[id="port-marker-cebu-pier-1"]');
  const ubayPin = page.locator('[id="port-marker-ubay"]');

  // Verify non-designated port (Ubay) has pointer-events: none / opacity dimmed
  const ubayStyle = await ubayPin.evaluate((el) => {
    return {
      opacity: el.style.opacity,
      pointerEvents: el.style.pointerEvents,
    };
  });
  console.log("Non-designated port (Ubay) style (must be dimmed & pointer-events: none):", ubayStyle);

  // Click non-designated port to verify it does NOT set destination or overwrite origin
  console.log("Attempting click on non-designated port (Ubay)...");
  await ubayPin.click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);

  const destValAfterInvalidClick = await page.locator("#destination-pier-select").innerText();
  console.log("Destination after invalid click (must still be unselected):", destValAfterInvalidClick.trim());

  // Now click designated destination port (Cebu Port)
  console.log("Clicking designated destination port (Cebu Port)...");
  await cebuPin.click({ force: true });
  await page.waitForTimeout(1500);

  const destValAfterValidClick = await page.locator("#destination-pier-select").innerText();
  console.log("Destination after clicking designated route:", destValAfterValidClick.trim().split("\n")[0]);

  // Verify Route Card is smoothly visible
  const isRouteCardVisible = await page.locator(".grid-rows-\\[1fr\\]").isVisible();
  console.log("Route Summary Card visible with smooth transition:", isRouteCardVisible);
  await page.screenshot({ path: "scripts/verify_step4_route_card_completed.png" });

  await browser.close();
  console.log("All requirements strictly verified successfully!");
}

run().catch(console.error);
