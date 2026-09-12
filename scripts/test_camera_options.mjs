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

  // Expose test function in page
  await page.evaluate(() => {
    // Select Tagbilaran and Siquijor (Larena)
  });

  const originSelect = page.locator("#origin-pier-select");
  const destSelect = page.locator("#destination-pier-select");

  await originSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-tagbilaran"]').click();
  await page.waitForTimeout(300);
  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-siquijor"]').click();
  await page.waitForTimeout(1000);

  // Test Option 1: Balanced padding with zoom out (maxZoom 9.2 or padding 100)
  // Let's inspect the map instance from page
  const configs = [
    { name: "opt1_pure_center", padding: { top: 90, bottom: 90, left: 90, right: 90 }, maxZoom: 9.5 },
    { name: "opt2_gentle_sidebar_offset", padding: { top: 90, bottom: 90, left: 240, right: 80 }, maxZoom: 9.4 },
    { name: "opt3_moderate_offset", padding: { top: 90, bottom: 90, left: 300, right: 80 }, maxZoom: 9.3 },
    { name: "opt4_zoom_9_2_centered", padding: { top: 80, bottom: 80, left: 80, right: 80 }, maxZoom: 9.2 },
  ];

  for (const cfg of configs) {
    await page.evaluate((c) => {
      // Find map canvas and get MapLibre instance
      const mapContainer = document.querySelector(".maplibregl-map");
      // @ts-ignore
      const map = window.mapRefInstance || (mapContainer ? mapContainer.__maplibreMap : null);
      if (!map) {
        // Find through canvas event listeners or react fiber
        const key = Object.keys(mapContainer).find(k => k.startsWith("__reactFiber"));
        let fiber = mapContainer[key];
        while (fiber) {
          if (fiber.memoizedProps?.value || fiber.stateNode?.map) {
            // ...
          }
          fiber = fiber.return;
        }
      }
    }, cfg);
  }

  await browser.close();
}

run().catch(console.error);
