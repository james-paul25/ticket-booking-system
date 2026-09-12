import fs from "fs";

const content = fs.readFileSync("src/data/realSchedules.ts", "utf8");
const origins = [...new Set([...content.matchAll(/origin:\s*["']([^"']+)["']/g)].map(m => m[1]))];
const destinations = [...new Set([...content.matchAll(/destination:\s*["']([^"']+)["']/g)].map(m => m[1]))];
console.log("realSchedules origins:", origins);
console.log("realSchedules destinations:", destinations);
