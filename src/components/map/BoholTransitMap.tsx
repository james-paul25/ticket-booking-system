import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
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
  Map,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  X,
  Calendar,
  Clock,
  ChevronDown,
  Check,
  Lock,
} from "lucide-react";
import { SailingDateModal, type SailingPreference, formatTimeDisplay } from "./SailingDateModal";
import { REAL_SCHEDULE_TEMPLATES } from "@/data/realSchedules";
import type { Schedule } from "@/types/schedule";

function matchPortToSchedule(port: PortLocation, schedulePortName: string): boolean {
  const sp = schedulePortName.toLowerCase();
  const pid = port.id.toLowerCase();
  const pname = port.name.toLowerCase();
  const pshort = port.shortName.toLowerCase();
  const pcity = port.city.toLowerCase();

  if (pid === "cebu-pier-1") return sp.includes("cebu");
  if (pid === "tagbilaran") return sp.includes("tagbilaran");
  if (pid === "tubigon") return sp.includes("tubigon");
  if (pid === "getafe") return sp.includes("getafe") || sp.includes("jetafe");
  if (pid === "jagna") return sp.includes("jagna");
  if (pid === "ubay") return sp.includes("ubay");
  if (pid === "cordova") return sp.includes("cordova");
  if (pid === "siquijor") return sp.includes("siquijor") || sp.includes("larena");
  if (pid === "camiguin") return sp.includes("camiguin") || sp.includes("balbagon");
  if (pid === "cagayan-de-oro") return sp.includes("cagayan") || sp.includes("cdo");
  if (pid === "dumaguete") return sp.includes("dumaguete");
  if (pid === "bato-leyte") return sp.includes("bato");
  if (pid === "hilongos") return sp.includes("hilongos");
  if (pid === "nasipit") return sp.includes("nasipit");
  if (pid === "balingoan") return sp.includes("balingoan");
  if (pid === "ormoc") return sp.includes("ormoc");
  if (pid === "iligan") return sp.includes("iligan");
  return sp.includes(pname) || pname.includes(sp) || sp.includes(pshort) || sp.includes(pcity);
}

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
  centerScrollDuration: 300,

  /** Duration (ms) for the map card to smoothly expand from dashboard into full screen */
  expandDuration: 600,

  /** Delay (ms) after expansion completes before the left sidebar and right controls slide in */
  controlsSlideInDelay: 50,

  /** Duration (ms) for sidebar and controls to slide out before map starts contracting */
  controlsSlideOutDuration: 200,

  /** Duration (ms) for the map to smoothly shrink back down into the embedded card */
  collapseDuration: 450,

  /** Duration (ms) for nautical trim-path route line drawing (0% -> 100%). Change this ms value! */
  routeDrawDuration: 5000,

  /** Duration (ms) for nautical trim-path route line retraction (100% -> 0%). Change this ms value! */
  routeRetractDuration: 6000,

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

/**
 * Trims a multi-point coordinate array between startFraction and endFraction (0.0 to 1.0).
 * - Drawing forward: (path, progress, 0) -> head grows from start (0%) to end (100%)
 * - Worm retraction: (path, 1.0, progress) -> tail pulls forward from start towards end, shrinking into destination (0%)
 */
function getTrimmedPathCoordinates(
  path: [number, number][],
  endFraction: number,
  startFraction = 0
): [number, number][] {
  if (path.length < 2) return path.length === 1 ? [path[0], path[0]] : [[0, 0], [0, 0]];

  const startF = Math.max(0, Math.min(1, startFraction));
  const endF = Math.max(0, Math.min(1, endFraction));

  if (startF >= endF) {
    const collapsePoint = endF >= 1 ? path[path.length - 1] : path[0];
    return [collapsePoint, collapsePoint];
  }

  if (startF <= 0 && endF >= 1) return path;

  const segmentLengths: number[] = [];
  let totalDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1][0] - path[i][0];
    const dy = path[i + 1][1] - path[i][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(len);
    totalDist += len;
  }

  if (totalDist === 0) return [path[0], path[0]];

  const targetStartDist = totalDist * startF;
  const targetEndDist = totalDist * endF;

  let currentDist = 0;
  const result: [number, number][] = [];

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    const nextDist = currentDist + segLen;

    if (result.length === 0) {
      if (targetStartDist <= currentDist) {
        result.push(path[i]);
      } else if (targetStartDist < nextDist) {
        const segFraction = segLen > 0 ? (targetStartDist - currentDist) / segLen : 0;
        const startLng = path[i][0] + (path[i + 1][0] - path[i][0]) * segFraction;
        const startLat = path[i][1] + (path[i + 1][1] - path[i][1]) * segFraction;
        result.push([startLng, startLat]);
      }
    }

    if (result.length > 0) {
      if (targetEndDist <= nextDist) {
        const segFraction = segLen > 0 ? (targetEndDist - currentDist) / segLen : 0;
        const endLng = path[i][0] + (path[i + 1][0] - path[i][0]) * segFraction;
        const endLat = path[i][1] + (path[i + 1][1] - path[i][1]) * segFraction;
        result.push([endLng, endLat]);
        break;
      } else {
        result.push(path[i + 1]);
      }
    }

    currentDist = nextDist;
  }

  return result.length >= 2 ? result : [path[0], path[0]];
}

interface BoholTransitMapProps {
  schedules?: Schedule[];
  showVessels?: boolean; // Set to true for admin fleet monitoring; false for customer booking view
  twoState?: boolean; // When true, starts in clean landing overview and expands to fullscreen on click
  simulatedTime?: Date | null; // Optional simulated time (or time-travel clock for admin)
}

type SequencePhase = "preview" | "centering" | "expanding" | "fullscreen" | "collapsing";

// Isolated Vite HMR state cache (preserves fullscreen state strictly during code saves, NOT browser refreshes or page navigation)
let hmrPhaseCache: SequencePhase | undefined = import.meta.hot?.data?.hmrPhaseCache;
let hmrStyleCache: React.CSSProperties | undefined = import.meta.hot?.data?.hmrStyleCache;

if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    data.hmrPhaseCache = hmrPhaseCache;
    data.hmrStyleCache = hmrStyleCache;
  });
}

interface PierSelectProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: PortLocation[];
  placeholder: string;
  disabled?: boolean;
  icon: React.ReactNode;
  id?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function PierSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  icon,
  id,
  isOpen: controlledIsOpen,
  onOpenChange,
}: PierSelectProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const val = typeof next === "function" ? next(isOpen) : next;
    if (onOpenChange) {
      onOpenChange(val);
    } else {
      setInternalIsOpen(val);
    }
  };
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPort = useMemo(
    () => options.find((p) => p.id === value),
    [options, value]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.('[id^="port-marker-"]') || target?.closest?.('.maplibregl-marker')) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen]);

  return (
    <div className={`relative transition-all duration-200 ${isOpen ? "z-40" : "z-10"}`} ref={dropdownRef}>
      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
        {label}
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full min-h-[48px] px-3.5 py-1.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
            : isOpen
            ? "bg-white dark:bg-slate-800 border-blue-500 ring-2 ring-blue-500/15 shadow-xs"
            : "bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-white dark:hover:bg-slate-800"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="shrink-0 flex items-center justify-center">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            {selectedPort ? (
              <div key={selectedPort.id} className="min-w-0 animate-in fade-in slide-in-from-top-0.5 duration-200">
                <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {selectedPort.name}
                </p>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                  ({selectedPort.city})
                </p>
              </div>
            ) : (
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {placeholder}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-250 ease-out ${
            isOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : ""
          }`}
        />
      </button>

      {/* Floating Animated Dropdown Menu smoothly emerging directly from container */}
      <div
        role="listbox"
        data-testid="pier-dropdown-menu"
        className={`absolute top-[calc(100%+4px)] left-0 right-0 z-50 p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl space-y-1 max-h-72 overflow-y-auto custom-scrollbar transform origin-top transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen && !disabled
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
      >
        {options.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-400 font-medium">
            No passenger piers available
          </div>
        ) : (
          options.map((port) => {
            const isSelected = port.id === value;
            return (
              <button
                key={port.id}
                role="option"
                aria-selected={isSelected}
                data-testid={`pier-option-${port.id}`}
                type="button"
                onClick={() => {
                  onChange(port.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between text-xs transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="font-extrabold truncate">{port.name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {port.city}, {port.province}
                    </p>
                  </div>
                </div>
                {isSelected && <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0 ml-2" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function BoholTransitMap({
  schedules: _schedules = [],
  showVessels = false,
  twoState,
  simulatedTime = null,
}: BoholTransitMapProps) {
  const isTwoState = twoState ?? true;
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const animatedContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const vesselMarkersRef = useRef<{ [key: string]: maplibregl.Marker }>({});

  const [mapLoaded, setMapLoaded] = useState(false);
  const [phase, setPhase] = useState<SequencePhase>(() => hmrPhaseCache || "preview");
  const [placeholderHeight, setPlaceholderHeight] = useState(580);
  const [containerStyle, setContainerStyle] = useState<React.CSSProperties | undefined>(() => hmrStyleCache || undefined);

  // Sync active component phase to HMR cache so Ctrl+S code edits preserve state seamlessly
  useEffect(() => {
    hmrPhaseCache = phase;
    hmrStyleCache = containerStyle;
  }, [phase, containerStyle]);
  const initialRectRef = useRef<{ top: number; left: number; width: number; height: number }>({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });
  const sequenceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafLoopRef = useRef<number | null>(null);
  const routesRetractedRef = useRef(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  const isExpanded = phase === "expanding" || phase === "fullscreen" || phase === "collapsing";

  // Eagerly populate initialRectRef if mounted directly into fullscreen/expanded mode
  useEffect(() => {
    if (isExpanded && placeholderRef.current && initialRectRef.current.width === 0) {
      const pr = placeholderRef.current.getBoundingClientRect();
      if (pr.width > 50 && pr.height > 50) {
        initialRectRef.current = {
          top: pr.top,
          left: pr.left,
          width: pr.width,
          height: pr.height,
        };
      }
    }
  }, [isExpanded]);
  const showControls = !isTwoState || phase === "fullscreen";

  const [selectedPort, setSelectedPort] = useState<PortLocation | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<FerryRoute | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<ActiveVessel | null>(null);
  const [is3D, setIs3D] = useState(false);
  const is3DRef = useRef(false);
  const handleSelectPortRef = useRef<(port: PortLocation) => void>(() => { });
  const stopTurntable = useCallback(() => { }, []);
  const [vessels, setVessels] = useState<ActiveVessel[]>(() => computeFleetState(simulatedTime || new Date()));
  const [activeTab, setActiveTab] = useState<"planner" | "ports" | "ships">(() => showVessels ? "ships" : "planner");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Route planner state: origin and destination are blank by default with select placeholders
  const [planOriginId, setOriginPortId] = useState("");
  const [planDestId, setDestPortId] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const isSwappingRef = useRef(false);

  // Active selecting field: "origin" (user clicked Origin Pier to select), "destination" (user clicked Destination Pier), or null
  const [activeSelectingField, setActiveSelectingField] = useState<"origin" | "destination" | null>(null);
  const activeSelectingFieldRef = useRef<"origin" | "destination" | null>(null);
  activeSelectingFieldRef.current = activeSelectingField;

  const planOriginIdRef = useRef(planOriginId);
  planOriginIdRef.current = planOriginId;

  const phaseRef = useRef<SequencePhase>(phase);
  phaseRef.current = phase;

  // ─── Auth Gate Modal State (smooth slow in & out) ───
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);

  const openAuthModal = useCallback(() => {
    setShowAuthModal(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAuthModalVisible(true);
      });
    });
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalVisible(false);
    setTimeout(() => {
      setShowAuthModal(false);
    }, 1500);
  }, []);

  // Unified Discard Confirmation Modal State (smooth in & out animation)
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [discardModalVisible, setDiscardModalVisible] = useState(false);
  const [discardModalConfig, setDiscardModalConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);
  const discardModalConfigRef = useRef<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const openDiscardModal = useCallback(
    (config: { title: string; description: string; onConfirm: () => void }) => {
      discardModalConfigRef.current = config;
      setDiscardModalConfig(config);
      setShowDiscardModal(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDiscardModalVisible(true);
        });
      });
    },
    []
  );

  const closeDiscardModal = useCallback((confirmed = false) => {
    setDiscardModalVisible(false);
    setTimeout(() => {
      setShowDiscardModal(false);
      if (confirmed && discardModalConfigRef.current?.onConfirm) {
        discardModalConfigRef.current.onConfirm();
      }
      discardModalConfigRef.current = null;
      setDiscardModalConfig(null);
    }, 300);
  }, []);

  // Escape key closes discard modal smoothly
  useEffect(() => {
    if (!showDiscardModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDiscardModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDiscardModal, closeDiscardModal]);

  // Website refresh / tab close confirmation trap when there is an active route selection
  useEffect(() => {
    const hasOngoingActivity = Boolean(planOriginId || planDestId || selectedRoute);
    if (!hasOngoingActivity) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [planOriginId, planDestId, selectedRoute]);

  // Click-outside and Escape handler for auto-search dropdown in sidebar
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isSearchOpen]);

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

  const [sailingPref, setSailingPref] = useState<SailingPreference>(() => ({
    date: todayStr,
    timeOfDay: "all",
    timeFormat: "standard",
  }));

  const [hasSetSchedule, setHasSetSchedule] = useState(false);
  const [isSailingModalOpen, setIsSailingModalOpen] = useState(false);
  const [departureError, setDepartureError] = useState(false);
  const departureErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Seat Selection Page Transition Veil ───
  const [cabinBlackoutVisible, setCabinBlackoutVisible] = useState(false);

  const hasOngoingActivity = Boolean(
    planOriginId ||
    planDestId ||
    selectedRoute ||
    selectedPort ||
    selectedVessel ||
    sailingPref.selectedTemplateId ||
    hasSetSchedule
  );
  const hasOngoingActivityRef = useRef(false);
  hasOngoingActivityRef.current = hasOngoingActivity;

  // Guard against outdated dates if system clock ticks over midnight or simulated time changes
  useEffect(() => {
    if (!travelDate || travelDate < todayStr) {
      setTravelDate(todayStr);
      setSailingPref((prev) => ({ ...prev, date: todayStr }));
    }
  }, [todayStr, travelDate]);

  const tomorrowStr = useMemo(() => {
    const base = simulatedTime || new Date();
    const tom = new Date(base.getTime() + 24 * 60 * 60 * 1000);
    const year = tom.getFullYear();
    const month = String(tom.getMonth() + 1).padStart(2, "0");
    const day = String(tom.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [simulatedTime]);

  const formattedDate = useMemo(() => {
    if (!travelDate) return "Select sailing date";
    const parts = travelDate.split("-").map(Number);
    if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) return travelDate;
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const isToday = travelDate === todayStr;
    const isTomorrow = travelDate === tomorrowStr;

    const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
    const month = dateObj.toLocaleDateString("en-US", { month: "short" });
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();

    if (isToday) return `Today · ${weekday}, ${month} ${day}`;
    if (isTomorrow) return `Tomorrow · ${weekday}, ${month} ${day}`;
    return `${weekday}, ${month} ${day}, ${year}`;
  }, [travelDate, todayStr, tomorrowStr]);

  // Dynamic connected destination ports strictly derived from real ship routes
  const validDestinations = useMemo(() => {
    return getConnectedDestinationPorts(planOriginId);
  }, [planOriginId]);

  const lastSelectedRoute = useRef<FerryRoute | null>(null);
  if (selectedRoute) {
    lastSelectedRoute.current = selectedRoute;
  }
  const displayRoute = selectedRoute || lastSelectedRoute.current;

  // Resolve authentic matching schedule template for current route & direction
  const activeSchedule = useMemo(() => {
    if (!planOriginId || !planDestId) return null;
    const fromPort = BOHOL_PORTS.find((p) => p.id === planOriginId);
    const toPort = BOHOL_PORTS.find((p) => p.id === planDestId);
    if (!fromPort || !toPort) return null;

    if (sailingPref.selectedTemplateId) {
      const match = REAL_SCHEDULE_TEMPLATES.find(
        (t) =>
          t.templateId === sailingPref.selectedTemplateId &&
          matchPortToSchedule(fromPort, t.origin) &&
          matchPortToSchedule(toPort, t.destination)
      );
      if (match) return match;
    }

    const candidates = REAL_SCHEDULE_TEMPLATES.filter(
      (t) =>
        matchPortToSchedule(fromPort, t.origin) &&
        matchPortToSchedule(toPort, t.destination)
    );
    if (candidates.length === 0) return null;

    // Prefer fastcraft, or earliest scheduled departure
    const fastcraft = candidates.find((c) => c.category === "fastcraft");
    return fastcraft || candidates[0];
  }, [planOriginId, planDestId, sailingPref.selectedTemplateId]);

  const hasDepartureInput = Boolean(
    selectedRoute &&
    planOriginId &&
    planDestId &&
    hasSetSchedule &&
    (sailingPref.departureTime || activeSchedule?.departureTime)
  );

  // Target seat selection page URL
  const targetBookingUrl = useMemo(() => {
    const effectiveTemplateId = sailingPref.selectedTemplateId || activeSchedule?.templateId;
    const date = travelDate || todayStr;

    if (effectiveTemplateId) {
      const scheduleId = `${effectiveTemplateId}-${date}`;
      return `/schedules/${scheduleId}/seats`;
    }

    const originPort = BOHOL_PORTS.find((p) => p.id === planOriginId);
    const destPort = BOHOL_PORTS.find((p) => p.id === planDestId);
    const fallbackId = `voyage-${planOriginId || "port"}-${planDestId || "port"}-${date}`;
    const params = new URLSearchParams();
    if (originPort) params.set("origin", originPort.name);
    if (destPort) params.set("destination", destPort.name);
    if (travelDate) params.set("date", travelDate);
    return `/schedules/${fallbackId}/seats?${params.toString()}`;
  }, [planOriginId, planDestId, travelDate, todayStr, sailingPref.selectedTemplateId, activeSchedule]);

  const fromPortName = useMemo(() => {
    if (planOriginId) {
      const p = BOHOL_PORTS.find((port) => port.id === planOriginId);
      return p ? p.name : planOriginId;
    }
    if (displayRoute) {
      const p = BOHOL_PORTS.find((port) => port.id === displayRoute.fromId);
      return p ? p.name : displayRoute.fromId;
    }
    return "";
  }, [displayRoute, planOriginId]);

  const toPortName = useMemo(() => {
    if (planDestId) {
      const p = BOHOL_PORTS.find((port) => port.id === planDestId);
      return p ? p.name : planDestId;
    }
    if (displayRoute) {
      const p = BOHOL_PORTS.find((port) => port.id === displayRoute.toId);
      return p ? p.name : displayRoute.toId;
    }
    return "";
  }, [displayRoute, planDestId]);

  // Auto-search dropdown matches across all passenger ports and ferry routes
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { ports: [], routes: [] };

    const matchedPorts = BOHOL_PORTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q)
    );

    const matchedRoutes = FERRY_ROUTES.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.tag.toLowerCase().includes(q) ||
        r.fromId.toLowerCase().includes(q) ||
        r.toId.toLowerCase().includes(q)
    );

    return { ports: matchedPorts, routes: matchedRoutes };
  }, [searchQuery]);

  // Clear destination if it is no longer valid for the newly selected origin
  useEffect(() => {
    if (planDestId && !validDestinations.some((p) => p.id === planDestId)) {
      setDestPortId("");
      setSelectedRoute(null);
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
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      maxTileCacheSize: 1000, // Retains up to 1000 tiles in memory to prevent purging visited ports
      maxTileCacheZoomLevels: 10, // Keeps overview parent tiles ready as fallback background
      fadeDuration: 150, // Rapid symbol and tile appearance without lingering fade-in
      maxBounds: [
        [114.0, 4.0], // Broad regional basin boundary allowing free, fluid 3D horizon panning
        [134.0, 22.0],
      ],
      attributionControl: false,
    });

    map.getCanvas().addEventListener("contextmenu", (e) => e.preventDefault());

    mapRef.current = map;
    (window as any)._map = map;

    map.on("load", () => {
      // Pre-warm all Bohol port tiles in background cache
      preloadBoholPortTiles(maptilerKey);

      // 1. Add GeoJSON source for Ferry Routes (Initially empty in overview preview mode for clean visual)
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
          coordinates: isTwoState ? [route.path[0], route.path[0]] : route.path,
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
        el.id = `port-marker-${port.id}`;
        el.setAttribute("data-testid", `port-marker-${port.id}`);
        el.className = "group cursor-pointer flex items-center justify-center";
        el.style.width = "32px";
        el.style.height = "32px";
        el.style.position = "absolute";
        el.style.transition = "opacity 250ms ease-out"; // NEVER transition transform on MapLibre marker root!

        el.innerHTML = `
          <div class="port-ping absolute -inset-1.5 rounded-full pointer-events-none transition-opacity duration-300 ease-out opacity-0"></div>
          <div class="port-pin relative w-8 h-8 rounded-full bg-blue-600 text-white shadow-lg border-2 border-white flex items-center justify-center transition-colors duration-250 ease-out group-hover:scale-110">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="5" r="3"></circle>
              <line x1="12" y1="22" x2="12" y2="8"></line>
              <path d="M5 12H2a10 10 0 0 0 20 0h-3"></path>
            </svg>
          </div>
          <div class="port-label absolute top-full mt-1 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md text-[11px] font-bold text-slate-800 whitespace-nowrap transition-colors duration-250 ease-out group-hover:border-blue-500 group-hover:text-blue-600 pointer-events-none z-20">
            ${port.shortName}
          </div>
        `;

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (phaseRef.current === "preview") {
            startExpandSequence();
            return;
          }
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

  // Dynamically update port markers on map (highlight origin choices or designated destination piers with smooth in/out transitions)
  useEffect(() => {
    if (!markersRef.current) return;
    const isPlanner = activeTab === "planner";
    const isSelectingOrigin = isPlanner && activeSelectingField === "origin";
    const isSelectingDest = isPlanner && (activeSelectingField === "destination" || (Boolean(planOriginId) && !planDestId));
    const connectedDestIds = (isPlanner && planOriginId)
      ? new Set(getConnectedDestinationPorts(planOriginId).map((d) => d.id))
      : new Set<string>();

    BOHOL_PORTS.forEach((port) => {
      const marker = markersRef.current[port.id];
      if (!marker) return;
      const el = marker.getElement();
      if (!el) return;

      let pingEl = el.querySelector<HTMLDivElement>(".port-ping");
      let pinEl = el.querySelector<HTMLDivElement>(".port-pin");
      let labelEl = el.querySelector<HTMLDivElement>(".port-label");

      if (!pinEl || !labelEl || !pingEl) {
        el.innerHTML = `
          <div class="port-ping absolute -inset-1.5 rounded-full pointer-events-none transition-opacity duration-300 ease-out opacity-0"></div>
          <div class="port-pin relative w-8 h-8 rounded-full bg-blue-600 text-white shadow-lg border-2 border-white flex items-center justify-center transition-colors duration-250 ease-out group-hover:scale-110">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="5" r="3"></circle>
              <line x1="12" y1="22" x2="12" y2="8"></line>
              <path d="M5 12H2a10 10 0 0 0 20 0h-3"></path>
            </svg>
          </div>
          <div class="port-label absolute top-full mt-1 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-sm border border-slate-200 shadow-md text-[11px] font-bold text-slate-800 whitespace-nowrap transition-colors duration-250 ease-out group-hover:border-blue-500 group-hover:text-blue-600 pointer-events-none z-20">
            ${port.shortName}
          </div>
        `;
        pingEl = el.querySelector<HTMLDivElement>(".port-ping");
        pinEl = el.querySelector<HTMLDivElement>(".port-pin");
        labelEl = el.querySelector<HTMLDivElement>(".port-label");
        if (!pinEl || !labelEl || !pingEl) return;
      }

      const isOrigin = isPlanner && port.id === planOriginId;
      const isDestination = isPlanner && port.id === planDestId;
      const isSelectableOrigin = isSelectingOrigin && ROUTED_PORTS.some((rp) => rp.id === port.id);
      const isDesignatedDest = isSelectingDest && connectedDestIds.has(port.id);

      const basePin = "port-pin relative w-8 h-8 rounded-full text-white shadow-lg border-2 border-white flex items-center justify-center transition-colors duration-250 ease-out";
      const baseLabel = "port-label absolute top-full mt-1 px-2.5 py-0.5 rounded-full backdrop-blur-sm shadow-md text-[11px] font-bold whitespace-nowrap transition-colors duration-250 ease-out pointer-events-none z-20";

      // Keep label text completely stable — never glitch font size, weight, or length!
      labelEl.textContent = port.shortName;

      if (isSelectingOrigin) {
        if (isSelectableOrigin) {
          pinEl.className = `${basePin} bg-blue-600 ring-4 ring-blue-400/90 shadow-blue-500/50 cursor-pointer group-hover:scale-110`;
          labelEl.className = `${baseLabel} bg-blue-600 text-white border border-blue-700 shadow-md`;
          pingEl.className = "port-ping absolute -inset-1.5 rounded-full pointer-events-none transition-opacity duration-300 ease-out bg-blue-400/50 animate-ping opacity-100";
          el.style.opacity = "1";
          el.style.zIndex = "25";
          el.style.pointerEvents = "auto";
        } else {
          pinEl.className = `${basePin} bg-slate-400`;
          labelEl.className = `${baseLabel} bg-white/80 text-slate-400 border border-slate-200`;
          pingEl.className = "port-ping absolute -inset-1.5 rounded-full pointer-events-none transition-opacity duration-300 ease-out opacity-0";
          el.style.opacity = "0.25";
          el.style.zIndex = "10";
          el.style.pointerEvents = "none";
        }
      } else if (isSelectingDest) {
        if (isOrigin) {
          pinEl.className = `${basePin} bg-blue-600 ring-4 ring-blue-400/80 shadow-blue-500/40 cursor-pointer`;
          labelEl.className = `${baseLabel} bg-blue-600 text-white border border-blue-700 shadow-md`;
          pingEl.className = "port-ping absolute -inset-1.5 rounded-full pointer-events-none transition-opacity duration-300 ease-out opacity-0";
          el.style.opacity = "1";
          el.style.zIndex = "30";
          el.style.pointerEvents = "auto";
        } else if (isDesignatedDest) {
          pinEl.className = `${basePin} bg-emerald-500 ring-4 ring-emerald-400/90 shadow-emerald-400/50 cursor-pointer group-hover:scale-110`;
          labelEl.className = `${baseLabel} bg-emerald-600 text-white border border-emerald-700 shadow-md`;
          pingEl.className = "port-ping absolute -inset-1.5 rounded-full pointer-events-none transition-opacity duration-300 ease-out bg-emerald-400/50 animate-ping opacity-100";
          el.style.opacity = "1";
          el.style.zIndex = "25";
          el.style.pointerEvents = "auto";
        } else {
          pinEl.className = `${basePin} bg-slate-400`;
          labelEl.className = `${baseLabel} bg-white/80 text-slate-400 border border-slate-200`;
          pingEl.className = "port-ping absolute -inset-1.5 rounded-full pointer-events-none transition-opacity duration-300 ease-out opacity-0";
          el.style.opacity = "0.2";
          el.style.zIndex = "10";
          el.style.pointerEvents = "none";
        }
      } else if (isPlanner && planOriginId && planDestId) {
        if (isOrigin) {
          pinEl.className = `${basePin} bg-blue-600 ring-4 ring-blue-400/80 shadow-blue-500/40 cursor-pointer`;
          labelEl.className = `${baseLabel} bg-blue-600 text-white border border-blue-700 shadow-md`;
          pingEl.className = "port-ping absolute -inset-1.5 rounded-full pointer-events-none transition-opacity duration-300 ease-out opacity-0";
          el.style.opacity = "1";
          el.style.zIndex = "30";
          el.style.pointerEvents = "auto";
        } else if (isDestination) {
          pinEl.className = `${basePin} bg-emerald-600 ring-4 ring-emerald-400/80 shadow-emerald-500/40 cursor-pointer`;
          labelEl.className = `${baseLabel} bg-emerald-600 text-white border border-emerald-700 shadow-md`;
          pingEl.className = "port-ping absolute -inset-1.5 rounded-full pointer-events-none transition-opacity duration-300 ease-out opacity-0";
          el.style.opacity = "1";
          el.style.zIndex = "30";
          el.style.pointerEvents = "auto";
        } else {
          pinEl.className = `${basePin} bg-slate-400`;
          labelEl.className = `${baseLabel} bg-white/80 text-slate-400 border border-slate-200`;
          pingEl.className = "port-ping absolute -inset-1.5 rounded-full pointer-events-none transition-opacity duration-300 ease-out opacity-0";
          el.style.opacity = "0.35";
          el.style.zIndex = "10";
          el.style.pointerEvents = "none";
        }
      } else {
        // Idle state in planner or standard ports tab
        pinEl.className = `${basePin} bg-blue-600 group-hover:scale-110`;
        labelEl.className = `${baseLabel} bg-white/95 text-slate-800 border border-slate-200 group-hover:border-blue-500 group-hover:text-blue-600`;
        pingEl.className = "port-ping absolute -inset-1.5 rounded-full pointer-events-none transition-opacity duration-300 ease-out opacity-0";
        el.style.opacity = "1";
        el.style.zIndex = "15";
        el.style.pointerEvents = isPlanner ? "none" : "auto";
      }
    });
  }, [activeTab, planOriginId, planDestId, activeSelectingField]);

  // Smooth camera interactions with 3D persistence and seamless pan (no tile loading/unloading)
  function executeSelectPort(port: PortLocation) {
    setSelectedPort(port);
    setSelectedRoute(null);
    setSelectedVessel(null);
    setSidebarOpen(true);
    setActiveTab("ports");

    const map = mapRef.current;
    if (!map) return;

    map.stop();

    const isCurrently3D = is3DRef.current || map.getPitch() > 20;
    const isMobile = window.innerWidth < 1024;
    const padLeft = (!isMobile && sidebarOpen) ? 420 : 0;
    const padBottom = (isMobile && sidebarOpen) ? 300 : 0;

    if (!isCurrently3D) {
      // 2D: Smooth ground pan to target port without tile thrashing, offset for sidebar
      map.easeTo({
        center: port.coordinates,
        padding: { top: 0, bottom: padBottom, left: padLeft, right: 0 },
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
        padding: { top: 0, bottom: 0, left: padLeft, right: 0 },
        zoom: 11.8,
        pitch: 52,
        bearing: curBearing + 180,
        duration: 2000,
        easing: (t) => t * (2 - t),
        essential: true,
      });
    }
  }

  function handleSelectPort(port: PortLocation) {
    if (activeTab === "planner") {
      setSidebarOpen(true);

      // Only let users select ports if they clicked Origin Pier first
      if (activeSelectingFieldRef.current === "origin") {
        handleOriginChange(port.id);
        setActiveSelectingField("destination");
        activeSelectingFieldRef.current = "destination";
        return;
      }

      // If user clicks the currently selected origin port, switch into origin selection mode
      if (port.id === planOriginIdRef.current) {
        setActiveSelectingField("origin");
        activeSelectingFieldRef.current = "origin";
        return;
      }

      // Then destination ONLY to their designated routes
      const effectiveOrigin = planOriginIdRef.current;
      if ((activeSelectingFieldRef.current === "destination" || (!planDestId && effectiveOrigin)) && effectiveOrigin) {
        const connected = getConnectedDestinationPorts(effectiveOrigin);
        const isDesignated = connected.some((d) => d.id === port.id);
        if (isDesignated) {
          handleDestinationChange(port.id);
          setActiveSelectingField(null);
          activeSelectingFieldRef.current = null;
        }
        // If not a designated route: DO NOTHING! Never select, never overwrite origin!
        return;
      }

      // If user hasn't clicked Origin Pier or Destination Pier, do not hijack selection
      return;
    }

    executeSelectPort(port);
  }
  handleSelectPortRef.current = handleSelectPort;

  function fitRouteBounds(
    map: maplibregl.Map,
    coords: [number, number][],
    routeId?: string,
    options?: { duration?: number; speed?: number; curve?: number; is3DMode?: boolean }
  ) {
    if (!coords || coords.length === 0) return;
    const bounds = coords.reduce(
      (b, coord) => b.extend(coord),
      new maplibregl.LngLatBounds(coords[0], coords[0])
    );

    const isCurrently3D = options?.is3DMode ?? (is3DRef.current || map.getPitch() > 20);
    const isMobile = window.innerWidth < 1024;

    // Center camera to the route: balanced padding on desktop and mobile
    const padding = isMobile
      ? { top: 60, bottom: sidebarOpen ? 300 : 80, left: 20, right: 20 }
      : { top: 80, bottom: 80, left: sidebarOpen ? 420 : 80, right: 80 };

    // Zoom out a little bit if Tagbilaran to Larena (Siquijor) so both ports have comfortable breathing room
    const isTagbLarena = routeId === "tagbilaran-siquijor" || routeId === "siquijor-tagbilaran";
    const maxZoom = isTagbLarena ? 9.2 : 10.4;

    const fitOptions: maplibregl.FitBoundsOptions = {
      padding,
      maxZoom,
      pitch: isCurrently3D ? 48 : 0,
      bearing: isCurrently3D ? -15 : 0,
    };

    if (options?.duration !== undefined) fitOptions.duration = options.duration;
    if (options?.speed !== undefined) fitOptions.speed = options.speed;
    if (options?.curve !== undefined) fitOptions.curve = options.curve;

    map.fitBounds(bounds, fitOptions);
  }

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
    setHasSetSchedule(false);
    setIsSailingModalOpen(true);

    if (fitBounds && mapRef.current) {
      fitRouteBounds(mapRef.current, route.path, route.id, { speed: 0.5, curve: 1.3 });
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
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
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
    const map = mapRef.current;
    map.stop();
    const next3D = !is3D;
    setIs3D(next3D);
    is3DRef.current = next3D;

    if (next3D) {
      // Pre-warm all Bohol port tiles in cache to eliminate blank boxes on far port switches
      preloadBoholPortTiles(import.meta.env.VITE_MAPTILER_KEY);
    }

    if (selectedRoute) {
      // Keep active route smoothly centered in view with balanced bounds
      const targetPath = (planOriginId && selectedRoute.toId === planOriginId)
        ? ([...selectedRoute.path].reverse() as [number, number][])
        : (selectedRoute.path as [number, number][]);

      fitRouteBounds(map, targetPath, selectedRoute.id, { duration: 900, is3DMode: next3D });
    } else if (planOriginId) {
      const originPort = BOHOL_PORTS.find((p) => p.id === planOriginId);
      const centerCoord = originPort ? originPort.coordinates : map.getCenter();
      map.easeTo({
        pitch: next3D ? 48 : 0,
        bearing: next3D ? -12 : 0,
        center: centerCoord,
        zoom: 10.2,
        duration: 900,
      });
    } else if (selectedPort) {
      map.easeTo({
        pitch: next3D ? 52 : 0,
        bearing: next3D ? -15 : 0,
        center: selectedPort.coordinates,
        zoom: 11.6,
        duration: 900,
      });
    } else {
      // Preserves current viewport center seamlessly without jumping
      map.easeTo({
        pitch: next3D ? 48 : 0,
        bearing: next3D ? -15 : 0,
        center: map.getCenter(),
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

  function handleOverviewButtonClick() {
    const hasOngoingActivity = Boolean(planOriginId || planDestId || selectedRoute || selectedPort);
    if (hasOngoingActivity) {
      openDiscardModal({
        title: "Discard Booking Selection?",
        description: "Do you want to discard your current route selection and reset the map to overview mode?",
        onConfirm: handleConfirmDiscardAndResetOverview,
      });
    } else {
      handleConfirmDiscardAndResetOverview();
    }
  }

  function handleConfirmDiscardAndResetOverview() {
    setSelectedPort(null);
    setSelectedRoute(null);
    setSelectedVessel(null);
    setIs3D(false);
    is3DRef.current = false;
    setOriginPortId("");
    setDestPortId("");
    setHasSetSchedule(false);

    if (!mapRef.current) return;
    const map = mapRef.current;
    map.stop();

    // 1. Smoothly ease camera to overview center
    map.easeTo({
      center: [124.15, 9.82],
      zoom: 8.6,
      pitch: 0,
      bearing: 0,
      padding: { left: 0, right: 0, top: 0, bottom: 0 },
      duration: 1200,
    });

    const source = map.getSource("ferry-routes") as maplibregl.GeoJSONSource;
    if (!source) return;

    if (rafLoopRef.current) cancelAnimationFrame(rafLoopRef.current);

    // 2. Smoothly hide active route over 450ms, then reveal all routes from 0% -> 100%
    animateRetractAllRouteTrimPaths(450, () => {
      map.setPaintProperty("ferry-routes-line", "line-opacity", 1);
      map.setPaintProperty("ferry-routes-halo", "line-opacity", 0.95);

      const animStart = performance.now();
      const animDuration = MAP_TRANSITION_CONFIG.routeDrawDuration;

      const step = (now: number) => {
        const elapsed = now - animStart;
        const progress = Math.min(1, elapsed / animDuration);
        const eased = progress;

        const animatedFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = FERRY_ROUTES.map((route) => ({
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
            coordinates: getTrimmedPathCoordinates(route.path as [number, number][], eased),
          },
        }));

        source.setData({
          type: "FeatureCollection",
          features: animatedFeatures,
        });

        if (progress < 1) {
          rafLoopRef.current = requestAnimationFrame(step);
        } else {
          routesRetractedRef.current = false;
        }
      };

      rafLoopRef.current = requestAnimationFrame(step);
    });
  }



  function resetRouteTrimPaths() {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource("ferry-routes") as maplibregl.GeoJSONSource;
    if (!source) return;

    if (rafLoopRef.current) cancelAnimationFrame(rafLoopRef.current);
    routesRetractedRef.current = true;

    // Reset opacity to full
    if (mapRef.current) {
      mapRef.current.setPaintProperty("ferry-routes-line", "line-opacity", 1);
      mapRef.current.setPaintProperty("ferry-routes-halo", "line-opacity", 0.95);
    }

    const emptyFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = FERRY_ROUTES.map((route) => ({
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
        coordinates: [route.path[0], route.path[0]],
      },
    }));
    source.setData({
      type: "FeatureCollection",
      features: emptyFeatures,
    });
  }

  function animateSingleRouteTrimPath(
    targetRoute: FerryRoute,
    duration = MAP_TRANSITION_CONFIG.routeDrawDuration,
    originId?: string
  ) {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource("ferry-routes") as maplibregl.GeoJSONSource;
    if (!source) return;

    if (rafLoopRef.current) cancelAnimationFrame(rafLoopRef.current);
    routesRetractedRef.current = false;

    // Reset opacity to full for coordinate-based animation
    mapRef.current.setPaintProperty("ferry-routes-line", "line-opacity", 1);
    mapRef.current.setPaintProperty("ferry-routes-halo", "line-opacity", 0.95);

    const animStart = performance.now();

    // If origin matches toId, reverse coordinates so route stroke draws from origin to destination
    const targetPath = (originId && targetRoute.toId === originId)
      ? ([...targetRoute.path].reverse() as [number, number][])
      : (targetRoute.path as [number, number][]);

    const step = (now: number) => {
      const elapsed = now - animStart;
      const progress = Math.min(1, elapsed / duration);
      const eased = progress; // Normal linear movement (0.0 -> 1.0)

      const animatedFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = FERRY_ROUTES.map((route) => {
        if (route.id === targetRoute.id) {
          return {
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
              coordinates: getTrimmedPathCoordinates(targetPath, eased),
            },
          };
        }
        return {
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
            coordinates: [route.path[0], route.path[0]],
          },
        };
      });

      source.setData({
        type: "FeatureCollection",
        features: animatedFeatures,
      });

      if (progress < 1) {
        rafLoopRef.current = requestAnimationFrame(step);
      }
    };

    rafLoopRef.current = requestAnimationFrame(step);
  }

  function animateRetractAllRouteTrimPaths(duration = 1500, onComplete?: () => void) {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (rafLoopRef.current) cancelAnimationFrame(rafLoopRef.current);

    const animStart = performance.now();

    const step = (now: number) => {
      const elapsed = now - animStart;
      const progress = Math.min(1, elapsed / duration);

      // GPU-accelerated: fade out all routes via paint property
      const opacity = 1 - progress; // 1.0 -> 0.0
      map.setPaintProperty("ferry-routes-line", "line-opacity", opacity);
      map.setPaintProperty("ferry-routes-halo", "line-opacity", opacity * 0.95);

      if (progress < 1) {
        rafLoopRef.current = requestAnimationFrame(step);
      } else {
        routesRetractedRef.current = true;
        if (onComplete) onComplete();
      }
    };

    rafLoopRef.current = requestAnimationFrame(step);
  }

  function handleOriginChange(newOriginId: string, duration = 1500) {
    setSidebarOpen(true);
    isSwappingRef.current = false;
    setIsSwapping(false);
    setOriginPortId(newOriginId);
    setDestPortId("");
    setSelectedRoute(null);
    setHasSetSchedule(false);
    setSailingPref((prev) => ({
      ...prev,
      selectedTemplateId: undefined,
      vesselName: undefined,
      operator: undefined,
      departureTime: undefined,
      arrivalTime: undefined,
      price: undefined,
    }));

    // Clear any pending sequence timers from a previous origin change
    sequenceTimers.current.forEach(clearTimeout);
    sequenceTimers.current = [];

    // Only retract if routes are currently visible
    if (!routesRetractedRef.current) {
      animateRetractAllRouteTrimPaths(duration);
    }

    if (!newOriginId) return;

    const originPort = BOHOL_PORTS.find((p) => p.id === newOriginId);
    if (!originPort) return;

    setSelectedPort(originPort);

    // Move camera to the selected pier (offset for sidebar, clean coastal altitude)
    if (mapRef.current) {
      const isCurrently3D = is3DRef.current || mapRef.current.getPitch() > 20;
      const isMobile = window.innerWidth < 1024;
      const padLeft = (!isMobile && sidebarOpen) ? 420 : 0;
      const padBottom = (isMobile && sidebarOpen) ? 280 : 0;
      mapRef.current.easeTo({
        center: originPort.coordinates,
        padding: { top: 0, bottom: padBottom, left: padLeft, right: 0 },
        zoom: 9.1, // Clean maritime view showing connected destination ports across the water
        pitch: isCurrently3D ? 48 : 0,
        bearing: isCurrently3D ? -12 : 0,
        duration: duration,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    }
  }

  function handleDestinationChange(newDestId: string, duration = 1500) {
    setSidebarOpen(true);
    isSwappingRef.current = false;
    setIsSwapping(false);
    setDestPortId(newDestId);
    setHasSetSchedule(false);
    setDepartureError(false);
    setSailingPref((prev) => ({
      ...prev,
      selectedTemplateId: undefined,
      vesselName: undefined,
      operator: undefined,
      departureTime: undefined,
      arrivalTime: undefined,
      price: undefined,
    }));
    if (!planOriginId || !newDestId) {
      setSelectedRoute(null);
      resetRouteTrimPaths();
      return;
    }

    const route = getRouteBetweenPorts(planOriginId, newDestId);
    if (route) {
      setSelectedRoute(route);
      animateSingleRouteTrimPath(route, duration, planOriginId);

      if (mapRef.current) {
        const targetPath = (route.toId === planOriginId)
          ? ([...route.path].reverse() as [number, number][])
          : (route.path as [number, number][]);

        fitRouteBounds(mapRef.current, targetPath, route.id, { duration });
      }
    } else {
      setSelectedRoute(null);
      resetRouteTrimPaths();
    }
  }

  function handleSwapPlanner() {
    // Guard against rapid clicking / transition interruption to prevent wiggling
    if (!planOriginId || !planDestId || isSwappingRef.current) return;

    isSwappingRef.current = true;
    setIsSwapping(true);

    const oldOrigin = planOriginId;
    const oldDest = planDestId;

    // Swap origin and destination
    const newOrigin = oldDest;
    const newDest = oldOrigin;

    setOriginPortId(newOrigin);
    setDestPortId(newDest);
    setSidebarOpen(true);
    setActiveSelectingField(null);
    setHasSetSchedule(false);
    setDepartureError(false);
    setSailingPref((prev) => ({
      ...prev,
      selectedTemplateId: undefined,
      vesselName: undefined,
      operator: undefined,
      departureTime: undefined,
      arrivalTime: undefined,
      price: undefined,
    }));

    const newOriginPort = BOHOL_PORTS.find((p) => p.id === newOrigin);
    if (newOriginPort) {
      setSelectedPort(newOriginPort);
    }

    const route = getRouteBetweenPorts(newOrigin, newDest);
    if (!route || !mapRef.current) {
      isSwappingRef.current = false;
      setIsSwapping(false);
      return;
    }

    setSelectedRoute(route);

    if (rafLoopRef.current) cancelAnimationFrame(rafLoopRef.current);
    sequenceTimers.current.forEach(clearTimeout);
    sequenceTimers.current = [];

    const map = mapRef.current;
    const source = map.getSource("ferry-routes") as maplibregl.GeoJSONSource;
    const isCurrently3D = is3DRef.current || map.getPitch() > 20;

    // The old path (which was drawn from oldOrigin to oldDest)
    const oldPath = (route.fromId === oldOrigin)
      ? (route.path as [number, number][])
      : ([...route.path].reverse() as [number, number][]);

    // The new path (which will draw from newOrigin to newDest)
    const newPath = (route.fromId === newOrigin)
      ? (route.path as [number, number][])
      : ([...route.path].reverse() as [number, number][]);

    // 1. Move camera smoothly to the new origin port at steady cruising altitude (NO zoom dive, so no roads/lakes flash)
    const transitionMs = 650;
    if (newOriginPort) {
      map.easeTo({
        center: newOriginPort.coordinates,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
        pitch: isCurrently3D ? 48 : 0,
        bearing: isCurrently3D ? -12 : 0,
        duration: transitionMs,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    }

    // 2. Retract the old route stroke like a worm following the camera into the new origin:
    // Tail pulls forward from oldOrigin (100%) and shrinks into oldDest/newOrigin (0%)
    const retractStart = performance.now();

    const retractStep = (now: number) => {
      const elapsed = now - retractStart;
      const progress = Math.min(1, elapsed / transitionMs);
      // Ease out in lockstep with the camera easeTo
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      if (source) {
        source.setData({
          type: "FeatureCollection",
          features: [
            {
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
                coordinates: getTrimmedPathCoordinates(oldPath, 1.0, easedProgress),
              },
            },
          ],
        });
      }

      if (progress < 1) {
        rafLoopRef.current = requestAnimationFrame(retractStep);
      } else {
        // 3. Once camera arrives at new origin and old stroke retracted:
        // Animate the inverted stroke from new origin to destination (0.0 -> 1.0)
        // and glide camera to the center of the route, staying on that middle route (not offset).
        const drawTimer = setTimeout(() => {
          animateSingleRouteTrimPath(route, 1400, newOrigin);

          fitRouteBounds(map, newPath, route.id, { duration: 1400 });

          // Unlock swap transition once camera settles into route view
          const unlockTimer = setTimeout(() => {
            isSwappingRef.current = false;
            setIsSwapping(false);
          }, 800);
          sequenceTimers.current.push(unlockTimer);
        }, 60);

        sequenceTimers.current.push(drawTimer);
      }
    };

    rafLoopRef.current = requestAnimationFrame(retractStep);
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
        borderRadius: "1.75rem",
        zIndex: 9999,
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
            zIndex: 9999,
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

      // Step 3: Trigger smooth trim-path vector route line drawing animation
      const startTrimPathAnimation = () => {
        if (!mapRef.current) return;
        const source = mapRef.current.getSource("ferry-routes") as maplibregl.GeoJSONSource;
        if (!source) return;

        // Reset opacity to full before drawing
        mapRef.current.setPaintProperty("ferry-routes-line", "line-opacity", 1);
        mapRef.current.setPaintProperty("ferry-routes-halo", "line-opacity", 0.95);

        const animStart = performance.now();
        const animDuration = 1500; // 1.5s smooth route line draw

        const step = (now: number) => {
          const elapsed = now - animStart;
          const progress = Math.min(1, elapsed / animDuration);
          const eased = progress; // Normal linear movement (0.0 -> 1.0)

          const animatedFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = FERRY_ROUTES.map((route) => ({
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
              coordinates: getTrimmedPathCoordinates(route.path as [number, number][], eased),
            },
          }));

          source.setData({
            type: "FeatureCollection",
            features: animatedFeatures,
          });

          if (progress < 1) {
            rafLoopRef.current = requestAnimationFrame(step);
          } else {
            routesRetractedRef.current = false;
          }
        };

        rafLoopRef.current = requestAnimationFrame(step);
      };

      startTrimPathAnimation();

      // Controls and sidebar slide in once expansion reaches full size
      const t2 = setTimeout(() => {
        setPhase("fullscreen");
        setSidebarOpen(true);
        mapRef.current?.resize();
      }, MAP_TRANSITION_CONFIG.expandDuration + MAP_TRANSITION_CONFIG.controlsSlideInDelay);

      sequenceTimers.current.push(t2);
    }, MAP_TRANSITION_CONFIG.centerScrollDuration);

    sequenceTimers.current.push(t1);
  }, [isTwoState, phase]);

  // Cinematic in-place transition to 3D cabin (Option A) — Stutter-free 60fps sequence
  const triggerCabinTransition = useCallback(() => {
    // 1. If map is in preview card mode, expand smoothly first
    if (isTwoState && phase === "preview") {
      startExpandSequence();
    }

    // 2. Camera flies into departure port with smooth deceleration
    const originPort = BOHOL_PORTS.find((p) => p.id === planOriginId);
    if (originPort && mapRef.current) {
      mapRef.current.flyTo({
        center: originPort.coordinates,
        zoom: 13.8,
        pitch: 42,
        bearing: 25,
        duration: 750,
        curve: 1.2,
        essential: true,
      });
    }

    // 3. Deep Marine Midnight Blue transition begins mid-flight
    const tOverlay = setTimeout(() => {
      setCabinBlackoutVisible(true);
    }, 150);
    sequenceTimers.current.push(tOverlay);

    // 4. Once screen is 100% covered in dark blue (at 650ms), navigate to dedicated seat selection page
    const tNavigate = setTimeout(() => {
      mapRef.current?.stop();
      navigate(targetBookingUrl, {
        state: {
          transitionFromMap: true,
          fromPortName,
          toPortName,
          travelDate,
          departureTime: sailingPref.departureTime || activeSchedule?.departureTime || "08:00",
          arrivalTime: activeSchedule?.arrivalTime || "10:00",
          duration: selectedRoute?.duration || "2h 00m",
          basePrice: activeSchedule?.price ?? 800,
          vesselCategory: activeSchedule?.category,
          vesselName: activeSchedule?.vehicleName || selectedRoute?.name,
        },
      });

      // Reset veil opacity after navigation completes
      const tReset = setTimeout(() => {
        setCabinBlackoutVisible(false);
      }, 350);
      sequenceTimers.current.push(tReset);
    }, 650);
    sequenceTimers.current.push(tNavigate);
  }, [
    isTwoState,
    phase,
    startExpandSequence,
    planOriginId,
    targetBookingUrl,
    navigate,
    fromPortName,
    toPortName,
    travelDate,
    sailingPref.departureTime,
    activeSchedule,
    selectedRoute,
  ]);

  function handleProceedClick(e: React.MouseEvent) {
    if (!planOriginId || !planDestId) {
      e.preventDefault();
      return;
    }

    if (!hasDepartureInput) {
      e.preventDefault();
      setDepartureError(true);
      if (departureErrorTimeoutRef.current) clearTimeout(departureErrorTimeoutRef.current);
      departureErrorTimeoutRef.current = setTimeout(() => {
        setDepartureError(false);
      }, 1500);
      setIsSailingModalOpen(true);
      return;
    }

    // Auth gate: require sign-in before proceeding to seat selection
    if (!authLoading && !user) {
      e.preventDefault();
      openAuthModal();
      return;
    }

    e.preventDefault();
    triggerCabinTransition();
  }

  function handleDirectSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!planOriginId || !planDestId) return;

    if (!hasDepartureInput) {
      setDepartureError(true);
      if (departureErrorTimeoutRef.current) clearTimeout(departureErrorTimeoutRef.current);
      departureErrorTimeoutRef.current = setTimeout(() => {
        setDepartureError(false);
      }, 1500);
      setIsSailingModalOpen(true);
      return;
    }

    triggerCabinTransition();
  }

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
      let init = initialRectRef.current;

      // Dynamically measure live placeholder geometry if available in the DOM
      if (placeholderRef.current) {
        const pr = placeholderRef.current.getBoundingClientRect();
        if (pr.width > 50 && pr.height > 50) {
          init = {
            top: pr.top,
            left: pr.left,
            width: pr.width,
            height: pr.height,
          };
          initialRectRef.current = init;
        }
      }

      // Robust fallback if uninitialized or 0x0 (e.g., returning from seat selection page)
      if (!init || init.width < 50 || init.height < 50) {
        const fallbackW = Math.min(window.innerWidth - 48, 1200);
        const fallbackH = placeholderHeight || 580;
        init = {
          top: Math.max(20, (window.innerHeight - fallbackH) / 2),
          left: Math.max(20, (window.innerWidth - fallbackW) / 2),
          width: fallbackW,
          height: fallbackH,
        };
        initialRectRef.current = init;
      }

      setContainerStyle({
        position: "fixed",
        top: `${init.top}px`,
        left: `${init.left}px`,
        width: `${init.width}px`,
        height: `${init.height}px`,
        borderRadius: "1.75rem",
        zIndex: 9999,
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

      // Reset route lines to hidden state in preview mode
      if (isTwoState && mapRef.current) {
        const source = mapRef.current.getSource("ferry-routes") as maplibregl.GeoJSONSource;
        if (source) {
          const emptyFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = FERRY_ROUTES.map((route) => ({
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
              coordinates: [route.path[0], route.path[0]],
            },
          }));
          source.setData({
            type: "FeatureCollection",
            features: emptyFeatures,
          });
        }
      }

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

          // Wait for DOM layout to settle after clearing fixed position before centering map
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (mapRef.current) {
                mapRef.current.resize();
                mapRef.current.easeTo({
                  center: [124.15, 9.82],
                  zoom: 8.6,
                  pitch: 0,
                  bearing: 0,
                  padding: { left: 0, right: 0, top: 0, bottom: 0 },
                  duration: 500,
                });
              }
            });
          });
        }
      }, MAP_TRANSITION_CONFIG.collapseDuration);

      sequenceTimers.current.push(t2);
    }, MAP_TRANSITION_CONFIG.controlsSlideOutDuration);

    sequenceTimers.current.push(t1);
  }, [stopTurntable, isTwoState, placeholderHeight]);

  const handleRequestExitMap = useCallback((syncHistory = true) => {
    if (showDiscardModal) return;

    const hasActivity = Boolean(
      planOriginId ||
      planDestId ||
      selectedRoute ||
      selectedPort ||
      selectedVessel ||
      sailingPref.selectedTemplateId ||
      hasSetSchedule
    );

    if (hasActivity) {
      openDiscardModal({
        title: "Discard Booking Selection?",
        description:
          "You have an active route selection in progress. Discard your current booking selection and exit the transit map?",
        onConfirm: () => {
          setOriginPortId("");
          setDestPortId("");
          setSelectedRoute(null);
          resetRouteTrimPaths();
          setSelectedPort(null);
          setSelectedVessel(null);
          setHasSetSchedule(false);
          startExitSequence(syncHistory);
        },
      });
    } else {
      startExitSequence(syncHistory);
    }
  }, [
    showDiscardModal,
    planOriginId,
    planDestId,
    selectedRoute,
    selectedPort,
    selectedVessel,
    sailingPref.selectedTemplateId,
    hasSetSchedule,
    openDiscardModal,
    resetRouteTrimPaths,
    startExitSequence,
  ]);

  // Lock body & root scroll and nuke AppLayout header during map expansion
  useEffect(() => {
    if (isExpanded) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyOverscroll = document.body.style.overscrollBehavior;
      const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      document.documentElement.style.overscrollBehavior = "none";

      document.body.classList.add("map-fullscreen-active");
      document.documentElement.classList.add("map-fullscreen-active");

      window.dispatchEvent(
        new CustomEvent("map-fullscreen-change", { detail: { isFullscreen: true } })
      );

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;

        document.body.classList.remove("map-fullscreen-active");
        document.documentElement.classList.remove("map-fullscreen-active");

        window.dispatchEvent(
          new CustomEvent("map-fullscreen-change", { detail: { isFullscreen: false } })
        );
      };
    }
  }, [isExpanded]);

  // Keyboard shortcut: Escape exits fullscreen mode + Android back gesture support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (phase === "fullscreen" || phase === "expanding")) {
        if (showDiscardModal || isSailingModalOpen) {
          return;
        }
        e.preventDefault();
        handleRequestExitMap(true);
      }
    };
    const onPopState = () => {
      if (phase === "fullscreen" || phase === "expanding") {
        if (hasOngoingActivityRef.current) {
          try {
            window.history.pushState({ mapExpanded: true }, "");
          } catch {
            // ignore
          }
          handleRequestExitMap(false);
        } else {
          startExitSequence(false);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
    };
  }, [phase, showDiscardModal, isSailingModalOpen, handleRequestExitMap, startExitSequence]);

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
          className="w-full rounded-[28px] sm:rounded-[32px] min-h-[440px] sm:min-h-[540px] lg:min-h-[640px] bg-slate-100/40 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800"
        />
      )}

      {/* ─── Map Container ─── */}
      <div
        ref={animatedContainerRef}
        style={containerStyle}
        className={`${isExpanded
          ? "overflow-hidden"
          : "relative w-full rounded-[28px] sm:rounded-[32px] overflow-hidden border border-slate-200/90 dark:border-slate-800/90 shadow-xl min-h-[440px] sm:min-h-[540px] lg:min-h-[640px]"
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


            {/* ─── Google Maps-Style Left Sidebar (Desktop) / Mobile Bottom Sheet (< 1024px) ─── */}
            <div
              className={`fixed lg:absolute bottom-0 lg:bottom-0 left-0 right-0 lg:right-auto lg:top-0 z-30 w-full lg:w-[390px] lg:max-w-[92vw] max-h-[82vh] lg:max-h-full h-auto lg:h-full flex flex-col bg-white dark:bg-slate-900 rounded-t-[28px] lg:rounded-none border-t lg:border-t-0 lg:border-r border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${showControls && sidebarOpen
                ? "translate-y-0 opacity-100 pointer-events-auto lg:translate-x-0 lg:translate-y-0"
                : "translate-y-full opacity-0 pointer-events-none lg:-translate-x-full lg:translate-y-0"
                }`}
              aria-label="Transit Route Planner and Piers"
            >
              {/* Mobile Drag Handle Indicator (Subtle, clean, no text) */}
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-0.5 shrink-0 lg:hidden" aria-hidden="true" />

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
                      onClick={handleOverviewButtonClick}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Re-center map camera to overview position"
                      aria-label="Re-center overview camera"
                    >
                      <Map size={14} />
                      <span>Overview</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Collapse Panel"
                    aria-label="Collapse Panel"
                  >
                    <ChevronDown size={18} className="lg:hidden" />
                    <ChevronLeft size={18} className="hidden lg:block" />
                  </button>
                  {isTwoState && (
                    <button
                      type="button"
                      onClick={() => handleRequestExitMap(true)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Exit Full Screen Map"
                      aria-label="Exit Full Screen Map"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Bar inside Sidebar with Auto-Search Dropdown */}
              <div ref={searchContainerRef} className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 relative">
                <div className="flex items-center bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 gap-2 transition-all focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-blue-500/10">
                  <Search size={15} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search piers, routes, or terminals..."
                    value={searchQuery}
                    onFocus={() => setIsSearchOpen(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    className="w-full text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setIsSearchOpen(false);
                      }}
                      className="p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Floating Auto-Search Dropdown Menu */}
                <div
                  className={`absolute top-[calc(100%+4px)] left-3 right-3 z-50 p-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-2 max-h-72 overflow-y-auto custom-scrollbar transform origin-top transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isSearchOpen && searchQuery.trim().length > 0
                      ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                  }`}
                >
                  {searchMatches.ports.length === 0 && searchMatches.routes.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 font-medium">
                      No matching piers or ferry routes found
                    </div>
                  ) : (
                    <>
                      {searchMatches.ports.length > 0 && (
                        <div className="space-y-1">
                          <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Piers ({searchMatches.ports.length})
                          </p>
                          {searchMatches.ports.map((port) => (
                            <button
                              key={`search-port-${port.id}`}
                              type="button"
                              onClick={() => {
                                setSearchQuery("");
                                setIsSearchOpen(false);
                                if (activeTab === "planner") {
                                  handleOriginChange(port.id);
                                } else {
                                  handleSelectPort(port);
                                }
                              }}
                              className="w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between text-xs hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                  <MapPin size={13} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                    {port.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                    {port.city}, {port.province}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight size={13} className="text-slate-400 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}

                      {searchMatches.routes.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Ferry Routes ({searchMatches.routes.length})
                          </p>
                          {searchMatches.routes.map((route) => (
                            <button
                              key={`search-route-${route.id}`}
                              type="button"
                              onClick={() => {
                                setSearchQuery("");
                                setIsSearchOpen(false);
                                handleSelectRoute(route);
                                setActiveTab("planner");
                              }}
                              className="w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between text-xs hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                  <Ship size={13} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                                    {route.name}
                                  </p>
                                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold truncate">
                                    {route.duration} · {route.fare} · {route.distanceNM} NM
                                  </p>
                                </div>
                              </div>
                              <ArrowRight size={13} className="text-slate-400 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 bg-white dark:bg-slate-900 shrink-0">
                {!showVessels && (
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
                )}
                <button
                  onClick={() => {
                    const hasPlannerActivity = Boolean(planOriginId || planDestId || selectedRoute);
                    if (!showVessels && activeTab === "planner" && hasPlannerActivity) {
                      openDiscardModal({
                        title: "Leave Route Planner?",
                        description:
                          "You have an active route selection in progress. Discard current selection and switch to passenger piers?",
                        onConfirm: () => {
                          setOriginPortId("");
                          setDestPortId("");
                          setSelectedRoute(null);
                          resetRouteTrimPaths();
                          setActiveTab("ports");
                          setSelectedVessel(null);
                        },
                      });
                    } else {
                      setActiveTab("ports");
                      setSelectedVessel(null);
                    }
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
                    onClick={() => {
                      setActiveTab("ships");
                      setSelectedPort(null);
                    }}
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
              <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 space-y-3.5 text-slate-900 overscroll-contain">
                {/* ─── TAB 1: Route Planner & Crossing Form ─── */}
                {activeTab === "planner" && (
                  <div key="planner-tab" className="space-y-4 p-1 animate-tab-drop">
                    {/* Selected Route Summary Card with smooth pop-up & downside push animation (Visible ONLY after date & departure chosen) */}
                    <div
                      className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        hasDepartureInput
                          ? "grid-rows-[1fr] opacity-100 mb-3.5"
                          : "grid-rows-[0fr] opacity-0 mb-0 pointer-events-none"
                      }`}
                    >
                      <div className="overflow-hidden">
                        {displayRoute && (
                          <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-50/90 to-white dark:from-slate-800/80 dark:to-slate-900/90 border border-blue-200/90 dark:border-blue-900/60 shadow-xs space-y-3 transform transition-all duration-300">
                            {/* Header row: badge and vessel type */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-900/60 px-2.5 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60 shrink-0 transition-all duration-300">
                                  <Ship size={11} className="text-blue-600 dark:text-blue-400" />
                                  {(activeSchedule?.category === "roro" || sailingPref.category === "roro")
                                    ? "RoRo Passenger Ferry"
                                    : "Fastcraft Express"}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate transition-all duration-300">
                                  {activeSchedule?.vehicleName
                                    ? `${activeSchedule.vehicleName} · ${activeSchedule.operator || ""}`
                                    : sailingPref.vesselName
                                    ? `${sailingPref.vesselName} · ${sailingPref.operator || ""}`
                                    : (displayRoute.tag || "Scheduled Crossing")}
                                </span>
                              </div>
                            </div>

                            {/* Route Terminals: Origin ➔ Destination */}
                            <div className="flex items-center justify-between gap-2 pt-1 pb-0.5">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between">
                                  <p className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider">Departure</p>
                                  {(activeSchedule?.departureTime || sailingPref.departureTime) && (
                                    <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 transition-all duration-300">
                                      {formatTimeDisplay(
                                        activeSchedule?.departureTime || sailingPref.departureTime || "",
                                        sailingPref.timeFormat
                                      )}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate transition-all duration-300">
                                  {fromPortName}
                                </p>
                              </div>
                              <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-slate-700 shadow-2xs">
                                <ArrowRight size={13} />
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <div className="flex items-baseline justify-between">
                                  {(activeSchedule?.arrivalTime || sailingPref.arrivalTime) && (
                                    <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 transition-all duration-300">
                                      {formatTimeDisplay(
                                        activeSchedule?.arrivalTime || sailingPref.arrivalTime || "",
                                        sailingPref.timeFormat
                                      )}
                                    </span>
                                  )}
                                  <p className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider ml-auto">Arrival</p>
                                </div>
                                <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate transition-all duration-300">
                                  {toPortName}
                                </p>
                              </div>
                            </div>

                            {/* 3 Metrics: Duration, Distance, Fare */}
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                              <div className="bg-white/90 dark:bg-slate-800/80 py-1.5 px-2 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-2xs">
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">Duration</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 mt-0.5 transition-all duration-300">
                                  <Clock size={11} className="text-blue-500 shrink-0" />
                                  {displayRoute.duration}
                                </span>
                              </div>
                              <div className="bg-white/90 dark:bg-slate-800/80 py-1.5 px-2 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-2xs">
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">Distance</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 mt-0.5 transition-all duration-300">
                                  <Compass size={11} className="text-indigo-500 shrink-0" />
                                  {displayRoute.distanceNM} NM
                                </span>
                              </div>
                              <div className="bg-white/90 dark:bg-slate-800/80 py-1.5 px-2 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-2xs">
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">Fare</span>
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block mt-0.5 transition-all duration-300">
                                  {activeSchedule?.price
                                    ? `₱${Number(activeSchedule.price).toFixed(2)}`
                                    : sailingPref.price
                                    ? `₱${Number(sailingPref.price).toFixed(2)}`
                                    : displayRoute.fare}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Route Input Form */}
                    <form onSubmit={handleDirectSearch} className="space-y-4">
                      <div className="space-y-3 relative">
                        {/* Origin Pier Select */}
                        <PierSelect
                          label="Origin Pier"
                          value={planOriginId}
                          onChange={(id) => {
                            handleOriginChange(id);
                            setActiveSelectingField("destination");
                          }}
                          options={ROUTED_PORTS}
                          placeholder="Select Origin Pier..."
                          icon={<MapPin size={15} className="text-blue-600 dark:text-blue-400" />}
                          id="origin-pier-select"
                          isOpen={activeSelectingField === "origin"}
                          onOpenChange={(open) => {
                            setActiveSelectingField(open ? "origin" : null);
                            if (open) setSidebarOpen(true);
                          }}
                        />

                        {/* Swap Button */}
                        {planOriginId && (
                          <div className="flex justify-center -my-1 relative z-10">
                            <button
                              type="button"
                              onClick={handleSwapPlanner}
                              disabled={!planDestId || isSwapping}
                              className={`p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-md transition-all ${
                                !planDestId || isSwapping
                                  ? "opacity-40 cursor-not-allowed"
                                  : "hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105 active:scale-95 cursor-pointer"
                              }`}
                              title={
                                isSwapping
                                  ? "Swapping route..."
                                  : planDestId
                                  ? "Swap origin & destination"
                                  : "Select destination to enable swap"
                              }
                            >
                              <ArrowRightLeft size={14} className={isSwapping ? "opacity-60" : ""} />
                            </button>
                          </div>
                        )}

                        {/* Destination Pier Select */}
                        <PierSelect
                          label="Destination Pier"
                          value={planDestId}
                          onChange={(id) => {
                            handleDestinationChange(id);
                            setActiveSelectingField(null);
                          }}
                          options={validDestinations}
                          placeholder={planOriginId ? "Select Destination Pier..." : "Select Origin Pier First"}
                          disabled={!planOriginId}
                          icon={<Navigation size={15} className="text-emerald-600 dark:text-emerald-400" />}
                          id="destination-pier-select"
                          isOpen={activeSelectingField === "destination" && Boolean(planOriginId)}
                          onOpenChange={(open) => {
                            if (planOriginId) {
                              setActiveSelectingField(open ? "destination" : null);
                              if (open) setSidebarOpen(true);
                            }
                          }}
                        />
                      </div>

                      {/* Sailing Date & Accommodated Vessels (Gated on Origin & Destination Selection) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Sailing Date & Departures
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={!planOriginId || !planDestId}
                              onClick={() => {
                                if (planOriginId && planDestId) {
                                  setTravelDate(todayStr);
                                  setSailingPref((prev) => ({ ...prev, date: todayStr }));
                                }
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                                !planOriginId || !planDestId
                                  ? "opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800"
                                  : travelDate === todayStr
                                  ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black cursor-pointer"
                                  : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 cursor-pointer"
                              }`}
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              disabled={!planOriginId || !planDestId}
                              onClick={() => {
                                if (planOriginId && planDestId) {
                                  setTravelDate(tomorrowStr);
                                  setSailingPref((prev) => ({ ...prev, date: tomorrowStr }));
                                }
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                                !planOriginId || !planDestId
                                  ? "opacity-30 cursor-not-allowed text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800"
                                  : travelDate === tomorrowStr
                                  ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black cursor-pointer"
                                  : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 cursor-pointer"
                              }`}
                            >
                              Tomorrow
                            </button>
                          </div>
                        </div>

                        <div
                          role="button"
                          tabIndex={planOriginId && planDestId ? 0 : -1}
                          aria-disabled={!planOriginId || !planDestId}
                          onClick={() => {
                            if (planOriginId && planDestId) {
                              setIsSailingModalOpen(true);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (planOriginId && planDestId && (e.key === "Enter" || e.key === " ")) {
                              setIsSailingModalOpen(true);
                            }
                          }}
                          className={`w-full min-h-[48px] p-2.5 rounded-xl border transition-all duration-300 select-none flex items-center justify-between ${
                            !planOriginId || !planDestId
                              ? "opacity-50 cursor-not-allowed bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 border-dashed"
                              : departureError
                              ? "border-rose-500 dark:border-rose-500 ring-2 ring-rose-400/50 bg-rose-50/80 dark:bg-rose-950/40 cursor-pointer"
                              : "cursor-pointer bg-slate-50 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-600 border-slate-200 dark:border-slate-700 shadow-2xs group"
                          }`}
                          aria-label="Choose Sailing Date and Departures"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Calendar
                              size={16}
                              className={
                                planOriginId && planDestId
                                  ? departureError
                                    ? "text-rose-600 dark:text-rose-400 shrink-0"
                                    : "text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform"
                                  : "text-slate-400 dark:text-slate-500 shrink-0"
                              }
                            />
                            <div className="min-w-0">
                              {planOriginId && planDestId ? (
                                <>
                                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate block">
                                    {formattedDate}
                                  </span>
                                  {hasDepartureInput ? (
                                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate block transition-colors duration-300">
                                      {sailingPref.departureTime || activeSchedule?.departureTime} · {sailingPref.vesselName || activeSchedule?.vehicleName || activeSchedule?.operator}
                                    </span>
                                  ) : (
                                    <span className={`text-[10px] font-bold truncate block transition-colors duration-300 ${
                                      departureError
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    }`}>
                                      {departureError ? "Departure required — choose schedule" : "Select departure time & vessel"}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                                    Sailing Date & Departures
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                                    Select origin and destination piers first
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {planOriginId && planDestId && (
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors ${
                                departureError
                                  ? "text-rose-600 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-900/60 border-rose-300 dark:border-rose-800"
                                  : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/80 border-blue-200/50 dark:border-blue-800/50"
                              }`}>
                                {hasDepartureInput ? "Change" : "Select"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Primary Action Button: Proceed */}
                      <button
                        type="submit"
                        disabled={!planOriginId || !planDestId}
                        onClick={handleProceedClick}
                        className={`w-full h-11 rounded-xl font-extrabold text-xs tracking-tight transition-all duration-300 flex items-center justify-center gap-2 ${
                          !planOriginId || !planDestId
                            ? "opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700"
                            : departureError
                            ? "bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-500 dark:border-rose-600 text-rose-600 dark:text-rose-300 ring-4 ring-rose-400/40 shadow-lg shadow-rose-500/20 cursor-pointer animate-pulse"
                            : hasDepartureInput
                            ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-600/25 cursor-pointer"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 shadow-none hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer"
                        }`}
                      >
                        <span>{departureError ? "Select Departure to Proceed" : "Proceed"}</span>
                        <ArrowRight size={14} />
                      </button>
                    </form>
                  </div>
                )}

                {/* ─── TAB 2: Piers & Ports List ─── */}
                {activeTab === "ports" && (
                  <div key="ports-tab" className="space-y-3 animate-tab-drop">
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
                          {!showVessels && (
                            <button
                              onClick={() => {
                                handleOriginChange(selectedPort.id);
                                setActiveTab("planner");
                              }}
                              className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              Plan route <ArrowRight size={11} />
                            </button>
                          )}
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
                  <div key="ships-tab" className="space-y-3 animate-tab-drop">
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
              <div className="absolute bottom-6 left-4 lg:bottom-auto lg:top-4 lg:left-4 z-20 pointer-events-auto flex items-center gap-2 animate-in fade-in duration-300">
                <button
                  type="button"
                  onClick={() => {
                    setSidebarOpen(true);
                    if (showVessels) {
                      setActiveTab("ships");
                    } else {
                      setActiveTab("planner");
                    }
                  }}
                  className="px-3.5 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 hover:shadow-2xl transition-all flex items-center gap-2.5 group"
                  title={showVessels ? "Open Fleet Telemetry Sidebar" : "Open Route Planner Sidebar"}
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                    {showVessels ? <Ship size={14} /> : <Compass size={14} />}
                  </div>
                  <span>{showVessels ? "Fleet Telemetry" : "Route Planner"}</span>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {isTwoState && (
                  <button
                    type="button"
                    onClick={() => handleRequestExitMap(true)}
                    className="p-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-xl text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800 transition-all flex items-center justify-center cursor-pointer"
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

        {/* ─── Deep Marine Midnight Blue Full-Screen Transition Veil ─── */}
        <div
          className={`absolute inset-0 z-40 bg-[#031B4E] transition-opacity duration-600 ease-in-out pointer-events-none ${
            cabinBlackoutVisible ? "opacity-100" : "opacity-0"
          }`}
        />


      </div>

      {/* ─── Discard Confirmation Modal (Smooth In & Out Transition) ─── */}
      {!showVessels && showDiscardModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-modal-title"
          aria-describedby="discard-modal-desc"
          className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 transition-all duration-300 ease-out ${
            discardModalVisible
              ? "bg-slate-950/50 backdrop-blur-xs opacity-100 pointer-events-auto"
              : "bg-slate-950/0 backdrop-blur-none opacity-0 pointer-events-none"
          }`}
          onClick={() => closeDiscardModal(false)}
        >
          <div
            className={`relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-center transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              discardModalVisible
                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                : "opacity-0 scale-95 translate-y-2 pointer-events-none"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center mx-auto shadow-xs">
              <RotateCcw size={20} />
            </div>

            <div className="space-y-1.5">
              <h3 id="discard-modal-title" className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {discardModalConfig?.title || "Discard Booking Selection?"}
              </h3>
              <p id="discard-modal-desc" className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                {discardModalConfig?.description ||
                  "Do you want to discard your current route selection and reset the map to overview mode?"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => closeDiscardModal(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={() => closeDiscardModal(true)}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
              >
                Yes, Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Comprehensive Sailing Date & Accommodated Vessels Modal ─── */}
      {!showVessels && (
        <SailingDateModal
          isOpen={isSailingModalOpen}
          onClose={() => setIsSailingModalOpen(false)}
          originPortId={planOriginId}
          destPortId={planDestId}
          preference={sailingPref}
          onConfirm={(newPref) => {
            setSailingPref(newPref);
            setTravelDate(newPref.date);
            setHasSetSchedule(true);
            triggerCabinTransition();
          }}
        />
      )}

      {/* ─── Auth Gate Modal: Sign in to book ─── */}
      {!showVessels && showAuthModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-gate-title"
          aria-describedby="auth-gate-desc"
          className={`fixed inset-0 z-[10001] flex items-center justify-center p-4 transition-all ease-[cubic-bezier(0.16,1,0.3,1)] ${
            authModalVisible
              ? "duration-[1500ms] bg-slate-950/55 backdrop-blur-sm opacity-100 pointer-events-auto"
              : "duration-[1500ms] bg-slate-950/0 backdrop-blur-none opacity-0 pointer-events-none"
          }`}
          onClick={closeAuthModal}
        >
          <div
            className={`relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-7 space-y-5 text-center transform transition-all ease-[cubic-bezier(0.16,1,0.3,1)] ${
              authModalVisible
                ? "duration-[1500ms] opacity-100 scale-100 translate-y-0 pointer-events-auto"
                : "duration-[1500ms] opacity-0 scale-95 translate-y-4 pointer-events-none"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={closeAuthModal}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-center mx-auto shadow-xs">
              <Lock size={24} />
            </div>

            {/* Copy */}
            <div className="space-y-2">
              <h3 id="auth-gate-title" className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Sign in to Book a Trip
              </h3>
              <p id="auth-gate-desc" className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                Create a free account or sign in to reserve your seat and manage your booking history.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 pt-1">
              <Link
                to="/login"
                state={{ from: { pathname: "/" } }}
                onClick={closeAuthModal}
                className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-sm shadow-md shadow-blue-600/20 transition-all active:scale-[0.97] text-center block"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={closeAuthModal}
                className="w-full py-2.5 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition-all active:scale-[0.97] text-center block"
              >
                Create Free Account
              </Link>
            </div>

            {/* Fine print */}
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Your route selection will be preserved.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
