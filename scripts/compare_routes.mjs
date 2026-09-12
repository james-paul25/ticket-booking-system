import fs from "fs";
import { FERRY_ROUTES, BOHOL_PORTS } from "../src/components/map/nauticalRoutes.js";

const kml1 = fs.readFileSync("temp_kml/map1_doc.kml", "utf8");
const kml2 = fs.readFileSync("temp_kml/map2_doc.kml", "utf8");

function parsePlacemarks(kmlText) {
  const pms = kmlText.match(/<Placemark>[\s\S]*?<\/Placemark>/g) || [];
  const result = [];
  pms.forEach((pm) => {
    const name = (pm.match(/<name>(.*?)<\/name>/) || [])[1] || "";
    if (pm.includes("<LineString>")) {
      const coordsText = pm.match(/<coordinates>([\s\S]*?)<\/coordinates>/)[1].trim();
      const coords = coordsText.split(/\s+/).map((c) => {
        const parts = c.split(",").map(Number);
        return [Number(parts[0].toFixed(5)), Number(parts[1].toFixed(5))];
      });
      result.push({ name, coords });
    }
  });
  return result;
}

const allKml = [...parsePlacemarks(kml1), ...parsePlacemarks(kml2)];

console.log("=== COMPARING FERRY_ROUTES WITH REAL KML DATA ===");
FERRY_ROUTES.forEach((route, i) => {
  const originPort = BOHOL_PORTS.find(p => p.id === route.fromId);
  const destPort = BOHOL_PORTS.find(p => p.id === route.toId);
  console.log(`\n[${i}] Route: ${route.id} (${route.name})`);
  console.log(`    Origin: ${originPort?.name} [${originPort?.coordinates}]`);
  console.log(`    Dest:   ${destPort?.name} [${destPort?.coordinates}]`);
  console.log(`    Path points: ${route.path.length}`);
  console.log(`    Start: [${route.path[0]}]`);
  console.log(`    End:   [${route.path[route.path.length - 1]}]`);

  // Check if any point in path has unexpected excursions
  // For Jagna-Balingoan:
  if (route.id === "jagna-balingoan") {
    let minLat = 999;
    route.path.forEach(pt => { if (pt[1] < minLat) minLat = pt[1]; });
    console.log(`    >>> MIN LATITUDE: ${minLat} (NOTE: CDO is at lat ~8.49!)`);
  }
});
