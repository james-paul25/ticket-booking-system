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
  await originSelect.click();
  await page.waitForTimeout(300);

  // Click Ubay
  const ubayOption = page.locator('[data-testid="pier-option-ubay"]');
  console.log("Ubay option visible before scroll?", await ubayOption.isVisible());
  await ubayOption.scrollIntoViewIfNeeded();
  await ubayOption.click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: "scripts/debug_ubay_origin_selected.png" });

  const destSelect = page.locator("#destination-pier-select");
  await destSelect.click();
  await page.waitForTimeout(500);

  const destOptions = await page.evaluate(() => {
    const list = document.querySelectorAll('#destination-pier-select ~ div [data-testid^="pier-option-"]');
    return Array.from(list).map(el => ({
      id: el.getAttribute("data-testid"),
      text: el.innerText.replace(/\n/g, " - ")
    }));
  });
  console.log("Ubay Destinations (" + destOptions.length + "):", destOptions);

  await page.screenshot({ path: "scripts/debug_ubay_dest_dropdown.png" });

  // Select Bato
  const batoOpt = page.locator('#destination-pier-select ~ div [data-testid="pier-option-bato-leyte"]');
  if (await batoOpt.isVisible()) {
    await batoOpt.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "scripts/debug_ubay_bato_route.png" });

    // Open sailing date modal
    const changeBtn = page.locator("text=Change");
    if (await changeBtn.isVisible()) {
      await changeBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "scripts/debug_ubay_bato_modal.png" });
    }
  }

  await browser.close();
  console.log("Finished Ubay test");
}

run().catch(console.error);
