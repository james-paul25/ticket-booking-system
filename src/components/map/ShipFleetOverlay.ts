/**
 * ShipFleetOverlay.ts
 * 
 * Separates ship icons, fleet telemetry state, and navigation logic.
 * Directly connects active ships to the blue dashed routes defined in nauticalRoutes.ts.
 */

import { FERRY_ROUTES, getPositionAlongPath, FerryRoute } from "./nauticalRoutes";

export interface ActiveVessel {
  id: string;
  name: string;
  code: string;
  routeId: string;
  origin: string;
  destination: string;
  speedKnots: number;
  heading: number; // degrees
  progress: number; // 0.0 to 1.0 along route polyline
  eta: string;
  operator: string;
}

export const INITIAL_FLEET_VESSELS: ActiveVessel[] = [
  {
    id: "v-1",
    name: "OceanJet 88",
    code: "OJ-88",
    routeId: "tagbilaran-cebu",
    origin: "Tagbilaran Port",
    destination: "Cebu Pier 1",
    speedKnots: 24.5,
    heading: 18,
    progress: 0.45,
    eta: "52 mins",
    operator: "Ocean Fast Ferries",
  },
  {
    id: "v-2",
    name: "OceanJet 15",
    code: "OJ-15",
    routeId: "tagbilaran-cebu",
    origin: "Cebu Pier 1",
    destination: "Tagbilaran Port",
    speedKnots: 23.8,
    heading: 198,
    progress: 0.35,
    eta: "1h 10m",
    operator: "Ocean Fast Ferries",
  },
  {
    id: "v-3",
    name: "Lite Ferry 2",
    code: "LF-02",
    routeId: "tubigon-cebu",
    origin: "Tubigon Port",
    destination: "Cebu Pier 1",
    speedKnots: 17.5,
    heading: 335,
    progress: 0.40,
    eta: "42 mins",
    operator: "Lite Shipping Corp",
  },
  {
    id: "v-4",
    name: "SuperCat 32",
    code: "SC-32",
    routeId: "tubigon-cebu",
    origin: "Cebu Pier 1",
    destination: "Tubigon Port",
    speedKnots: 23.8,
    heading: 155,
    progress: 0.48,
    eta: "38 mins",
    operator: "SuperCat Fast Ferry",
  },
  {
    id: "v-5",
    name: "Starlite Polaris",
    code: "SP-09",
    routeId: "tagbilaran-jagna",
    origin: "Tagbilaran Port",
    destination: "Jagna Port",
    speedKnots: 19.2,
    heading: 110,
    progress: 0.38,
    eta: "1h 05m",
    operator: "Starlite Ferries",
  },
];

/**
 * Resolves a vessel's exact [lng, lat] coordinate and orientation
 * strictly on the blue dashed line of its assigned route.
 */
export function getVesselPositionOnRoute(
  route: FerryRoute,
  vessel: ActiveVessel
): { coord: [number, number]; heading: number } {
  const isReverse = vessel.origin.toLowerCase().includes(route.destination.toLowerCase().split(" ")[0]);
  const effectiveProgress = isReverse
    ? Math.max(0, Math.min(1, 1 - vessel.progress))
    : Math.max(0, Math.min(1, vessel.progress));

  const { coord, heading } = getPositionAlongPath(route.path, effectiveProgress);
  const adjustedHeading = isReverse ? (heading + 180) % 360 : heading;

  return { coord, heading: adjustedHeading };
}

/**
 * Advances vessel positions once every 1 minute according to actual knots and nautical miles.
 */
export function advanceFleetTelemetry(prevVessels: ActiveVessel[]): ActiveVessel[] {
  return prevVessels.map((v) => {
    const route = FERRY_ROUTES.find((r) => r.id === v.routeId);
    if (!route) return v;

    // Progress fraction per minute = (speedKnots / 60) / distanceNM
    const stepFraction = v.speedKnots / (60 * route.distanceNM);
    let newProgress = v.progress + stepFraction;
    if (newProgress >= 0.98) {
      newProgress = 0.02; // Voyage reaches port, new crossing commences
    }

    const { heading } = getVesselPositionOnRoute(route, { ...v, progress: newProgress });

    const remainingNM = route.distanceNM * (1 - newProgress);
    const remainingMinutes = Math.round((remainingNM / v.speedKnots) * 60);
    const etaFormatted =
      remainingMinutes >= 60
        ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`
        : `${remainingMinutes} mins`;

    return {
      ...v,
      progress: newProgress,
      heading,
      eta: etaFormatted,
    };
  });
}

/**
 * Creates a MapLibre DOM marker element for a vessel.
 * Ensures strict positioning without drifting on map zoom.
 */
export function createVesselMarkerElement(
  vessel: ActiveVessel,
  heading: number,
  onClick: (v: ActiveVessel) => void
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "group cursor-pointer flex items-center justify-center";
  el.id = `vessel-${vessel.id}`;
  el.style.width = "32px";
  el.style.height = "32px";
  el.style.position = "absolute";
  el.style.zIndex = "30";

  el.innerHTML = `
    <div class="absolute -inset-1.5 rounded-full bg-blue-500/30 animate-ping pointer-events-none"></div>
    <div class="relative w-8 h-8 rounded-full bg-slate-900 text-white shadow-xl border-2 border-white flex items-center justify-center transition-transform group-hover:scale-110 group-hover:bg-blue-600">
      <svg id="vessel-icon-${vessel.id}" style="transform: rotate(${heading}deg); transition: transform 0.8s ease;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
        <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 6"></path>
        <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"></path>
        <path d="M12 10v4"></path>
        <path d="M12 2v3"></path>
      </svg>
    </div>
    <div class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm pointer-events-none"></div>
    <div class="absolute top-full mt-1 px-2 py-0.5 rounded-full bg-slate-900/90 backdrop-blur-sm text-white shadow-md text-[10px] font-bold tracking-tight whitespace-nowrap group-hover:bg-blue-600 transition-colors pointer-events-none z-20">
      🚢 ${vessel.name}
    </div>
  `;

  el.addEventListener("click", () => {
    onClick(vessel);
  });

  return el;
}
