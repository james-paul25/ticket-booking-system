import fs from "fs";

const content = fs.readFileSync("src/components/map/nauticalRoutes.ts", "utf8");

// Parse all routes from nauticalRoutes.ts
const routesBlock = content.slice(content.indexOf("export const FERRY_ROUTES = ["), content.indexOf("export const ROUTED_PORTS"));

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

const lines1 = parsePlacemarks(kml1);
const lines2 = parsePlacemarks(kml2);
const allKmlLines = [...lines1, ...lines2];

console.log(`Loaded ${allKmlLines.length} KML routes.`);
allKmlLines.forEach((l, i) => {
  console.log(`[${i}] "${l.name}" (${l.coords.length} pts) from [${l.coords[0]}] to [${l.coords[l.coords.length - 1]}]`);
});
