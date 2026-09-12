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

  const originSelect = page.locator("#origin-pier-select");
  const destSelect = page.locator("#destination-pier-select");

  // Select Tagbilaran to Larena
  await originSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-tagbilaran"]').click();
  await page.waitForTimeout(300);
  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-siquijor"]').click();
  await page.waitForTimeout(1000);

  // Let's test different paddings and zooms for Tagbilaran to Larena
  // Option A: balanced padding { top: 90, bottom: 90, left: 90, right: 90 } with maxZoom 9.4
  await page.evaluate(() => {
    // @ts-ignore
    const map = window._map;
    // @ts-ignore
    const bounds = [[123.585, 9.245], [123.855, 9.655]];
    map.fitBounds(bounds, {
      padding: { top: 100, bottom: 100, left: 100, right: 100 },
      maxZoom: 9.4,
      pitch: 0,
      bearing: 0,
    });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/camera_larena_optA_balanced_9_4.png" });

  // Option B: balanced padding with maxZoom 9.2 (zoom out a little bit)
  await page.evaluate(() => {
    // @ts-ignore
    const map = window._map;
    // @ts-ignore
    const bounds = [[123.585, 9.245], [123.855, 9.655]];
    map.fitBounds(bounds, {
      padding: { top: 110, bottom: 110, left: 110, right: 110 },
      maxZoom: 9.1,
      pitch: 0,
      bearing: 0,
    });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/camera_larena_optB_zoomout_9_1.png" });

  // Option C: subtle left padding to give sidebar breathing room without pushing route far right
  // sidebar is 390px, but route is centered in the screen:
  // if left is 200 and right is 80:
  await page.evaluate(() => {
    // @ts-ignore
    const map = window._map;
    // @ts-ignore
    const bounds = [[123.585, 9.245], [123.855, 9.655]];
    map.fitBounds(bounds, {
      padding: { top: 100, bottom: 100, left: 200, right: 80 },
      maxZoom: 9.3,
      pitch: 0,
      bearing: 0,
    });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/camera_larena_optC_left200_9_3.png" });

  // Now test Dumaguete with pure center vs subtle padding
  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-dumaguete"]').click();
  await page.waitForTimeout(1000);

  // Tagb to Dumaguete with pure center
  await page.evaluate(() => {
    // @ts-ignore
    const map = window._map;
    // Tagbilaran to Dumaguete bounds
    const bounds = [[123.31059, 9.31252], [123.8467, 9.64982]];
    map.fitBounds(bounds, {
      padding: { top: 90, bottom: 90, left: 90, right: 90 },
      maxZoom: 9.8,
      pitch: 0,
      bearing: 0,
    });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/camera_dumaguete_pure_center.png" });

  // Tagb to Dumaguete with left: 220, right: 80
  await page.evaluate(() => {
    // @ts-ignore
    const map = window._map;
    const bounds = [[123.31059, 9.31252], [123.8467, 9.64982]];
    map.fitBounds(bounds, {
      padding: { top: 90, bottom: 90, left: 220, right: 80 },
      maxZoom: 9.8,
      pitch: 0,
      bearing: 0,
    });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "scripts/camera_dumaguete_left220.png" });

  await browser.close();
  console.log("All comparison screenshots saved");
}

run().catch(console.error);
