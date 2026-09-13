import fs from "fs";

let content = fs.readFileSync("src/components/map/nauticalRoutes.ts", "utf8");
const directPts = JSON.parse(fs.readFileSync("temp_kml/direct_balingoan.json", "utf8"));
const formattedPath = directPts.map(pt => `      [${pt[0]}, ${pt[1]}]`).join(",\n");

// Use regex to find the jagna-balingoan path
const regex = /(id:\s*["']jagna-balingoan["'][\s\S]*?path:\s*\[)([\s\S]*?)(\n\s*\]\s*,?\s*\n\s*\},?\s*\n\s*\{\s*\n\s*\/\/\s*11\.\s*Ubay)/;

const match = content.match(regex);
if (!match) {
  throw new Error("Could not match jagna-balingoan path via regex");
}

const newContent = content.replace(regex, `$1\n${formattedPath}$3`);
fs.writeFileSync("src/components/map/nauticalRoutes.ts", newContent, "utf8");
console.log("Safely replaced jagna-balingoan via regex!");
