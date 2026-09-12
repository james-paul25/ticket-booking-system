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

  // 1. Tagbilaran to Larena (Siquijor)
  await originSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-tagbilaran"]').click();
  await page.waitForTimeout(300);
  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-siquijor"]').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/final_tagbilaran_larena.png" });

  // 2. Tagbilaran to Dumaguete
  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-dumaguete"]').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/final_tagbilaran_dumaguete.png" });

  // 3. Jagna to Cagayan de Oro
  await originSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-jagna"]').click();
  await page.waitForTimeout(300);
  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-cagayan-de-oro"]').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/final_jagna_cdo.png" });

  // 4. Tubigon to Cebu Pier 1
  await originSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-tubigon"]').click();
  await page.waitForTimeout(300);
  await destSelect.click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-cebu-pier-1"]').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/final_tubigon_cebu.png" });

  await browser.close();
  console.log("All final route screenshots captured successfully");
}

run().catch(console.error);
