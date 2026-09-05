/**
 * nauticalRoutes.ts
 * 
 * Dedicated single source of truth for Bohol maritime ferry corridors.
 * Traced with high-density deep-water waypoints following official navigation lanes.
 * Guarantees that rendered route polylines and ship positions use 100% identical coordinates.
 */

export interface PortLocation {
  id: string;
  name: string;
  shortName: string;
  city: string;
  province: string;
  coordinates: [number, number]; // [lng, lat]
  role: string;
  badge: string;
  description: string;
  dailySailings: number;
}

export interface FerryRoute {
  id: string;
  name: string;
  fromId: string;
  toId: string;
  origin: string;
  destination: string;
  fare: string;
  duration: string;
  distanceNM: number;
  vesselType: string;
  tag: string;
  path: [number, number][]; // LineString coords strictly over deep sea water
}

export const BOHOL_PORTS: PortLocation[] = [
  {
    id: "tagbilaran",
    name: "Tagbilaran Port",
    shortName: "Tagbilaran",
    city: "Tagbilaran City",
    province: "Bohol",
    coordinates: [123.84592, 9.64841], // Actual Tagbilaran passenger wharf dock
    role: "Central Passenger Gateway",
    badge: "Main Terminal",
    description: "Bohol's capital hub with frequent fastcraft departures to Cebu Pier 1 and southern maritime routes.",
    dailySailings: 18,
  },
  {
    id: "tubigon",
    name: "Tubigon Port",
    shortName: "Tubigon",
    city: "Tubigon",
    province: "Bohol",
    coordinates: [123.95851, 9.95526], // Actual Tubigon passenger pier head
    role: "Northern Express Fastcraft Hub",
    badge: "Fastest Crossing",
    description: "Closest Bohol port to Cebu. Fastest 1h 15m crossing time across the Bohol Strait.",
    dailySailings: 24,
  },
  {
    id: "cebu-pier-1",
    name: "Cebu Pier 1",
    shortName: "Cebu Pier 1",
    city: "Cebu City",
    province: "Cebu",
    coordinates: [123.90811, 10.29254], // Actual Cebu Pier 1 passenger berth
    role: "Central Visayas Maritime Gateway",
    badge: "Major Terminal",
    description: "Primary passenger terminal in Cebu City serving daily OceanJet, SuperCat, and Lite Ferry vessels to Bohol.",
    dailySailings: 32,
  },
  {
    id: "jagna",
    name: "Jagna Port",
    shortName: "Jagna",
    city: "Jagna",
    province: "Bohol",
    coordinates: [124.36707, 9.64859], // Actual Jagna Port passenger wharf
    role: "Southern & Mindanao Passage",
    badge: "South Gateway",
    description: "Deep-water port in southeastern Bohol connecting to Camiguin Island and Northern Mindanao.",
    dailySailings: 6,
  },
  {
    id: "ubay",
    name: "Ubay Port",
    shortName: "Ubay",
    city: "Ubay",
    province: "Bohol",
    coordinates: [124.47359, 10.06296], // Actual Ubay Port passenger pier
    role: "Northeastern Leyte Link",
    badge: "East Gateway",
    description: "Gateway connecting eastern Bohol to Bato and Hilongos, Southern Leyte.",
    dailySailings: 8,
  },
];

/**
 * High-density nautical waypoints:
 * Strictly traced along open maritime waters and marked ferry lanes.
 */
export const FERRY_ROUTES: FerryRoute[] = [
  {
    // Tubigon → Cebu: Straight northwest through open Bohol Strait.
    // Exits Tubigon heading NW, stays west of Pangapasan reef cluster in mid-strait.
    id: "tubigon-cebu",
    name: "Tubigon ⇄ Cebu Pier 1",
    fromId: "tubigon",
    toId: "cebu-pier-1",
    origin: "Tubigon Port",
    destination: "Cebu Pier 1",
    fare: "₱85.00",
    duration: "1h 15m",
    distanceNM: 22.4,
    vesselType: "Express RoRo / Catamaran",
    tag: "Fastest Crossing",
    path: [
      [123.95851, 9.95526], // Tubigon Port pier head
      [123.9300, 9.9750],   // Exit harbor, bearing NNW into open strait, west of Pangapasan
      [123.9050, 10.0450],  // Mid-strait, Bohol Strait deep water
      [123.8850, 10.1300],  // Open strait heading north-northwest
      [123.8780, 10.2100],  // Open water off Minglanilla / Talisay
      [123.8880, 10.2530],  // Approach Cebu harbor mouth
      [123.9000, 10.2780],  // Mactan Channel south approach
      [123.90811, 10.29254],// Cebu Pier 1 passenger berth
    ],
  },
  {
    // Tagbilaran → Cebu: Must clear Panglao Island by routing west.
    // Exit WNW from Tagbilaran harbor, round Panglao's west tip at ~123.74 lng,
    // then swing north up the Bohol Strait in deep open water.
    id: "tagbilaran-cebu",
    name: "Tagbilaran ⇄ Cebu Pier 1",
    fromId: "tagbilaran",
    toId: "cebu-pier-1",
    origin: "Tagbilaran Port",
    destination: "Cebu Pier 1",
    fare: "₱250.00",
    duration: "2h 00m",
    distanceNM: 41.2,
    vesselType: "Fastcraft Express",
    tag: "Busiest Route",
    path: [
      [123.84592, 9.64841], // Tagbilaran Port dock
      [123.8200, 9.6550],   // Tagbilaran harbor mouth, bearing WNW into Panglao Channel
      [123.7750, 9.6450],   // Panglao Channel, south of Tagbilaran, north of Panglao west tip
      [123.7400, 9.6600],   // Clear west of Panglao Island — open Bohol Strait
      [123.7200, 9.7400],   // Bohol Strait, heading NNW west of Cortes
      [123.7200, 9.8500],   // Bohol Strait deep water west of Loon
      [123.7400, 9.9500],   // Bohol Strait deep water west of Calape
      [123.7900, 10.0700],  // Bohol Strait mid-channel heading north
      [123.8400, 10.1700],  // Bohol Strait north, open water
      [123.8750, 10.2450],  // Talisay approach, open sea
      [123.8980, 10.2780],  // Mactan Channel entrance
      [123.90811, 10.29254],// Cebu Pier 1 berth
    ],
  },
  {
    // Tagbilaran → Jagna: Must navigate WEST out of Tagbilaran harbor into Tagbilaran Bay,
    // circumnavigate Panglao Island around its western and southern shores,
    // then sail east along the southern coast of Bohol in open Bohol Sea water to Jagna.
    id: "tagbilaran-jagna",
    name: "Tagbilaran ⇄ Jagna Port",
    fromId: "tagbilaran",
    toId: "jagna",
    origin: "Tagbilaran Port",
    destination: "Jagna Port",
    fare: "₱150.00",
    duration: "1h 45m",
    distanceNM: 34.0,
    vesselType: "Coastal Fastcraft",
    tag: "Southern Passage",
    path: [
      [123.84592, 9.64841], // Tagbilaran Port passenger dock
      [123.8200, 9.6600],   // Harbor exit channel heading WNW into Tagbilaran Bay
      [123.7500, 9.6500],   // Open Bohol Strait west of Panglao Island
      [123.7150, 9.5700],   // Deep Bohol Sea southwest of Panglao Island
      [123.7500, 9.5000],   // Deep Bohol Sea south of Panglao Island (clear of reef)
      [123.8500, 9.4800],   // Deep water south of Libaong / Panglao south coast
      [123.9500, 9.5000],   // Open Bohol Sea south of Baclayon
      [124.0600, 9.5200],   // Deep water south of Loay / Dimiao
      [124.1800, 9.5200],   // Deep water south of Valencia
      [124.2800, 9.5300],   // Deep water south of Garcia Hernandez
      [124.3600, 9.5800],   // Approach Jagna Bay from the south in deep water
      [124.3750, 9.6250],   // Entrance to Jagna harbor
      [124.36707, 9.64859], // Jagna Port passenger dock
    ],
  },
  {
    // Tubigon → Ubay: Follows the Camotes Sea deep-water corridor along northern Bohol,
    // staying in open sea water north of Inabanga, Buenavista, Getafe, and Talibon,
    // then enters the open bay west of Tres Reyes Island to dock safely at Ubay.
    id: "tubigon-ubay",
    name: "Tubigon ⇄ Ubay Port",
    fromId: "tubigon",
    toId: "ubay",
    origin: "Tubigon Port",
    destination: "Ubay Port",
    fare: "₱220.00",
    duration: "2h 30m",
    distanceNM: 44.5,
    vesselType: "Fastliner Service",
    tag: "Northern Passage",
    path: [
      [123.95851, 9.95526], // Tubigon Port pier head
      [123.9450, 9.9750],   // Exit harbor northwest into open Camotes Sea
      [123.9700, 10.0500],  // Open water offshore Inabanga
      [124.0600, 10.1300],  // Camotes Sea deep water north of Buenavista
      [124.1700, 10.2000],  // Deep channel north of Getafe
      [124.2800, 10.2200],  // Deep water north of Talibon
      [124.3800, 10.1800],  // Open water north of Bien Unido / Trinidad
      [124.4400, 10.1200],  // Wide open sea channel west of Tres Reyes Island
      [124.4600, 10.0850],  // Enter Ubay Bay in deep open water
      [124.47359, 10.06296],// Ubay Port pier
    ],
  },
];

/**
 * Calculates Euclidean distance between two geographic coordinates.
 */
function getDistance(p1: [number, number], p2: [number, number]): number {
  const dx = (p2[0] - p1[0]) * Math.cos(((p1[1] + p2[1]) / 2) * (Math.PI / 180));
  const dy = p2[1] - p1[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Computes compass heading (0 - 360 degrees) between two points.
 */
function getHeading(p1: [number, number], p2: [number, number]): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const rad = Math.atan2(dy, dx);
  let deg = 90 - (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/**
 * Distance-weighted interpolation along polyline.
 * Guarantees the resulting coordinate lies 100% precisely ON the line.
 */
export function getPositionAlongPath(
  path: [number, number][],
  progress: number
): { coord: [number, number]; heading: number } {
  if (path.length === 0) return { coord: [123.95851, 9.95526], heading: 0 };
  if (path.length === 1) return { coord: path[0], heading: 0 };

  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Compute length of each segment and total polyline distance
  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const len = getDistance(path[i], path[i + 1]);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) {
    return { coord: path[0], heading: 0 };
  }

  const targetDistance = clampedProgress * totalLength;

  // Find which segment contains target distance
  let accumulated = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDistance || i === segmentLengths.length - 1) {
      const segProgress = segLen > 0 ? (targetDistance - accumulated) / segLen : 0;
      const p1 = path[i];
      const p2 = path[i + 1];

      const lng = p1[0] + (p2[0] - p1[0]) * segProgress;
      const lat = p1[1] + (p2[1] - p1[1]) * segProgress;
      const heading = getHeading(p1, p2);

      return { coord: [lng, lat], heading };
    }
    accumulated += segLen;
  }

  const lastIndex = path.length - 1;
  return {
    coord: path[lastIndex],
    heading: getHeading(path[lastIndex - 1], path[lastIndex]),
  };
}
