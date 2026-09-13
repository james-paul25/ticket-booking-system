import { firefox } from "playwright";

async function testAllRoutes() {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:5173/");
  await page.waitForTimeout(1000);

  const expandBtn = page.locator("text=Click map to browse in full screen");
  if (await expandBtn.isVisible()) await expandBtn.click();
  await page.waitForTimeout(2000);

  const routesToTest = [
    { origin: "jagna", dest: "cagayan-de-oro", name: "jagna_cdo" },
    { origin: "tubigon", dest: "cebu-pier-1", name: "tubigon_cebu" },
    { origin: "getafe", dest: "cordova", name: "getafe_cordova" },
    { origin: "ubay", dest: "bato-leyte", name: "ubay_bato" },
    { origin: "tagbilaran", dest: "siquijor", name: "tagbilaran_larena" },
    { origin: "tagbilaran", dest: "dumaguete", name: "tagbilaran_dumaguete" },
  ];

  const originSelect = page.locator("#origin-pier-select");
  const destSelect = page.locator("#destination-pier-select");

  for (const r of routesToTest) {
    await originSelect.click();
    await page.waitForTimeout(250);
    await page.locator(`#origin-pier-select ~ div [data-testid="pier-option-${r.origin}"]`).click();
    await page.waitForTimeout(250);

    await destSelect.click();
    await page.waitForTimeout(250);
    await page.locator(`#destination-pier-select ~ div [data-testid="pier-option-${r.dest}"]`).click();
    await page.waitForTimeout(1200);

    // Test with pure center fitBounds: padding: { top: 90, bottom: 90, left: 90, right: 90 }
    // with route-specific zoom ceiling:
    // for tagbilaran-siquijor: maxZoom: 9.3
    // for other routes: maxZoom: 10.4
    await page.evaluate((r) => {
      // @ts-ignore
      const map = window._map;
      // get bounds of route
      // @ts-ignore
      const isLarena = r.name === "tagbilaran_larena";
      // Let's get active bounds
      // @ts-ignore
      const maxZ = isLarena ? 9.2 : 10.4;
      // Get current route coordinates from source
      const source = map.getSource("ferry-routes");
      const data = source._data;
      const feat = data?.features?.find((f) => f.geometry?.coordinates?.length > 1);
      if (feat) {
        const coords = feat.geometry.coordinates;
        // @ts-ignore
        const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, {
          padding: { top: 90, bottom: 90, left: 90, right: 90 },
          maxZoom: maxZ,
          pitch: 0,
          bearing: 0,
          duration: 0,
        });
      }
    }, r);

    await page.waitForTimeout(600);
    await page.screenshot({ path: `scripts/test_route_${r.name}.png` });
  }

  await browser.close();
  console.log("All routes tested and saved");
}

testAllRoutes().catch(console.error);
