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

  // 1. Select Origin: Jagna
  const originSelect = page.locator("#origin-pier-select");
  await originSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-jagna"]').click();
  await page.waitForTimeout(500);

  // 2. Select Destination: Balingoan
  const destSelect = page.locator("#destination-pier-select");
  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-balingoan"]').click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "scripts/verify_jagna_balingoan.png" });
  console.log("Captured verify_jagna_balingoan.png");

  // 3. Select Destination: CDO
  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-cagayan-de-oro"]').click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "scripts/verify_jagna_cdo.png" });
  console.log("Captured verify_jagna_cdo.png");

  await browser.close();
}

run().catch(console.error);
