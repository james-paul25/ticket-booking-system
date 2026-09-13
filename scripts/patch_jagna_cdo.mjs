import fs from "fs";

let content = fs.readFileSync("src/components/map/nauticalRoutes.ts", "utf8");
const kml2 = fs.readFileSync("temp_kml/map2_doc.kml", "utf8");

const pms = kml2.match(/<Placemark>[\s\S]*?<\/Placemark>/g);
// Placemark 12 is Jagna to CDO
const cdoPm = pms.find(pm => pm.includes("Directions from Port of Jagna") && pm.includes("Cagayan De Oro"));
const coords = cdoPm.match(/<coordinates>([\s\S]*?)<\/coordinates>/)[1].trim().split(/\s+/).map(c => {
  const parts = c.split(",").map(Number);
  return [Number(parts[0].toFixed(5)), Number(parts[1].toFixed(5))];
});

console.log(`Jagna to CDO points count: ${coords.length}`);
console.log(`Start: [${coords[0]}]`);
console.log(`End: [${coords[coords.length - 1]}]`);

const formattedPath = coords.map(pt => `      [${pt[0]}, ${pt[1]}]`).join(",\n");

// Replace jagna-cdo path in nauticalRoutes.ts
const regex = /(id:\s*["']jagna-cdo["'][\s\S]*?path:\s*\[)([\s\S]*?)(\n\s*\]\s*,?\s*\n\s*\},?\s*\n\s*\{\s*\n\s*\/\/\s*10\.\s*Jagna)/;

const match = content.match(regex);
if (!match) throw new Error("Could not match jagna-cdo path");

const newContent = content.replace(regex, `$1\n${formattedPath}$3`);
fs.writeFileSync("src/components/map/nauticalRoutes.ts", newContent, "utf8");
console.log("Successfully patched jagna-cdo with authentic 114 waypoints!");
