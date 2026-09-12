import { firefox } from "playwright";

async function main() {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const artifactDir = "C:\\Users\\codew\\.gemini\\antigravity-ide\\brain\\61e9225a-2f4c-4e1c-a934-82a39f3a710e";

  await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Click expand
  const expandBtn = page.locator('text=Click map to browse in full screen');
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await page.waitForTimeout(2500);
  }

  // Take screenshot of map in fullscreen
  await page.screenshot({ path: `${artifactDir}\\debug_fullscreen_before_scroll.png` });

  // Check that header is completely nuked
  const headerCount1 = await page.locator('header').count();
  console.log("Header count before scroll up:", headerCount1, "(Must be 0 - nuked!)");

  // Now scroll window to top
  console.log("Attempting to scroll window to top...");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, -1000);
  await page.waitForTimeout(500);

  const headerCount2 = await page.locator('header').count();
  console.log("Header count after scroll up attempt:", headerCount2, "(Must be 0 - still nuked!)");

  await page.screenshot({ path: `${artifactDir}\\debug_fullscreen_after_scroll_up.png` });

  // Also check window.scrollY and stacking context
  const info = await page.evaluate(() => {
    const header = document.querySelector('header');
    return {
      scrollY: window.scrollY,
      headerZIndex: header ? window.getComputedStyle(header).zIndex : null,
      headerDisplay: header ? window.getComputedStyle(header).display : null,
      headerRect: header ? header.getBoundingClientRect() : null,
      bodyOverflow: document.body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow,
    };
  });
  console.log("Page info after scroll up:", info);

  await browser.close();
}

main().catch(console.error);
