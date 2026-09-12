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

  // 1. Select Non-Bohol Origin: Bato Port -> Destination: Ubay Port
  console.log("Testing Bato Port (Non-Bohol Origin) -> Ubay Port");
  await page.locator("#origin-pier-select").click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-bato-leyte"]').scrollIntoViewIfNeeded();
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-bato-leyte"]').click();
  await page.waitForTimeout(600);

  await page.locator("#destination-pier-select").click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-ubay"]').scrollIntoViewIfNeeded();
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-ubay"]').click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "scripts/verify_bato_ubay_card.png" });
  const batoUbayCard = await page.locator(".grid-rows-\\[1fr\\]").innerText();
  console.log("Bato -> Ubay Card:\n", batoUbayCard);

  // 2. Select Non-Bohol Origin: Cagayan de Oro -> Destination: Jagna Port
  console.log("Testing Cagayan de Oro (Non-Bohol Origin) -> Jagna Port");
  await page.locator("#origin-pier-select").click();
  await page.waitForTimeout(300);
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-cagayan-de-oro"]').scrollIntoViewIfNeeded();
  await page.locator('#origin-pier-select ~ div [data-testid="pier-option-cagayan-de-oro"]').click();
  await page.waitForTimeout(600);

  await page.locator("#destination-pier-select").click();
  await page.waitForTimeout(300);
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-jagna"]').scrollIntoViewIfNeeded();
  await page.locator('#destination-pier-select ~ div [data-testid="pier-option-jagna"]').click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "scripts/verify_cdo_jagna_card.png" });
  const cdoJagnaCard = await page.locator(".grid-rows-\\[1fr\\]").innerText();
  console.log("CDO -> Jagna Card:\n", cdoJagnaCard);

  await browser.close();
}

run().catch(console.error);
