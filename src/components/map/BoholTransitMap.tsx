import { useEffect, useRef, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as maplibregl from "maplibre-gl";
import {
  Search,
  Ship,
  MapPin,
  ArrowRight,
  ArrowRightLeft,
  Navigation,
  Clock,
  Compass,
  ChevronRight,
  X,
  RotateCcw,
} from "lucide-react";
import type { Schedule } from "@/types/schedule";

import {
  BOHOL_PORTS,
  FERRY_ROUTES,
  type PortLocation,
  type FerryRoute,
} from "./nauticalRoutes";
import {
  INITIAL_FLEET_VESSELS,
  advanceFleetTelemetry,
  getVesselPositionOnRoute,
  createVesselMarkerElement,
  type ActiveVessel,
} from "./ShipFleetOverlay";

// Re-export for seamless backward compatibility
export { BOHOL_PORTS, FERRY_ROUTES, getVesselPositionOnRoute };
export type { PortLocation, FerryRoute, ActiveVessel };

interface BoholTransitMapProps {
  schedules?: Schedule[];
  showVessels?: boolean; // Set to true for admin fleet monitoring; false for customer booking view
}

export function BoholTransitMap({ schedules = [], showVessels = false }: BoholTransitMapProps) {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const vesselMarkersRef = useRef<{ [key: string]: maplibregl.Marker }>({});

  const [selectedPort, setSelectedPort] = useState<PortLocation | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<FerryRoute | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<ActiveVessel | null>(null);
  const [is3D, setIs3D] = useState(false);
  const [activeTab, setActiveTab] = useState<"planner" | "ports" | "ships">("planner");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Route planner state
  const [planOrigin, setPlanOrigin] = useState("Tagbilaran Port");
  const [planDestination, setPlanDestination] = useState("Cebu Pier 1");
  const [travelDate, setTravelDate] = useState("");

  // Live vessels state (only used when showVessels is true in admin view)
  const [vessels, setVessels] = useState<ActiveVessel[]>(INITIAL_FLEET_VESSELS);

  // Filtered schedules for selected port or route
  const matchingSchedules = useMemo(() => {
    if (selectedRoute) {
      return schedules.filter(
        (s) =>
          s.origin.toLowerCase().includes(selectedRoute.origin.toLowerCase().split(" ")[0]) &&
          s.destination.toLowerCase().includes(selectedRoute.destination.toLowerCase().split(" ")[0])
      );
    }
    if (selectedPort) {
      return schedules.filter(
        (s) =>
          s.origin.toLowerCase().includes(selectedPort.shortName.toLowerCase()) ||
          s.destination.toLowerCase().includes(selectedPort.shortName.toLowerCase())
      );
    }
    if (planOrigin && planDestination) {
      return schedules.filter(
        (s) =>
          s.origin.toLowerCase().includes(planOrigin.toLowerCase().split(" ")[0]) &&
          s.destination.toLowerCase().includes(planDestination.toLowerCase().split(" ")[0])
      );
    }
    return schedules.slice(0, 4);
  }, [schedules, selectedRoute, selectedPort, planOrigin, planDestination]);

  // Real-time animation interval: Updates once every 1 minute (60,000ms) with realistic nautical knot physics
  useEffect(() => {
    if (!showVessels) return;

    const interval = setInterval(() => {
      setVessels((prev) => advanceFleetTelemetry(prev));
    }, 60000);

    return () => clearInterval(interval);
  }, [showVessels]);

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
      center: [123.98, 9.92], // Balanced center showcasing Bohol and the Bohol Strait beside the sidebar
      zoom: 9.0,
      minZoom: 8.2, // Prevents zooming out too far where regional tiles become blurry
      maxZoom: 14.0, // Prevents zooming in excessively past pier detail
      pitch: 0,
      bearing: 0,
      maxPitch: 65,
      dragRotate: true,
      pitchWithRotate: true,
      touchPitch: true,
      maxBounds: [
        [123.0, 9.0], // Southwest bound
        [125.2, 10.8], // Northeast bound
      ],
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("load", () => {
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
          <div class="absolute -inset-1.5 rounded-full bg-blue-500/20 animate-ping group-hover:bg-blue-600/30 pointer-events-none"></div>
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

        el.addEventListener("click", () => {
          handleSelectPort(port);
        });

        const marker = new maplibregl.Marker({
          element: el,
          anchor: "center",
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
          })
            .setLngLat(coord)
            .addTo(map);

          vesselMarkersRef.current[v.id] = marker;
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [showVessels]);

  // Update vessel markers dynamically as positions update (Admin only)
  useEffect(() => {
    if (!showVessels) return;

    vessels.forEach((v) => {
      const route = FERRY_ROUTES.find((r) => r.id === v.routeId);
      if (!route) return;

      const { coord, heading } = getVesselPositionOnRoute(route, v);

      const marker = vesselMarkersRef.current[v.id];
      if (marker) {
        marker.setLngLat(coord);

        const icon = document.getElementById(`vessel-icon-${v.id}`);
        if (icon) {
          icon.style.transform = `rotate(${heading}deg)`;
        }
      }
    });
  }, [vessels, showVessels]);

  // Smooth camera interactions (Slow, cinematic transitions with bold zooming and native sidebar padding)
  function handleSelectPort(port: PortLocation) {
    setSelectedPort(port);
    setSelectedRoute(null);
    setSelectedVessel(null);
    setSidebarOpen(true);
    setActiveTab("ports");

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: port.coordinates,
        padding: { left: sidebarOpen ? 340 : 0, right: 0, top: 0, bottom: 0 },
        zoom: 11.6,
        pitch: 0,
        bearing: 0,
        speed: 0.55,
        curve: 1.35,
        essential: true,
      });
    }
  }

  function handleSelectRoute(route: FerryRoute) {
    setSelectedRoute(route);
    setSelectedPort(null);
    setSelectedVessel(null);
    setSidebarOpen(true);
    setActiveTab("planner");
    setPlanOrigin(route.origin);
    setPlanDestination(route.destination);

    if (mapRef.current) {
      // Fit bounds of the route with pleasant padding
      const coords = route.path;
      const bounds = coords.reduce(
        (b, coord) => b.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );

      mapRef.current.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 380, right: 60 },
        speed: 0.55,
        curve: 1.35,
        maxZoom: 11.2,
        pitch: 0,
        bearing: 0,
      });
    }
  }

  function handleSelectVessel(vessel: ActiveVessel) {
    if (!showVessels) return;
    setSelectedVessel(vessel);
    setSelectedPort(null);
    setSelectedRoute(null);
    setSidebarOpen(true);
    setActiveTab("ships");

    const route = FERRY_ROUTES.find((r) => r.id === vessel.routeId);
    if (!route || !mapRef.current) return;

    const { coord } = getVesselPositionOnRoute(route, vessel);
    mapRef.current.flyTo({
      center: coord,
      padding: { left: sidebarOpen ? 340 : 0, right: 0, top: 0, bottom: 0 },
      zoom: 12.0,
      pitch: 0,
      bearing: 0,
      speed: 0.8,
      curve: 1.2,
      essential: true,
    });
  }

  function handleToggle3D() {
    if (!mapRef.current) return;
    const next3D = !is3D;
    setIs3D(next3D);
    mapRef.current.easeTo({
      pitch: next3D ? 52 : 0,
      bearing: next3D ? -16 : 0,
      duration: 1000,
    });
  }

  function handleResetOverview() {
    setSelectedPort(null);
    setSelectedRoute(null);
    setSelectedVessel(null);
    setIs3D(false);

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [123.98, 9.92],
        zoom: 9.0,
        pitch: 0,
        bearing: 0,
        speed: 0.6,
        curve: 1.2,
        essential: true,
      });
    }
  }

  function handleZoomIn() {
    if (mapRef.current) mapRef.current.zoomIn({ duration: 600 });
  }

  function handleZoomOut() {
    if (mapRef.current) mapRef.current.zoomOut({ duration: 600 });
  }

  function handleSwapPlanner() {
    const temp = planOrigin;
    setPlanOrigin(planDestination);
    setPlanDestination(temp);
  }

  function handleDirectSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (planOrigin.trim()) params.set("origin", planOrigin.trim());
    if (planDestination.trim()) params.set("destination", planDestination.trim());
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

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-50 min-h-[580px] lg:min-h-[640px] flex flex-col">
      {/* ─── Map Canvas ─── */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* ─── Top Floating Google-Maps Search & Port Filter Bar ─── */}
      <div className="relative z-20 p-3 sm:p-4 pointer-events-none flex flex-col gap-2 max-w-2xl">
        {/* Search Input Bar */}
        <div className="pointer-events-auto flex items-center bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 px-3.5 py-2.5 gap-2.5 transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
          <Search size={17} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search Bohol piers, crossing routes, or passenger terminals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 bg-transparent outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={14} />
            </button>
          )}
          <div className="h-4 w-[1px] bg-slate-200" />
          <button
            onClick={handleResetOverview}
            title="Reset to Bohol Overview"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Overview</span>
          </button>
        </div>

        {/* Quick Port Jump Pills */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={handleResetOverview}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm border transition-all ${
              !selectedPort && !selectedRoute && !selectedVessel
                ? "bg-blue-600 text-white border-blue-600 shadow-blue-500/20"
                : "bg-white/95 backdrop-blur-sm text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300"
            }`}
          >
            All Bohol
          </button>
          {filteredPorts.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPort(p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm border transition-all flex items-center gap-1.5 ${
                selectedPort?.id === p.id
                  ? "bg-blue-600 text-white border-blue-600 shadow-blue-500/20"
                  : "bg-white/95 backdrop-blur-sm text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300"
              }`}
            >
              <MapPin size={11} className={selectedPort?.id === p.id ? "text-white" : "text-blue-600"} />
              <span>{p.shortName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Floating Sidebar (Google Maps-Style Planner / Port / Vessel Drawer) ─── */}
      <div className="relative z-10 flex-1 pointer-events-none p-3 sm:p-4 flex items-start">
        {sidebarOpen ? (
          <div className="pointer-events-auto w-full sm:w-[380px] max-h-[calc(100vh-280px)] sm:max-h-[500px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200">
            {/* Sidebar Top Nav Tabs */}
            <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setActiveTab("planner");
                    setSelectedPort(null);
                    setSelectedVessel(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "planner"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Route Planner
                </button>
                <button
                  onClick={() => {
                    setActiveTab("ports");
                    setSelectedVessel(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "ports"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Piers ({BOHOL_PORTS.length})
                </button>
                {showVessels && (
                  <button
                    onClick={() => setActiveTab("ships")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      activeTab === "ships"
                        ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Ship size={12} />
                    <span>Fleet ({vessels.length})</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                title="Hide panel"
              >
                <X size={14} />
              </button>
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-900">
              {/* ─── TAB 1: Route Planner & Crossing Form ─── */}
              {activeTab === "planner" && (
                <div className="space-y-4">
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
                            value={planOrigin}
                            onChange={(e) => setPlanOrigin(e.target.value)}
                            className="w-full text-xs font-semibold text-slate-900 bg-slate-50 rounded-xl pl-8 pr-3 py-2.5 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none"
                          >
                            {BOHOL_PORTS.map((p) => (
                              <option key={p.id} value={p.name}>
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
                          title="Swap ports"
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
                            value={planDestination}
                            onChange={(e) => setPlanDestination(e.target.value)}
                            className="w-full text-xs font-semibold text-slate-900 bg-slate-50 rounded-xl pl-8 pr-3 py-2.5 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none"
                          >
                            {BOHOL_PORTS.map((p) => (
                              <option key={p.id} value={p.name}>
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
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className="w-full text-xs font-medium text-slate-900 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none"
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

                  {/* Matching Sailings / Next Departures */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {matchingSchedules.length > 0 ? "Upcoming Available Sailings" : "Crossings Overview"}
                      </span>
                      <span className="text-[11px] font-medium text-emerald-600">
                        {matchingSchedules.length} sailings
                      </span>
                    </div>

                    {matchingSchedules.length > 0 ? (
                      <div className="space-y-2">
                        {matchingSchedules.slice(0, 3).map((s) => (
                          <div
                            key={s.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-white transition-all group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                                  {s.vehicle_name}
                                </span>
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                                  <span>{s.origin.split(" ")[0]}</span>
                                  <ArrowRight size={11} className="text-slate-400" />
                                  <span>{s.destination.split(" ")[0]}</span>
                                </div>
                                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-1">
                                  <Clock size={11} className="text-slate-400" />
                                  {s.departure_time}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-bold text-blue-600 block">
                                  ₱{Number(s.price).toFixed(2)}
                                </span>
                                <Link
                                  to={`/booking/${s.id}`}
                                  className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold shadow-sm transition-all"
                                >
                                  Book <ChevronRight size={10} />
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center rounded-xl bg-slate-50 text-xs text-slate-500">
                        Select an origin and destination to see live timetable sailings.
                      </div>
                    )}
                  </div>
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
                            setPlanOrigin(selectedPort.name);
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
                    {BOHOL_PORTS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPort(p)}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                          selectedPort?.id === p.id
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
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                              Underway · Cruising
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
                          <span className="text-white/50 text-[10px] block uppercase">Estimated ETA</span>
                          <span className="font-bold text-emerald-400">{selectedVessel.eta}</span>
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

                    {vessels.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectVessel(v)}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                          selectedVessel?.id === v.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              selectedVessel?.id === v.id
                                ? "bg-white/20 text-white"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            <Ship size={15} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-xs">{v.name}</p>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                {v.speedKnots} kn
                              </span>
                            </div>
                            <p
                              className={`text-[11px] truncate max-w-[180px] ${
                                selectedVessel?.id === v.id ? "text-white/70" : "text-slate-400"
                              }`}
                            >
                              {v.origin.split(" ")[0]} → {v.destination.split(" ")[0]}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={14}
                          className={selectedVessel?.id === v.id ? "text-white/60" : "text-slate-400"}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Reopen Sidebar Button */
          <button
            onClick={() => setSidebarOpen(true)}
            className="pointer-events-auto px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-lg text-xs font-bold text-slate-800 hover:text-blue-600 hover:border-blue-500 transition-all flex items-center gap-2"
          >
            <Compass size={15} className="text-blue-600" />
            <span>Show Route Planner</span>
          </button>
        )}
      </div>

      {/* ─── Floating Right Map Navigation Controls ─── */}
      <div className="absolute right-3 sm:right-4 bottom-4 z-20 pointer-events-auto flex flex-col gap-2">
        {/* 3D / 2D Perspective Toggle */}
        <button
          onClick={handleToggle3D}
          title={is3D ? "Switch to 2D Top-Down View" : "Switch to 3D Perspective Tilt"}
          className={`w-9 h-9 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center ${
            is3D
              ? "bg-blue-600 text-white border border-blue-600 shadow-blue-500/30 ring-2 ring-blue-400"
              : "bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50"
          }`}
        >
          {is3D ? "2D" : "3D"}
        </button>

        {/* Reset Bohol Overview */}
        <button
          onClick={handleResetOverview}
          title="Reset to Bohol Sea Overview"
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 shadow-md transition-all flex items-center justify-center"
        >
          <RotateCcw size={15} />
        </button>

        {/* Zoom In & Out */}
        <div className="flex flex-col rounded-xl bg-white border border-slate-200 shadow-md overflow-hidden">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 text-slate-700 hover:bg-slate-50 hover:text-blue-600 border-b border-slate-100 flex items-center justify-center"
          >
            <span className="text-base font-bold leading-none">+</span>
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center justify-center"
          >
            <span className="text-base font-bold leading-none">−</span>
          </button>
        </div>
      </div>
    </div>
  );
}
