import { firefox } from "playwright";

async function check() {
  const browser = await firefox.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "scripts/current_page_state.png" });
  
  const sidebarCount = await page.locator('[aria-label="Transit Route Planner and Piers"]').count();
  const sidebarVisible = await page.locator('[aria-label="Transit Route Planner and Piers"]').isVisible().catch(() => false);
  const clickMapBanner = await page.locator("text=Click map to browse in full screen").isVisible().catch(() => false);
  
  console.log("Sidebar count:", sidebarCount);
  console.log("Sidebar visible:", sidebarVisible);
  console.log("Click map banner visible:", clickMapBanner);

  // If clickMapBanner is visible, click it and check sidebar
  if (clickMapBanner) {
    await page.locator("text=Click map to browse in full screen").click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: "scripts/after_click_map.png" });
    const afterCount = await page.locator('[aria-label="Transit Route Planner and Piers"]').count();
    const afterVisible = await page.locator('[aria-label="Transit Route Planner and Piers"]').isVisible().catch(() => false);
    console.log("After clicking map - Sidebar count:", afterCount);
    console.log("After clicking map - Sidebar visible:", afterVisible);
  }

  await browser.close();
}

check().catch(console.error);
