import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import {
  Search,
  Ship,
  MapPin,
  ArrowRight,
  ArrowRightLeft,
  Maximize2,
  Navigation,
  Compass,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import type { Schedule } from "@/types/schedule";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MAP FULLSCREEN TRANSITION TIMINGS & EASING CONFIGURATION
 * 
 * Adjust any of these millisecond (ms) values to manually fine-tune
 * the speed, pacing, and smoothness of the transition sequence:
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const MAP_TRANSITION_CONFIG = {
  /** Time (ms) allowed for the page to smoothly scroll the map to the center of the viewport */
  centerScrollDuration: 700,

  /** Duration (ms) for the map card to smoothly expand from dashboard into full screen */
  expandDuration: 1500,

  /** Delay (ms) after expansion completes before the left sidebar and right controls slide in */
  controlsSlideInDelay: 600,

  /** Duration (ms) for sidebar and controls to slide out before map starts contracting */
  controlsSlideOutDuration: 250,

  /** Duration (ms) for the map to smoothly shrink back down into the embedded card */
  collapseDuration: 650,

  /** CSS Easing curve for silky-smooth acceleration and natural deceleration */
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
};


import {
  BOHOL_PORTS,
  FERRY_ROUTES,
  ROUTED_PORTS,
  getConnectedDestinationPorts,
  getRouteBetweenPorts,
  type PortLocation,
  type FerryRoute,
} from "./nauticalRoutes";
import {
  advanceFleetTelemetry,
  getVesselPositionOnRoute,
  createVesselMarkerElement,
  updateVesselMarkerElement,
  computeFleetState,
  type ActiveVessel,
} from "./ShipFleetOverlay";

// Re-export for seamless backward compatibility
export {
  BOHOL_PORTS,
  FERRY_ROUTES,
  ROUTED_PORTS,
  getConnectedDestinationPorts,
  getRouteBetweenPorts,
  getVesselPositionOnRoute,
  computeFleetState,
};
export type { PortLocation, FerryRoute, ActiveVessel };

/**
 * Pre-warms/pre-loads vector or raster map tiles for all 8 Bohol passenger ports.
 * Caches zoom levels 10, 11, and 12 in the browser HTTP cache so switching to any port
 * (even far ports like Leyte Bato, Camiguin, or Siquijor) displays immediately with zero blank boxes.
 */
function preloadBoholPortTiles(maptilerKey?: string) {
  const zooms = [10, 11, 12];
  const requested = new Set<string>();

  BOHOL_PORTS.forEach((port) => {
    zooms.forEach((z) => {
      const [lng, lat] = port.coordinates;
      const x = Math.floor(((lng + 180) / 360) * Math.pow(2, z));
      const latRad = (lat * Math.PI) / 180;
      const y = Math.floor(
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z)
      );

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const tileX = x + dx;
          const tileY = y + dy;
          const key = `${z}/${tileX}/${tileY}`;
          if (requested.has(key)) continue;
          requested.add(key);

          if (maptilerKey) {
            const url = `https://api.maptiler.com/tiles/v3/${z}/${tileX}/${tileY}.pbf?key=${maptilerKey}`;
            fetch(url, { mode: "cors" }).catch(() => { });
          } else {
            const img = new Image();
            img.src = `https://tile.openstreetmap.org/${z}/${tileX}/${tileY}.png`;
          }
        }
      }
    });
  });
}

interface BoholTransitMapProps {
  schedules?: Schedule[];
  showVessels?: boolean; // Set to true for admin fleet monitoring; false for customer booking view
  twoState?: boolean; // When true, starts in clean landing overview and expands to fullscreen on click
  simulatedTime?: Date | null; // Optional simulated time (or time-travel clock for admin)
}

export function BoholTransitMap({
  schedules: _schedules = [],
  showVessels = false,
  twoState,
  simulatedTime = null,
}: BoholTransitMapProps) {
  const isTwoState = twoState ?? !showVessels;
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const animatedContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const vesselMarkersRef = useRef<{ [key: string]: maplibregl.Marker }>({});

  const [mapLoaded, setMapLoaded] = useState(false);
  type SequencePhase = "preview" | "centering" | "expanding" | "fullscreen" | "collapsing";
  const [phase, setPhase] = useState<SequencePhase>("preview");
  const [placeholderHeight, setPlaceholderHeight] = useState(580);
  const [containerStyle, setContainerStyle] = useState<React.CSSProperties | undefined>(undefined);
  const initialRectRef = useRef<{ top: number; left: number; width: number; height: number }>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });
  const sequenceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafLoopRef = useRef<number | null>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  const isExpanded = phase === "expanding" || phase === "fullscreen" || phase === "collapsing";
  const showControls = !isTwoState || phase === "fullscreen";

  const [selectedPort, setSelectedPort] = useState<PortLocation | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<FerryRoute | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<ActiveVessel | null>(null);
  const [is3D, setIs3D] = useState(false);
  const is3DRef = useRef(false);
  const handleSelectPortRef = useRef<(port: PortLocation) => void>(() => {});
  const stopTurntable = useCallback(() => {}, []);
  const [vessels, setVessels] = useState<ActiveVessel[]>(() => computeFleetState(simulatedTime || new Date()));
  const [activeTab, setActiveTab] = useState<"planner" | "ports" | "ships">("planner");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Route planner state: origin and destination are tied strictly to verified maritime routes
  const [planOriginId, setOriginPortId] = useState("tagbilaran");
  const [planDestId, setDestPortId] = useState("cebu-pier-1");

  // Atomic current date (YYYY-MM-DD) that updates daily, preventing any selection of past dates
  const todayStr = useMemo(() => {
    const now = simulatedTime || new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [simulatedTime]);

  const [travelDate, setTravelDate] = useState(() => {
    const now = simulatedTime || new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Guard against outdated dates if system clock ticks over midnight or simulated time changes
  useEffect(() => {
    if (!travelDate || travelDate < todayStr) {
      setTravelDate(todayStr);
    }
  }, [todayStr, travelDate]);

  // Dynamic connected destination ports strictly derived from real ship routes
  const validDestinations = useMemo(() => {
    return getConnectedDestinationPorts(planOriginId);
  }, [planOriginId]);

  // Ensure selected destination is always valid when origin changes
  useEffect(() => {
    if (validDestinations.length > 0 && !validDestinations.some((p) => p.id === planDestId)) {
      setDestPortId(validDestinations[0].id);
    }
  }, [validDestinations, planDestId]);

  // Sync vessels whenever simulatedTime changes
  useEffect(() => {
    if (!showVessels) return;
    setVessels(computeFleetState(simulatedTime || new Date()));
  }, [showVessels, simulatedTime]);

  // Real-time animation interval: Updates once every 1 minute (60,000ms) with realistic nautical knot physics
  useEffect(() => {
    if (!showVessels || simulatedTime) return;

    const interval = setInterval(() => {
      setVessels(advanceFleetTelemetry([], new Date()));
    }, 60000);

    return () => clearInterval(interval);
  }, [showVessels, simulatedTime]);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const maptilerKey = import.meta.env.VITE_MAPTILER_KEY;
    const mapStyle: string | maplibregl.StyleSpecification = maptilerKey
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`
      : {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm-tiles-layer",
            type: "raster",
            source: "osm-tiles",
            minzoom: 0,
            maxzoom: 19,
            paint: {
              "raster-resampling": "linear",
              "raster-fade-duration": 0,
            },
          },
        ],
      };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [124.15, 9.82], // Balanced center showcasing Bohol and its regional island corridors
      zoom: 8.6,
      minZoom: 7.6, // Allows full view of regional inter-island corridors (Cebu, Siquijor, Camiguin, Leyte)
      maxZoom: 14.0, // Prevents zooming in excessively past pier detail
      pitch: 0,
      bearing: 0,
      maxPitch: 65,
      dragRotate: true,
      pitchWithRotate: true,
      touchPitch: true,
      maxTileCacheSize: 1000, // Retains up to 1000 tiles in memory to prevent purging visited ports
      maxTileCacheZoomLevels: 10, // Keeps overview parent tiles ready as fallback background
      fadeDuration: 150, // Rapid symbol and tile appearance without lingering fade-in
      maxBounds: [
        [114.0, 4.0], // Broad regional basin boundary allowing free, fluid 3D horizon panning
        [134.0, 22.0],
      ],
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      // Pre-warm all Bohol port tiles in background cache
      preloadBoholPortTiles(maptilerKey);

      // 1. Add GeoJSON source for Ferry Routes
      const routeFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = FERRY_ROUTES.map((route) => ({
        type: "Feature",
        id: route.id,
        properties: {
          id: route.id,
          name: route.name,
          fare: route.fare,
          duration: route.duration,
          vesselType: route.vesselType,
        },
        geometry: {
          type: "LineString",
          coordinates: route.path,
        },
      }));

      map.addSource("ferry-routes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: routeFeatures,
        },
      });

      // 2. Outer halo / casing line for maritime clarity
      map.addLayer({
        id: "ferry-routes-halo",
        type: "line",
        source: "ferry-routes",
        paint: {
          "line-color": "#ffffff",
          "line-width": 6.5,
          "line-opacity": 0.95,
        },
      });

      // 3. Main interactive nautical route line
      map.addLayer({
        id: "ferry-routes-line",
        type: "line",
        source: "ferry-routes",
        paint: {
          "line-color": "#2563eb", // Solid blue-600
          "line-width": 3.8,
          "line-dasharray": [4, 2],
        },
      });

      // Route click interaction
      map.on("click", "ferry-routes-line", (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const featureId = e.features[0].id as string;
        const matched = FERRY_ROUTES.find((r) => r.id === featureId);
        if (matched) {
          handleSelectRoute(matched);
        }
      });

      map.on("mouseenter", "ferry-routes-line", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "ferry-routes-line", () => {
        map.getCanvas().style.cursor = "";
      });

      // 4. Create Port Pins with precise center anchoring on wharf coordinates
      BOHOL_PORTS.forEach((port) => {
        const el = document.createElement("div");
        el.className = "group cursor-pointer flex items-center justify-center";
        el.style.width = "32px";
        el.style.height = "32px";
        el.style.position = "absolute";

        el.innerHTML = `
          <div class="relative w-8 h-8 rounded-full bg-blue-600 text-white shadow-lg border-2 border-white flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="5" r="3"></circle>
              <line x1="12" y1="22" x2="12" y2="8"></line>
              <path d="M5 12H2a10 10 0 0 0 20 0h-3"></path>
            </svg>
          </div>
          <div class="absolute top-full mt-1 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md text-[11px] font-bold text-slate-800 whitespace-nowrap group-hover:border-blue-500 group-hover:text-blue-600 transition-colors pointer-events-none z-20">
            ${port.shortName}
          </div>
        `;

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          handleSelectPortRef.current(port);
        });

        const marker = new maplibregl.Marker({
          element: el,
          anchor: "center",
          pitchAlignment: "viewport",
          rotationAlignment: "viewport",
        })
          .setLngLat(port.coordinates)
          .addTo(map);

        markersRef.current[port.id] = marker;
      });

      // 5. Create Vessel Markers strictly following designated blue routes (Admin panel only)
      if (showVessels) {
        vessels.forEach((v) => {
          const route = FERRY_ROUTES.find((r) => r.id === v.routeId);
          if (!route) return;

          const { coord, heading } = getVesselPositionOnRoute(route, v);
          const el = createVesselMarkerElement(v, heading, (selected) => {
            handleSelectVessel(selected);
          });

          const marker = new maplibregl.Marker({
            element: el,
            anchor: "center",
            pitchAlignment: "viewport",
            rotationAlignment: "viewport",
          })
            .setLngLat(coord)
            .addTo(map);

          vesselMarkersRef.current[v.id] = marker;
        });
      }
      // Native MapLibre gesture handling (dragPan, dragRotate, touchPitch) handles user interaction naturally
      setMapLoaded(true);

      map.once("idle", () => {
        setMapLoaded(true);
      });
    });

    return () => {
      stopTurntable();
      map.remove();
      mapRef.current = null;
    };
  }, [showVessels, stopTurntable]);

  // Update vessel markers dynamically as positions and telemetry update (Admin only)
  useEffect(() => {
    if (!showVessels) return;

    vessels.forEach((v) => {
      const route = FERRY_ROUTES.find((r) => r.id === v.routeId);
      if (!route) return;

      const { coord, heading } = getVesselPositionOnRoute(route, v);

      const marker = vesselMarkersRef.current[v.id];
      if (marker) {
        marker.setLngLat(coord);
        updateVesselMarkerElement(v, heading);
      }
    });
  }, [vessels, showVessels]);

  // Smooth camera interactions with 3D persistence and seamless pan (no tile loading/unloading)
  function handleSelectPort(port: PortLocation) {
    setSelectedPort(port);
    setSelectedRoute(null);
    setSelectedVessel(null);
    setSidebarOpen(true);
    setActiveTab("ports");

    const map = mapRef.current;
    if (!map) return;

    map.stop();

    const isCurrently3D = is3DRef.current || map.getPitch() > 20;
    // Since setSidebarOpen(true) was just called, account for the 390px sidebar on desktop screens
    const leftPadding = window.innerWidth >= 1024 ? 390 : 0;

    if (!isCurrently3D) {
      // 2D: Smooth ground pan to target port without tile thrashing
      map.easeTo({
        center: port.coordinates,
        padding: { left: leftPadding, right: 0, top: 0, bottom: 0 },
        zoom: 11.6,
        pitch: 0,
        bearing: 0,
        duration: 1300,
        easing: (t) => t * (2 - t),
        essential: true,
      });
    } else {
      // 3D Perspective Mode: Smooth ground pan with graceful 180° sweep in flight, keeping tiles loaded
      const curBearing = map.getBearing();
      map.easeTo({
        center: port.coordinates,
        padding: { left: leftPadding, right: 0, top: 0, bottom: 0 },
        zoom: 11.8,
        pitch: 52,
        bearing: curBearing + 180,
        duration: 2000,
        easing: (t) => t * (2 - t),
        essential: true,
      });
    }
  }
  handleSelectPortRef.current = handleSelectPort;

  function handleSelectRoute(route: FerryRoute, fitBounds = true) {
    mapRef.current?.stop();
    stopTurntable();
    setSelectedRoute(route);
    setSelectedPort(null);
    setSelectedVessel(null);
    setSidebarOpen(true);
    setActiveTab("planner");
    setOriginPortId(route.fromId);
    setDestPortId(route.toId);

    if (fitBounds && mapRef.current) {
      const coords = route.path;
      const bounds = coords.reduce(
        (b, coord) => b.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );

      const isCurrently3D = is3DRef.current || mapRef.current.getPitch() > 20;
      mapRef.current.fitBounds(bounds, {
        padding: { top: 70, bottom: 70, left: sidebarOpen && window.innerWidth >= 1024 ? 410 : 70, right: 70 },
        speed: 0.5,
        curve: 1.3,
        maxZoom: 11.2,
        pitch: isCurrently3D ? 48 : 0,
        bearing: isCurrently3D ? -15 : 0,
      });
    }
  }

  function handleSelectVessel(vessel: ActiveVessel) {
    if (!showVessels) return;
    mapRef.current?.stop();
    stopTurntable();
    setSelectedVessel(vessel);
    setSelectedPort(null);
    setSelectedRoute(null);
    setSidebarOpen(true);
    setActiveTab("ships");

    const route = FERRY_ROUTES.find((r) => r.id === vessel.routeId);
    if (!route || !mapRef.current) return;

    const isCurrently3D = is3DRef.current || mapRef.current.getPitch() > 20;
    const { coord } = getVesselPositionOnRoute(route, vessel);
    mapRef.current.flyTo({
      center: coord,
      padding: { left: sidebarOpen && window.innerWidth >= 1024 ? 390 : 0, right: 0, top: 0, bottom: 0 },
      zoom: 12.0,
      pitch: isCurrently3D ? 52 : 0,
      bearing: isCurrently3D ? -16 : 0,
      speed: 0.7,
      curve: 1.25,
      essential: true,
    });
  }

  function handleToggle3D() {
    if (!mapRef.current) return;
    mapRef.current.stop();
    const next3D = !is3D;
    setIs3D(next3D);
    is3DRef.current = next3D;

    const pivot = selectedPort ? selectedPort.coordinates : [124.15, 9.82];
    const leftPadding = sidebarOpen && window.innerWidth >= 1024 ? 390 : 0;

    if (next3D) {
      // Pre-warm all Bohol port tiles in cache to eliminate blank boxes on far port switches
      preloadBoholPortTiles(import.meta.env.VITE_MAPTILER_KEY);

      mapRef.current.easeTo({
        pitch: 52,
        bearing: -15,
        center: pivot as [number, number],
        padding: { left: leftPadding, right: 0, top: 0, bottom: 0 },
        duration: 900,
      });
      // Stays still in 3D perspective - do not turn!
    } else {
      mapRef.current.easeTo({
        pitch: 0,
        bearing: 0,
        center: pivot as [number, number],
        padding: { left: leftPadding, right: 0, top: 0, bottom: 0 },
        duration: 900,
      });
    }
  }

  function handleZoomIn() {
    if (mapRef.current) mapRef.current.zoomIn({ duration: 600 });
  }

  function handleZoomOut() {
    if (mapRef.current) mapRef.current.zoomOut({ duration: 600 });
  }

  function handleOriginChange(newOriginId: string) {
    setOriginPortId(newOriginId);
    const connected = getConnectedDestinationPorts(newOriginId);
    let nextDestId = planDestId;
    if (!connected.some((p) => p.id === nextDestId)) {
      nextDestId = connected.length > 0 ? connected[0].id : "";
    }
    setDestPortId(nextDestId);
    if (nextDestId) {
      const route = getRouteBetweenPorts(newOriginId, nextDestId);
      if (route) {
        handleSelectRoute(route, true);
      } else {
        setSelectedRoute(null);
      }
    } else {
      setSelectedRoute(null);
    }
  }

  function handleDestinationChange(newDestId: string) {
    setDestPortId(newDestId);
    const route = getRouteBetweenPorts(planOriginId, newDestId);
    if (route) {
      handleSelectRoute(route, true);
    } else {
      setSelectedRoute(null);
    }
  }

  function handleSwapPlanner() {
    const oldOrigin = planOriginId;
    const oldDest = planDestId;
    setOriginPortId(oldDest);
    setDestPortId(oldOrigin);
    const route = getRouteBetweenPorts(oldDest, oldOrigin);
    if (route) {
      handleSelectRoute(route, false);
    }
  }

  function handleDirectSearch(e: React.FormEvent) {
    e.preventDefault();
    const originPort = BOHOL_PORTS.find((p) => p.id === planOriginId);
    const destPort = BOHOL_PORTS.find((p) => p.id === planDestId);
    const params = new URLSearchParams();
    if (originPort) params.set("origin", originPort.name);
    if (destPort) params.set("destination", destPort.name);
    if (travelDate) params.set("date", travelDate);
    navigate(`/schedules?${params.toString()}`);
  }

  // Filtered port pills based on search
  const filteredPorts = useMemo(() => {
    if (!searchQuery.trim()) return BOHOL_PORTS;
    return BOHOL_PORTS.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Exact user-requested click sequence:
  // 1. "it centers the page around the map"
  // 2. "and then the map expands into a full screen, removing the top bar."
  // 3. "and then the sidebar, buttons slide in!"
  const startExpandSequence = useCallback(() => {
    if (!isTwoState || phase !== "preview") return;

    sequenceTimers.current.forEach(clearTimeout);
    sequenceTimers.current = [];
    if (rafLoopRef.current) cancelAnimationFrame(rafLoopRef.current);

    const container = animatedContainerRef.current;
    if (!container) return;

    // Step 1: Smoothly center the page viewport around the map
    setPhase("centering");
    const rect = container.getBoundingClientRect();
    const targetY = window.scrollY + rect.top - Math.max(10, (window.innerHeight - rect.height) / 2);
    window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });

    // Step 2: Once centering scroll completes, expand map card smoothly to full screen
    const t1 = setTimeout(() => {
      const currentContainer = animatedContainerRef.current;
      if (!currentContainer) return;
      const r = currentContainer.getBoundingClientRect();

      initialRectRef.current = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      };
      setPlaceholderHeight(r.height);

      // Lock fixed position to match embedded card exactly (0ms transition to avoid instant pop)
      setContainerStyle({
        position: "fixed",
        top: `${r.top}px`,
        left: `${r.left}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        borderRadius: "1.5rem",
        zIndex: 60,
        margin: 0,
        transition: "none",
      });
      setPhase("expanding");

      // Next frame: smoothly animate geometry to full viewport
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setContainerStyle({
            position: "fixed",
            top: "0px",
            left: "0px",
            width: "100vw",
            height: "100dvh",
            borderRadius: "0px",
            zIndex: 60,
            margin: 0,
            transition: `all ${MAP_TRANSITION_CONFIG.expandDuration}ms ${MAP_TRANSITION_CONFIG.easing}`,
          });

          try {
            window.history.pushState({ mapExpanded: true }, "");
          } catch {
            // ignore
          }

          // Continuously sync MapLibre canvas dimensions with GPU transition
          const start = performance.now();
          const syncCanvas = () => {
            mapRef.current?.resize();
            if (performance.now() - start < MAP_TRANSITION_CONFIG.expandDuration) {
              rafLoopRef.current = requestAnimationFrame(syncCanvas);
            }
          };
          rafLoopRef.current = requestAnimationFrame(syncCanvas);
        });
      });

      // Step 3: Controls and sidebar slide in once expansion reaches full size
      const t2 = setTimeout(() => {
        setPhase("fullscreen");
        setSidebarOpen(true);
        mapRef.current?.resize();
      }, MAP_TRANSITION_CONFIG.expandDuration + MAP_TRANSITION_CONFIG.controlsSlideInDelay);

      sequenceTimers.current.push(t2);
    }, MAP_TRANSITION_CONFIG.centerScrollDuration);

    sequenceTimers.current.push(t1);
  }, [isTwoState, phase]);

  const startExitSequence = useCallback((syncHistory = true) => {
    sequenceTimers.current.forEach(clearTimeout);
    sequenceTimers.current = [];
    if (rafLoopRef.current) cancelAnimationFrame(rafLoopRef.current);

    if (syncHistory && window.history.state?.mapExpanded) {
      try {
        window.history.back();
      } catch {
        // ignore
      }
    }

    // Step 1: Slide sidebar and controls away first
    setPhase("collapsing");

    // Step 2: Shrink map card smoothly back into original embedded dimensions
    const t1 = setTimeout(() => {
      const init = initialRectRef.current;
      setContainerStyle({
        position: "fixed",
        top: `${init.top}px`,
        left: `${init.left}px`,
        width: `${init.width}px`,
        height: `${init.height}px`,
        borderRadius: "1.5rem",
        zIndex: 60,
        margin: 0,
        transition: `all ${MAP_TRANSITION_CONFIG.collapseDuration}ms ${MAP_TRANSITION_CONFIG.easing}`,
      });

      const start = performance.now();
      const syncCanvas = () => {
        mapRef.current?.resize();
        if (performance.now() - start < MAP_TRANSITION_CONFIG.collapseDuration) {
          rafLoopRef.current = requestAnimationFrame(syncCanvas);
        }
      };
      rafLoopRef.current = requestAnimationFrame(syncCanvas);

      // Step 3: Once collapsed, return to embedded preview in document flow
      const t2 = setTimeout(() => {
        setPhase("preview");
        setContainerStyle(undefined);
        if (mapRef.current) {
          mapRef.current.stop();
          stopTurntable();
          setSelectedPort(null);
          setSelectedRoute(null);
          setSelectedVessel(null);
          setIs3D(false);
          mapRef.current.easeTo({
            center: [124.15, 9.82],
            zoom: 8.6,
            pitch: 0,
            bearing: 0,
            padding: { left: 0, right: 0, top: 0, bottom: 0 },
            duration: 400,
          });
          mapRef.current.resize();
        }
      }, MAP_TRANSITION_CONFIG.collapseDuration);

      sequenceTimers.current.push(t2);
    }, MAP_TRANSITION_CONFIG.controlsSlideOutDuration);

    sequenceTimers.current.push(t1);
  }, [stopTurntable]);

  // Keyboard shortcut: Escape exits fullscreen mode + Android back gesture support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (phase === "fullscreen" || phase === "expanding")) {
        startExitSequence();
      }
    };
    const onPopState = () => {
      if (phase === "fullscreen" || phase === "expanding") {
        startExitSequence(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
    };
  }, [phase, startExitSequence]);

  useEffect(() => {
    return () => {
      sequenceTimers.current.forEach(clearTimeout);
      sequenceTimers.current = [];
      if (rafLoopRef.current) cancelAnimationFrame(rafLoopRef.current);
    };
  }, []);

  return (
    <div className="relative w-full">
      {/* ─── DOM Placeholder when map is expanded into fullscreen (prevents page jump) ─── */}
      {isExpanded && (
        <div
          ref={placeholderRef}
          style={{ height: placeholderHeight }}
          className="w-full rounded-3xl min-h-[440px] sm:min-h-[540px] lg:min-h-[640px] bg-slate-100/40 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800"
        />
      )}

      {/* ─── Map Container ─── */}
      <div
        ref={animatedContainerRef}
        style={containerStyle}
        className={`${isExpanded
          ? "overflow-hidden"
          : "relative w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md min-h-[440px] sm:min-h-[540px] lg:min-h-[640px]"
          } bg-[#e8f0f8] dark:bg-slate-950 flex flex-col`}
      >
        {/* ─── Map Canvas ─── */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0 bg-[#e8f0f8] dark:bg-slate-950" />

        {/* ─── Unloaded Tile Overlay (Blocks map until ready, then gracefully fades out) ─── */}
        <div
          className={`absolute inset-0 z-40 bg-[#e8f0f8] dark:bg-slate-950 flex flex-col items-center justify-center transition-opacity duration-700 ease-out select-none ${mapLoaded ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
            }`}
          aria-label="Loading Bohol Sea Nautical Chart"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-lg flex items-center justify-center">
              <Ship size={22} className="text-blue-600 dark:text-blue-400 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                Bohol Sea Nautical Chart
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Calibrating sea routes & passenger piers...
              </p>
            </div>
          </div>
        </div>

        {/* ─── Clean Dashboard Click-to-Interact Overlay (Visible ONLY in preview mode) ─── */}
        {isTwoState && !isExpanded && (
          <button
            type="button"
            onClick={startExpandSequence}
            disabled={phase === "centering"}
            className="absolute inset-0 z-30 w-full h-full cursor-pointer bg-transparent hover:bg-slate-900/[0.03] dark:hover:bg-white/[0.03] transition-colors flex flex-col items-center justify-end pb-8 sm:pb-10 pointer-events-auto group focus:outline-none touch-manipulation"
            aria-label="Click to browse Bohol Sea transit map in full screen"
          >
            <div className="px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-2xl">
              <Maximize2 size={15} className="text-blue-600 dark:text-blue-400" />
              <span>{phase === "centering" ? "Centering transit map..." : "Click map to browse in full screen"}</span>
            </div>
          </button>
        )}

        {/* ─── Interactive Map UI (Rendered ONLY in fullscreen or when not twoState) ─── */}
        {(!isTwoState || isExpanded) && (
          <div className="relative z-20 flex flex-col flex-1 pointer-events-none">
            {/* ─── Google Maps-Style Left Sidebar (Clings flush to left edge) ─── */}
            <div
              className={`absolute top-0 left-0 bottom-0 z-30 w-[380px] sm:w-[390px] max-w-[92vw] h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${showControls && sidebarOpen
                ? "translate-x-0 opacity-100 pointer-events-auto"
                : "-translate-x-full opacity-0 pointer-events-none"
                }`}
              aria-label="Transit Route Planner and Piers"
            >
              {/* Sidebar Top Header: Network Title + Close/Collapse Buttons */}
              <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Compass size={14} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">Bohol Sea Transit Network</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {isTwoState && (
                    <button
                      type="button"
                      onClick={() => startExitSequence()}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Close map and return to page"
                      aria-label="Close map"
                    >
                      <X size={14} />
                      <span className="hidden sm:inline">Close</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                    title="Collapse Sidebar"
                    aria-label="Collapse Sidebar"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>

              {/* Search Bar inside Sidebar */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 gap-2 transition-all focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500/10">
                  <Search size={15} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Filter piers, routes, or terminals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 bg-white dark:bg-slate-900 shrink-0">
                <button
                  onClick={() => {
                    setActiveTab("planner");
                    setSelectedPort(null);
                    setSelectedVessel(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === "planner"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                >
                  Route Planner
                </button>
                <button
                  onClick={() => {
                    setActiveTab("ports");
                    setSelectedVessel(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === "ports"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                >
                  Piers ({BOHOL_PORTS.length})
                </button>
                {showVessels && (
                  <button
                    onClick={() => setActiveTab("ships")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${activeTab === "ships"
                      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                  >
                    <Ship size={12} />
                    <span>Fleet ({vessels.length})</span>
                  </button>
                )}
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 space-y-3.5 text-slate-900">
                {/* ─── TAB 1: Route Planner & Crossing Form ─── */}
                {activeTab === "planner" && (
                  <div className="space-y-3.5">
                    {/* Selected Route Badge if any */}
                    {selectedRoute && (
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                            {selectedRoute.tag}
                          </span>
                          <h4 className="font-bold text-sm text-blue-950 mt-0.5">{selectedRoute.name}</h4>
                          <p className="text-xs text-blue-600 font-medium">
                            {selectedRoute.duration} · {selectedRoute.fare} · {selectedRoute.distanceNM} NM
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedRoute(null)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                        >
                          Reset
                        </button>
                      </div>
                    )}

                    {/* Route Input Form */}
                    <form onSubmit={handleDirectSearch} className="space-y-3">
                      <div className="space-y-2 relative">
                        {/* Origin */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Origin Pier
                          </label>
                          <div className="relative">
                            <MapPin size={14} className="absolute left-3 top-3 text-blue-600" />
                            <select
                              value={planOriginId}
                              onChange={(e) => handleOriginChange(e.target.value)}
                              className="w-full text-xs font-semibold text-slate-900 bg-slate-50 rounded-xl pl-8 pr-3 py-2.5 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none"
                            >
                              {ROUTED_PORTS.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.city})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Swap Button */}
                        <div className="flex justify-center -my-1 relative z-10">
                          <button
                            type="button"
                            onClick={handleSwapPlanner}
                            className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm transition-all"
                            title="Swap origin & destination"
                          >
                            <ArrowRightLeft size={13} />
                          </button>
                        </div>

                        {/* Destination */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Destination Pier
                          </label>
                          <div className="relative">
                            <Navigation size={14} className="absolute left-3 top-3 text-emerald-600" />
                            <select
                              value={planDestId}
                              onChange={(e) => handleDestinationChange(e.target.value)}
                              className="w-full text-xs font-semibold text-slate-900 bg-slate-50 rounded-xl pl-8 pr-3 py-2.5 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none"
                            >
                              {validDestinations.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.city})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Date Selector */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          Sailing Date
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={travelDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val || val < todayStr) {
                              setTravelDate(todayStr);
                            } else {
                              setTravelDate(val);
                            }
                          }}
                          className="w-full text-xs font-semibold text-slate-900 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none cursor-pointer"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs tracking-tight shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Search size={14} />
                        <span>Find Live Crossings</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* ─── TAB 2: Piers & Ports List ─── */}
                {activeTab === "ports" && (
                  <div className="space-y-3">
                    {selectedPort && (
                      <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-100 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                              {selectedPort.badge}
                            </span>
                            <h3 className="font-bold text-base text-slate-900 mt-1">{selectedPort.name}</h3>
                            <p className="text-xs text-slate-500">
                              {selectedPort.city}, {selectedPort.province}
                            </p>
                          </div>
                          <button onClick={() => setSelectedPort(null)} className="text-slate-400 hover:text-slate-700 p-1">
                            <X size={14} />
                          </button>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{selectedPort.description}</p>

                        <div className="pt-2 border-t border-blue-100/80 flex items-center justify-between text-xs">
                          <span className="font-semibold text-blue-900">
                            {selectedPort.dailySailings} Daily Sailings
                          </span>
                          <button
                            onClick={() => {
                              handleOriginChange(selectedPort.id);
                              setActiveTab("planner");
                            }}
                            className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            Plan route <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Bohol Maritime Passenger Terminals
                      </p>
                      {filteredPorts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPort(p)}
                          className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${selectedPort?.id === p.id
                            ? "bg-blue-50 border-blue-400 shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <MapPin size={15} />
                            </div>
                            <div>
                              <p className="font-bold text-xs text-slate-900">{p.name}</p>
                              <p className="text-[11px] text-slate-400">{p.role}</p>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: Live Active Vessels (Admin Fleet View Only) ─── */}
                {showVessels && activeTab === "ships" && (
                  <div className="space-y-3">
                    {selectedVessel && (
                      <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 shadow-md">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${selectedVessel.status === "Underway" ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                                  }`}
                              />
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider ${selectedVessel.status === "Underway" ? "text-emerald-400" : "text-amber-400"
                                  }`}
                              >
                                {selectedVessel.status === "Underway"
                                  ? "Underway · Cruising"
                                  : `Moored · ${selectedVessel.currentPortName || "In Port"}`}
                              </span>
                            </div>
                            <h3 className="font-bold text-base text-white mt-1">{selectedVessel.name}</h3>
                            <p className="text-xs text-white/70">{selectedVessel.operator}</p>
                          </div>
                          <button onClick={() => setSelectedVessel(null)} className="text-white/60 hover:text-white p-1">
                            <X size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                          <div>
                            <span className="text-white/50 text-[10px] block uppercase">Speed</span>
                            <span className="font-bold">{selectedVessel.speedKnots} knots</span>
                          </div>
                          <div>
                            <span className="text-white/50 text-[10px] block uppercase">
                              {selectedVessel.status === "Underway" ? "Estimated ETA" : "Departure Status"}
                            </span>
                            <span
                              className={`font-bold ${selectedVessel.status === "Underway" ? "text-emerald-400" : "text-amber-300"
                                }`}
                            >
                              {selectedVessel.eta}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/10 text-xs">
                          <span className="text-white/50 text-[10px] block uppercase">Route</span>
                          <p className="font-semibold text-white/90">
                            {selectedVessel.origin} → {selectedVessel.destination}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Fleet Tracking (Updated Every 1m)
                        </p>
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          AIS Active
                        </span>
                      </div>

                      {vessels.map((v) => {
                        const isUnderway = v.status === "Underway";
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectVessel(v)}
                            className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${selectedVessel?.id === v.id
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-900"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${selectedVessel?.id === v.id
                                  ? "bg-white/20 text-white"
                                  : isUnderway
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-amber-50 text-amber-600"
                                  }`}
                              >
                                <Ship size={15} />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-xs">{v.name}</p>
                                  {isUnderway ? (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                      {v.speedKnots} kn
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                                      Moored
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-[11px] truncate max-w-[180px] ${selectedVessel?.id === v.id ? "text-white/70" : "text-slate-400"
                                    }`}
                                >
                                  {isUnderway
                                    ? `${v.origin.split(" ")[0]} → ${v.destination.split(" ")[0]}`
                                    : `At ${v.currentPortName?.split(" ")[0] || v.origin.split(" ")[0]} (${v.eta})`}
                                </p>
                              </div>
                            </div>
                            <ChevronRight
                              size={14}
                              className={selectedVessel?.id === v.id ? "text-white/60" : "text-slate-400"}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Collapsed State Reopen & Close Buttons (Visible when sidebar is closed in fullscreen) ─── */}
            {showControls && !sidebarOpen && (
              <div className="absolute top-4 left-4 z-20 pointer-events-auto flex items-center gap-2 animate-in fade-in duration-300">
                <button
                  type="button"
                  onClick={() => {
                    setSidebarOpen(true);
                    setActiveTab("planner");
                  }}
                  className="px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 hover:shadow-2xl transition-all flex items-center gap-2.5 group"
                  title="Open Route Planner Sidebar"
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                    <Compass size={14} />
                  </div>
                  <span>Route Planner</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {isTwoState && (
                  <button
                    type="button"
                    onClick={() => startExitSequence()}
                    className="p-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-xl text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800 transition-all flex items-center justify-center"
                    title="Close Map View"
                    aria-label="Close Map View"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {/* ─── Floating Right Map Navigation Controls (Slides in when fullscreen) ─── */}
            <div
              className={`absolute right-3.5 sm:right-6 bottom-8 sm:bottom-10 z-20 pointer-events-auto flex flex-col gap-2 transition-all duration-400 ease-out ${showControls ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-4 opacity-0 pointer-events-none"
                }`}
            >
              {/* 3D / 2D Perspective Toggle */}
              <button
                type="button"
                onClick={handleToggle3D}
                title={is3D ? "Switch to 2D Top-Down View" : "Switch to 3D Perspective Tilt"}
                className={`w-10 h-10 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center ${is3D
                  ? "bg-blue-600 text-white border border-blue-600 shadow-blue-500/30 ring-2 ring-blue-400"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
              >
                {is3D ? "2D" : "3D"}
              </button>

              {/* Zoom In & Out Controls */}
              <div className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  className="w-10 h-10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center font-bold text-lg leading-none transition-colors"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  className="w-10 h-10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center font-bold text-lg leading-none transition-colors"
                >
                  −
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
