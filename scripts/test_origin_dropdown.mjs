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
  await page.waitForTimeout(500);

  const options = await page.evaluate(() => {
    const list = document.querySelectorAll('[data-testid^="pier-option-"]');
    return Array.from(list).map(el => ({
      id: el.getAttribute("data-testid"),
      text: el.innerText.replace(/\n/g, " - ")
    }));
  });
  console.log("Origin Pier Dropdown Options (" + options.length + "):");
  options.forEach((o, i) => console.log(" " + i + ": " + o.id + " | " + o.text));

  await page.screenshot({ path: "scripts/debug_origin_dropdown.png" });
  await browser.close();
}

run().catch(console.error);
