import { firefox } from "playwright";

async function runTest() {
  console.log("Launching Firefox for End-to-End Verification...");
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const artifactDir = "C:\\Users\\codew\\.gemini\\antigravity-ide\\brain\\61e9225a-2f4c-4e1c-a934-82a39f3a710e";

  try {
    console.log("1. Navigating to http://localhost:5173/...");
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Click to expand map to interactive fullscreen mode
    console.log("2. Expanding map to interactive fullscreen mode...");
    const expandBtn = page.locator('text=Click map to browse in full screen');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
    } else {
      await page.locator('canvas.maplibregl-canvas').click({ position: { x: 400, y: 300 } });
    }
    await page.waitForTimeout(2500);

    // Wait for fullscreen sidebar to appear
    console.log("3. Waiting for fullscreen sidebar to appear...");
    const routePlannerTab = page.locator("button:has-text('Route Planner')");
    await routePlannerTab.waitFor({ state: "visible", timeout: 8000 });

    // Verify Route Summary Card is NOT visible initially
    const summaryCardVisibleInitial = await page.evaluate(() => {
      const card = document.querySelector(".grid.transition-all.duration-300");
      if (!card) return false;
      const rect = card.getBoundingClientRect();
      const style = window.getComputedStyle(card);
      return style.opacity !== "0" && rect.height > 10;
    });
    console.log(`Initial Route Summary Card visible: ${summaryCardVisibleInitial} (Must be false)`);
    if (summaryCardVisibleInitial) {
      throw new Error("FAIL: Route Summary Card is visible on fresh open!");
    }

    // 4. Select Origin Pier: Tubigon
    console.log("4. Selecting Origin: Tubigon Port...");
    const originSelect = page.locator('#origin-pier-select');
    await originSelect.click();
    await page.waitForTimeout(400);
    const tubigonOption = page.locator('#origin-pier-select ~ div [data-testid="pier-option-tubigon"]');
    await tubigonOption.click();
    await page.waitForTimeout(600);

    // 5. Select Destination Pier: Cebu Pier 1 / Pier 5
    console.log("5. Selecting Destination: Cebu Pier 1 / Pier 5...");
    const destSelect = page.locator('#destination-pier-select');
    await destSelect.click();
    await page.waitForTimeout(400);
    const cebuOption = page.locator('#destination-pier-select ~ div [data-testid="pier-option-cebu-pier-1"]');
    await cebuOption.click();
    await page.waitForTimeout(800);

    // 6. Verify that Route Summary Card is STILL HIDDEN because timetable has not been confirmed!
    const summaryCardVisibleBeforeSchedule = await page.evaluate(() => {
      const card = document.querySelector(".grid.transition-all.duration-300");
      if (!card) return false;
      const rect = card.getBoundingClientRect();
      const style = window.getComputedStyle(card);
      return style.opacity !== "0" && rect.height > 10;
    });
    console.log(`Summary card visible before timetable confirmed: ${summaryCardVisibleBeforeSchedule} (Must be false)`);
    if (summaryCardVisibleBeforeSchedule) {
      throw new Error("FAIL: Route Summary Card is visible before timetable was confirmed!");
    }
    console.log("PASS: Route Summary Card is correctly hidden before timetable is set.");

    // 7. Open Sailing Date & Timetable modal
    console.log("7. Opening Sailing Date & Timetable Modal...");
    const sailingTrigger = page.locator('div[aria-label="Choose Sailing Date and Vessel"]');
    await sailingTrigger.waitFor({ state: "visible", timeout: 5000 });
    await sailingTrigger.click();
    await page.waitForTimeout(600);

    const modalHeader = page.locator('div[role="dialog"] h2:has-text("Sailing Schedule")');
    await modalHeader.waitFor({ state: "visible", timeout: 5000 });

    // 8. Verify Standard | 24h toggle
    console.log("8. Verifying Standard | 24h time format toggle...");
    const stdBtn = page.locator("button:has-text('Standard')");
    const milBtn = page.locator("button:has-text('24h')");

    const stdVisible = await stdBtn.isVisible();
    const milVisible = await milBtn.isVisible();
    console.log(`Standard button: ${stdVisible}, 24h button: ${milVisible}`);
    if (!stdVisible || !milVisible) {
      throw new Error("FAIL: Standard | 24h toggle buttons missing in modal!");
    }

    // Toggle to 24h
    console.log("Toggling to 24h format...");
    await milBtn.click();
    await page.waitForTimeout(300);

    // Select a vessel (e.g. FastCat or Lite Ferry)
    const vesselCard = page.locator("div[role='dialog'] .space-y-2 > div").first();
    await vesselCard.click();
    await page.waitForTimeout(300);

    // Confirm selection
    const doneBtn = page.locator('button:has-text("Done")');
    await doneBtn.click();
    await page.waitForTimeout(600);

    // 9. Now verify that Route Summary Card IS VISIBLE!
    const summaryCardVisibleAfterSchedule = await page.evaluate(() => {
      const card = document.querySelector(".grid.transition-all.duration-300");
      if (!card) return false;
      const rect = card.getBoundingClientRect();
      const style = window.getComputedStyle(card);
      return style.opacity !== "0" && rect.height > 10;
    });
    console.log(`Summary card visible after timetable confirmed: ${summaryCardVisibleAfterSchedule} (Must be true)`);
    if (!summaryCardVisibleAfterSchedule) {
      throw new Error("FAIL: Route Summary Card did not appear after timetable confirmation!");
    }
    console.log("PASS: Route Summary Card is smoothly displayed after timetable is confirmed.");

    // Check fare: verify it is NOT ₱85.00
    const summaryCardText = await page.locator(".grid.transition-all.duration-300").innerText();
    console.log("Summary Card Content:\n", summaryCardText);
    if (summaryCardText.includes("85.00") || summaryCardText.includes("₱85")) {
      throw new Error("FAIL: Bogus ₱85.00 fare still appears!");
    }
    console.log("PASS: Real fare and scheduled vessel verified (no bogus ₱85.00).");

    await page.screenshot({ path: `${artifactDir}\\test_v4_1_route_card_confirmed.png` });

    // 10. Test Escape Key Trap on Map (with active selection)
    console.log("10. Pressing Escape key on map with active route selection...");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const discardModalTitle = page.locator("#discard-modal-title");
    const isDiscardModalOpen = await discardModalTitle.isVisible();
    console.log(`Discard confirmation modal visible on Escape: ${isDiscardModalOpen} (Must be true)`);
    if (!isDiscardModalOpen) {
      throw new Error("FAIL: Pressing Escape did not trigger the Discard Confirmation Modal!");
    }
    console.log("PASS: Pressing Escape smoothly triggered Discard Confirmation Modal.");

    await page.screenshot({ path: `${artifactDir}\\test_v4_2_discard_modal_on_escape.png` });

    // Dismiss discard modal with "No, Keep"
    console.log("11. Clicking 'No, Keep' to preserve booking selection...");
    const keepBtn = page.locator("button:has-text('No, Keep')");
    await keepBtn.click();
    await page.waitForTimeout(400);

    const isDiscardDismissed = await discardModalTitle.isVisible();
    console.log(`Discard modal dismissed: ${!isDiscardDismissed} (Must be true)`);
    if (isDiscardDismissed) {
      throw new Error("FAIL: Discard modal failed to dismiss after clicking 'No, Keep'!");
    }

    // 12. Test Collapsing Sidebar and clicking 'X' Close Map Button Trap
    console.log("12. Collapsing sidebar to reveal 'X' close button...");
    const collapseSidebarBtn = page.locator("button[title='Collapse Sidebar']");
    await collapseSidebarBtn.click();
    await page.waitForTimeout(600);

    const closeMapBtn = page.locator("button[title='Close Map View']");
    const isCloseBtnVisible = await closeMapBtn.isVisible();
    console.log(`Floating Close Map ('X') button visible: ${isCloseBtnVisible}`);
    if (!isCloseBtnVisible) {
      throw new Error("FAIL: Close Map ('X') button not visible when sidebar is collapsed!");
    }

    console.log("13. Clicking Close Map ('X') button with active selection...");
    await closeMapBtn.click();
    await page.waitForTimeout(500);

    const isDiscardModalOpenFromX = await discardModalTitle.isVisible();
    console.log(`Discard modal visible on clicking 'X': ${isDiscardModalOpenFromX} (Must be true)`);
    if (!isDiscardModalOpenFromX) {
      throw new Error("FAIL: Clicking 'X' close button did not trigger Discard Confirmation Modal!");
    }
    console.log("PASS: Clicking 'X' close button smoothly triggered Discard Confirmation Modal.");

    await page.screenshot({ path: `${artifactDir}\\test_v4_3_discard_modal_on_x.png` });

    // 14. Test Escape while sidebar is collapsed
    console.log("14. Dismissing discard modal with Escape...");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    console.log("15. Pressing Escape while sidebar is collapsed...");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const isDiscardModalOpenCollapsedEscape = await discardModalTitle.isVisible();
    console.log(`Discard modal visible on collapsed Escape: ${isDiscardModalOpenCollapsedEscape} (Must be true)`);
    if (!isDiscardModalOpenCollapsedEscape) {
      throw new Error("FAIL: Pressing Escape while collapsed did not trigger Discard Confirmation Modal!");
    }
    console.log("PASS: Escape while collapsed smoothly triggered Discard Confirmation Modal.");

    // 16. Confirm exit with 'Yes, Discard'
    console.log("16. Confirming exit with 'Yes, Discard'...");
    const confirmDiscardBtn = page.locator("button:has-text('Yes, Discard')");
    await confirmDiscardBtn.click();
    await page.waitForTimeout(1400);

    // Verify map returned to embedded preview in page flow
    const isBackToPreview = await page.evaluate(() => {
      return !document.body.classList.contains("map-fullscreen-active");
    });
    console.log(`Map successfully returned to embedded preview: ${isBackToPreview} (Must be true)`);
    if (!isBackToPreview) {
      throw new Error("FAIL: Map did not return to embedded preview after confirming discard!");
    }
    console.log("PASS: Map returned cleanly to embedded preview.");

    await page.screenshot({ path: `${artifactDir}\\test_v4_4_back_to_preview.png` });
    console.log("\n>>> ALL TESTS AND TRAPS VERIFIED WITH 100% SUCCESS IN FIREFOX! <<<");
  } finally {
    await browser.close();
  }
}

runTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
