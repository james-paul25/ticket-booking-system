import fs from "fs";

const lines = fs.readFileSync("src/components/map/nauticalRoutes.ts", "utf8").split("\n");
lines.forEach((l, i) => {
  if (l.includes('id: "jagna-balingoan"') || l.includes('id: "ubay-bato"') || l.includes('id: "jagna-cdo"')) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
