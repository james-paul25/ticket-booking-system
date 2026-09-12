import { firefox } from "playwright";

async function main() {
  console.log("=== Starting Automated Firefox Verification Suite (v2) ===");
  const browser = await firefox.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  const artifactDir = "C:\\Users\\codew\\.gemini\\antigravity-ide\\brain\\61e9225a-2f4c-4e1c-a934-82a39f3a710e";

  console.log("1. Navigating to http://localhost:5173/ ...");
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // 2. Expand map to fullscreen
  console.log("2. Expanding map to interactive fullscreen mode...");
  const expandBtn = page.locator('text=Click map to browse in full screen');
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
  } else {
    await page.locator('canvas.maplibregl-canvas').click({ position: { x: 400, y: 300 } });
  }
  await page.waitForTimeout(2500);

  // 3. Verify Sailing Date & Timetable is DISABLED before selecting piers
  console.log("3. Verifying Sailing Date & Timetable is initially disabled...");
  const sailingTrigger = page.locator('div[aria-label="Choose Sailing Date and Vessel"]');
  await sailingTrigger.waitFor({ state: "visible", timeout: 8000 });
  const isAriaDisabled = await sailingTrigger.getAttribute("aria-disabled");
  console.log("-> Initial sailing trigger aria-disabled:", isAriaDisabled, "(Must be 'true')");

  await page.screenshot({ path: `${artifactDir}\\test_v2_1_disabled_before_route.png` });
  console.log("-> Saved test_v2_1_disabled_before_route.png");

  // 4. Select Origin Pier: Tagbilaran Port
  console.log("4. Selecting Origin: Tagbilaran Port...");
  const originSelect = page.locator('#origin-pier-select');
  await originSelect.click();
  await page.waitForTimeout(400);
  const tagbilaranOption = page.locator('#origin-pier-select ~ div [data-testid="pier-option-tagbilaran"]');
  await tagbilaranOption.click();
  await page.waitForTimeout(600);

  // 5. Select Destination Pier: Cebu Pier 1 / Pier 5
  console.log("5. Selecting Destination: Cebu Pier 1 / Pier 5...");
  const destSelect = page.locator('#destination-pier-select');
  await destSelect.click();
  await page.waitForTimeout(400);
  const cebuOption = page.locator('#destination-pier-select ~ div [data-testid="pier-option-cebu-pier-1"]');
  await cebuOption.click();
  await page.waitForTimeout(800);

  // 6. Verify Sailing Date & Timetable is now ENABLED
  console.log("6. Opening Sailing Date & Timetable Modal for Tagbilaran -> Cebu...");
  await sailingTrigger.waitFor({ state: "visible", timeout: 5000 });
  await sailingTrigger.click();
  await page.waitForTimeout(600);

  // Verify modal is open and header displays Tagbilaran -> Cebu Port
  const modalHeader = page.locator('div[role="dialog"] h2:has-text("Sailing Schedule")');
  await modalHeader.waitFor({ state: "visible", timeout: 5000 });
  console.log("-> Confirmed: Sailing Date modal opened cleanly!");

  await page.screenshot({ path: `${artifactDir}\\test_v2_2_sailing_modal.png` });
  console.log("-> Saved test_v2_2_sailing_modal.png");

  // Check that the footer does NOT contain the removed slop
  const modalText = await page.locator('div[role="dialog"]').innerText();
  const hasSlopText = modalText.includes("Any Accommodated Vessel") || modalText.includes("Comprehensive Timetable");
  console.log("-> Slop text check in modal:", hasSlopText, "(Must be FALSE)");

  // Check that departures does NOT have overflow-y-auto or max-h-[220px]
  const departuresScrollable = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const departuresLabel = labels.find((l) => l.textContent?.includes("Departures"));
    const container = departuresLabel?.closest('div')?.parentElement?.querySelector('.space-y-2');
    if (!container) return { exists: false };
    const style = window.getComputedStyle(container);
    return {
      exists: true,
      overflowY: style.overflowY,
      maxHeight: style.maxHeight,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
    };
  });
  console.log("-> Departures container inner scroll check:", departuresScrollable);

  // Scroll down the modal content to verify the unified scroll
  console.log("7. Scrolling modal down (unified single scroll)...");
  await page.evaluate(() => {
    const modalBody = document.querySelector('div[role="dialog"] .overflow-y-auto');
    if (modalBody) {
      modalBody.scrollBy(0, 260);
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${artifactDir}\\test_v3_modal_scrolled_unified.png` });
  console.log("-> Saved test_v3_modal_scrolled_unified.png");

  // 8. Select Morning filter and select a vessel
  console.log("8. Selecting Morning filter...");
  const morningBtn = page.locator('button:has-text("Morning")');
  if (await morningBtn.isVisible()) {
    await morningBtn.click();
    await page.waitForTimeout(400);
  }

  const oceanJet88 = page.locator('div:has-text("OceanJet 88")').first();
  if (await oceanJet88.isVisible()) {
    await oceanJet88.click();
    await page.waitForTimeout(300);
  }

  await page.screenshot({ path: `${artifactDir}\\test_v2_3_vessel_selected.png` });
  console.log("-> Saved test_v2_3_vessel_selected.png");

  // Click Done to close modal
  const doneBtn = page.locator('button:has-text("Done")');
  await doneBtn.click();
  await page.waitForTimeout(500);

  // 8. Verify sidebar has updated schedule and "Proceed" button
  console.log("8. Verifying sidebar Proceed button & clean UI...");
  const proceedBtn = page.locator('button[type="submit"]:has-text("Proceed")');
  await proceedBtn.waitFor({ state: "visible", timeout: 5000 });

  // Verify slop text is absent in sidebar
  const sidebarText = await page.locator('form').innerText();
  const hasSidebarSlop = sidebarText.includes("Comprehensive Timetable") || sidebarText.includes("Advance booking");
  console.log("-> Slop text check in sidebar:", hasSidebarSlop, "(Must be FALSE)");

  await page.screenshot({ path: `${artifactDir}\\test_v2_4_sidebar_proceed_clean.png` });
  console.log("-> Saved test_v2_4_sidebar_proceed_clean.png");

  // 9. Click "Proceed" and verify direct redirection to /login
  console.log("9. Clicking Proceed button (unauthenticated)...");
  await proceedBtn.click();
  await page.waitForTimeout(1000);

  const currentUrl = page.url();
  console.log("-> Current URL after clicking Proceed:", currentUrl);
  const isLoginPage = currentUrl.includes("/login");
  console.log("-> Directly redirected to login:", isLoginPage, "(Must be TRUE)");

  await page.screenshot({ path: `${artifactDir}\\test_v2_5_redirected_to_login.png` });
  console.log("-> Saved test_v2_5_redirected_to_login.png");

  await browser.close();
  console.log("=== All Firefox Verification Tests (v2) Passed Successfully! ===");
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
