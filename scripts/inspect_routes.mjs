import fs from "fs";

const content = fs.readFileSync("src/components/map/nauticalRoutes.ts", "utf8");

// Check BOHOL_PORTS
const portsBlock = content.slice(content.indexOf("export const BOHOL_PORTS"), content.indexOf("export const FERRY_ROUTES"));
const portIds = [...portsBlock.matchAll(/id:\s*["']([^"']+)["']/g)].map(m => m[1]);
console.log("BOHOL_PORTS (" + portIds.length + "):", portIds);

// Check FERRY_ROUTES
const routesBlock = content.slice(content.indexOf("export const FERRY_ROUTES"), content.indexOf("export const ROUTED_PORTS"));
const routeMatches = [...routesBlock.matchAll(/id:\s*["']([^"']+)["'],\s*name:\s*["']([^"']+)["'],\s*fromId:\s*["']([^"']+)["'],\s*toId:\s*["']([^"']+)["']/g)];
console.log("\nFERRY_ROUTES (" + routeMatches.length + "):");
routeMatches.forEach((m, idx) => {
  console.log(`[${idx}] id: ${m[1]} | name: ${m[2]} | fromId: ${m[3]} | toId: ${m[4]}`);
});

// Check where Ubay is used and valid origin/dest logic
const ubayPorts = content.match(/ubay/gi);
console.log("\nUbay occurrences:", ubayPorts ? ubayPorts.length : 0);

// Check getConnectedDestinationPorts
console.log("\nChecking getConnectedDestinationPorts for all origin ports:");
for (const pId of portIds) {
  // Let's see what routes have fromId === pId or toId === pId
  const connected = routeMatches.filter(r => r[3] === pId || r[4] === pId);
  console.log(`Port [${pId}]: connected to ${connected.length} routes:`, connected.map(c => c[1]));
}
