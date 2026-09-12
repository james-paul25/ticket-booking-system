import fs from "fs";

let content = fs.readFileSync("src/components/map/nauticalRoutes.ts", "utf8");
const pathReplacement = fs.readFileSync("temp_kml/formatted_balingoan_path.txt", "utf8");

const startIdx = content.indexOf('id: "jagna-balingoan"');
if (startIdx === -1) throw new Error("jagna-balingoan not found");

const pathIdx = content.indexOf("path: [", startIdx);
const endPathIdx = content.indexOf("    ],\n  },\n  {\n    // 11. Ubay", pathIdx);

const before = content.slice(0, pathIdx + "path: [\n".length);
const after = content.slice(endPathIdx);

content = before + pathReplacement + "\n" + after;
fs.writeFileSync("src/components/map/nauticalRoutes.ts", content, "utf8");
console.log("Successfully patched jagna-balingoan in nauticalRoutes.ts");
