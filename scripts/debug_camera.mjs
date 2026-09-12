import { firefox } from "playwright";

async function checkCameras() {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const artifactDir = "C:\\Users\\codew\\.gemini\\antigravity-ide\\brain\\61e9225a-2f4c-4e1c-a934-82a39f3a710e";

  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const expandBtn = page.locator('text=Click map to browse in full screen');
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
  } else {
    await page.locator('canvas.maplibregl-canvas').click({ position: { x: 400, y: 300 } });
  }
  await page.waitForTimeout(2500);

  const originSelect = page.locator('#origin-pier-select');
  const destSelect = page.locator('#destination-pier-select');

  // 1. Tagbilaran to Larena (Siquijor)
  console.log("Checking Tagbilaran to Larena...");
  await originSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-tagbilaran"]').click();
  await page.waitForTimeout(500);

  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-siquijor"]').click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: `${artifactDir}\\debug_tagb_larena.png` });

  // Get camera zoom, center, bounds
  const tagbLarenaInfo = await page.evaluate(() => {
    // @ts-ignore
    const map = window.mapRefInstance || document.querySelector('.maplibregl-map');
    return {
      windowWidth: window.innerWidth,
    };
  });
  console.log("Tagbilaran to Larena captured to debug_tagb_larena.png");

  await browser.close();
}

checkCameras().catch(console.error);
