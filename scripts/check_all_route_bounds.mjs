import fs from "fs";

// Read nauticalRoutes.ts
const content = fs.readFileSync("src/components/map/nauticalRoutes.ts", "utf8");

// Extract each route
const routeRegex = /id:\s*["']([^"']+)["'],\s*name:\s*["']([^"']+)["'][\s\S]*?fromId:\s*["']([^"']+)["'],\s*toId:\s*["']([^"']+)["'][\s\S]*?path:\s*\[([\s\S]*?)\n\s*\]/g;

let match;
let count = 0;
while ((match = routeRegex.exec(content)) !== null) {
  count++;
  const id = match[1];
  const name = match[2];
  const fromId = match[3];
  const toId = match[4];
  const pathStr = "[" + match[5] + "]";
  const pts = JSON.parse(pathStr.replace(/,\s*\]/, "]"));

  let minLng = 999, maxLng = -999, minLat = 999, maxLat = -999;
  pts.forEach(p => {
    if (p[0] < minLng) minLng = p[0];
    if (p[0] > maxLng) maxLng = p[0];
    if (p[1] < minLat) minLat = p[1];
    if (p[1] > maxLat) maxLat = p[1];
  });

  console.log(`[${count}] ${id} (${fromId} -> ${toId}): ${pts.length} pts | Lng: ${minLng.toFixed(4)}..${maxLng.toFixed(4)} | Lat: ${minLat.toFixed(4)}..${maxLat.toFixed(4)}`);
}
