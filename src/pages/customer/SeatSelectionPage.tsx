import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { scheduleService } from "@/services/scheduleService";
import { seatService } from "@/services/seatService";
import { IsometricCabinStage } from "@/features/seats/isometric";
import { getVesselTemplate } from "@/data/vesselTemplates";
import { BOHOL_PORTS, type PortLocation } from "@/components/map/nauticalRoutes";
import { REAL_SCHEDULE_TEMPLATES, type ScheduleTemplate, getAuthenticBusinessFare } from "@/data/realSchedules";
import { DirtyFormsModal } from "@/components/common/DirtyFormsModal";
import type { SeatPosition } from "@/data/vesselTemplates";

interface LocationState {
  transitionFromMap?: boolean;
  fromPortName?: string;
  toPortName?: string;
  travelDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  basePrice?: number;
  businessPrice?: number;
  vesselCategory?: "fastcraft" | "roro";
  vesselName?: string;
}

export function SeatSelectionPage() {
  const { id, scheduleId } = useParams<{ id?: string; scheduleId?: string }>();
  const activeId = scheduleId || id;
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LocationState) || {};

  // Cinematic incoming dark blue transition overlay
  const [overlayVisible, setOverlayVisible] = useState(() => Boolean(state.transitionFromMap));

  // Current selected seat tracking for dirty forms protection
  const [currentSelectedSeat, setCurrentSelectedSeat] = useState<SeatPosition | null>(null);
  const [dirtyModalOpen, setDirtyModalOpen] = useState(false);

  useEffect(() => {
    if (state.transitionFromMap) {
      const timer = setTimeout(() => {
        setOverlayVisible(false);
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [state.transitionFromMap]);

  // Site beforeunload protection when user has chosen a seat
  useEffect(() => {
    if (!currentSelectedSeat) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentSelectedSeat]);

  // Query database schedule if an authentic ID is provided
  const { data: dbSchedule } = useQuery({
    queryKey: ["schedule", activeId],
    queryFn: () => scheduleService.getById(activeId!),
    enabled: !!activeId && !activeId.includes("-template-"),
  });

  // Query booked and locked seats dynamically from DB and allocated store
  const { data: dynamicBookedLabels = ["1A", "2C", "3D", "5B", "8E", "10F", "J2A", "J4D"] } = useQuery({
    queryKey: ["booked-seats", activeId],
    queryFn: () => seatService.getBookedSeatLabels(activeId!),
    enabled: !!activeId,
    staleTime: 1000,
  });

  // Resolve template matching templateId if synthesized
  const templateMatch = useMemo(() => {
    if (!activeId) return null;
    return REAL_SCHEDULE_TEMPLATES.find((t: ScheduleTemplate) => activeId.startsWith(t.templateId)) ?? null;
  }, [activeId]);

  // Derived Voyage Details
  const fromPortName = useMemo(() => {
    if (state.fromPortName) return state.fromPortName;
    if (dbSchedule?.origin) return dbSchedule.origin;
    if (templateMatch?.origin) return templateMatch.origin;
    const originParam = params.get("origin");
    if (originParam) {
      const p = BOHOL_PORTS.find((port: PortLocation) => port.id === originParam || port.name === originParam);
      return p ? p.name : originParam;
    }
    return "Tubigon Port";
  }, [state.fromPortName, dbSchedule, templateMatch, params]);

  const toPortName = useMemo(() => {
    if (state.toPortName) return state.toPortName;
    if (dbSchedule?.destination) return dbSchedule.destination;
    if (templateMatch?.destination) return templateMatch.destination;
    const destParam = params.get("destination");
    if (destParam) {
      const p = BOHOL_PORTS.find((port: PortLocation) => port.id === destParam || port.name === destParam);
      return p ? p.name : destParam;
    }
    return "Cebu Pier 1 / Pier 5";
  }, [state.toPortName, dbSchedule, templateMatch, params]);

  const travelDate = useMemo(() => {
    if (state.travelDate) return state.travelDate;
    if (dbSchedule?.departure_date) return dbSchedule.departure_date;
    const dateParam = params.get("date");
    if (dateParam) return dateParam;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, [state.travelDate, dbSchedule, params]);

  const departureTime = useMemo(() => {
    if (state.departureTime) return state.departureTime;
    if (dbSchedule?.departure_time) return dbSchedule.departure_time.slice(0, 5);
    if (templateMatch?.departureTime) return templateMatch.departureTime;
    return params.get("time") || "08:00";
  }, [state.departureTime, dbSchedule, templateMatch, params]);

  const arrivalTime = useMemo(() => {
    if (state.arrivalTime) return state.arrivalTime;
    if (dbSchedule?.arrival_time) return dbSchedule.arrival_time.slice(0, 5);
    if (templateMatch?.arrivalTime) return templateMatch.arrivalTime;
    return "10:00";
  }, [state.arrivalTime, dbSchedule, templateMatch]);

  const duration = useMemo(() => {
    if (state.duration) return state.duration;
    return "1h 45m";
  }, [state.duration]);

  const basePrice = useMemo(() => {
    if (state.basePrice) return state.basePrice;
    if (dbSchedule?.price) return Number(dbSchedule.price);
    if (templateMatch?.price) return templateMatch.price;
    const priceParam = params.get("price");
    if (priceParam) return Number(priceParam);
    return 800;
  }, [state.basePrice, dbSchedule, templateMatch, params]);

  const vesselCategory = useMemo(() => {
    if (state.vesselCategory) return state.vesselCategory;
    if (dbSchedule?.category === "roro" || templateMatch?.category === "roro") return "roro";
    return "fastcraft";
  }, [state.vesselCategory, dbSchedule, templateMatch]);

  const vesselName = useMemo(() => {
    if (state.vesselName) return state.vesselName;
    if (dbSchedule?.vehicle_name) return dbSchedule.vehicle_name;
    if (templateMatch?.vehicleName) return templateMatch.vehicleName;
    return vesselCategory === "roro" ? "Lite Ferry RoRo" : "OceanJet Fastcraft";
  }, [state.vesselName, dbSchedule, templateMatch, vesselCategory]);

  const businessPrice = useMemo(() => {
    if (state.businessPrice) return state.businessPrice;
    if (templateMatch?.businessPrice) return templateMatch.businessPrice;
    if (dbSchedule?.business_price) return Number(dbSchedule.business_price);
    return getAuthenticBusinessFare({
      operator: templateMatch?.operator || dbSchedule?.operator,
      vehicleName: vesselName,
      category: vesselCategory,
      price: basePrice,
      origin: fromPortName,
      destination: toPortName,
    });
  }, [state.businessPrice, templateMatch, dbSchedule, vesselName, vesselCategory, basePrice, fromPortName, toPortName]);

  const vesselTemplate = useMemo(() => {
    return getVesselTemplate(vesselCategory, vesselName);
  }, [vesselCategory, vesselName]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleConfirmSeat = (seat: SeatPosition, totalAmount: number) => {
    setOverlayVisible(true);
    const effectiveId = activeId || `${templateMatch?.templateId ?? "voyage"}-${travelDate}`;
    const reservationFee = 25;
    const seatFare = Math.max(0, totalAmount - reservationFee);
    const url = `/booking/${effectiveId}?seat=${encodeURIComponent(seat.label)}&tier=${seat.tier}&fare=${seatFare}&amount=${totalAmount}`;
    setTimeout(() => {
      navigate(url, {
        state: {
          ...state,
          selectedSeat: seat,
          seatFare,
          totalAmount,
          seatLabel: seat.label,
          tier: seat.tier,
          fromPortName,
          toPortName,
          travelDate,
          departureTime,
          arrivalTime,
          duration,
          vesselName,
          vesselCategory,
        },
      });
    }, 450);
  };

  const executeClose = useCallback(() => {
    if (state.transitionFromMap || (window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
    } else {
      navigate("/#route-planner");
    }
  }, [navigate, state.transitionFromMap]);

  // Handle attempt to close/exit: show modal if dirty (seat chosen)
  const handleAttemptClose = () => {
    if (currentSelectedSeat) {
      setDirtyModalOpen(true);
    } else {
      executeClose();
    }
  };

  const handleDiscardAndLeave = () => {
    setDirtyModalOpen(false);
    setCurrentSelectedSeat(null);
    executeClose();
  };

  const handleKeepSeat = () => {
    setDirtyModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full overflow-hidden bg-[#F8FAFC]">
      {/* ─── Deep Marine Midnight Blue Transition Veil ─── */}
      <div
        className={`fixed inset-0 z-[60] bg-[#031B4E] pointer-events-none transition-opacity duration-600 ease-in-out ${
          overlayVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* ─── Dedicated Full-Page 3D Isometric Cabin Stage ─── */}
      <IsometricCabinStage
        vessel={vesselTemplate}
        routeText={`${fromPortName} → ${toPortName}`}
        originName={fromPortName}
        destName={toPortName}
        travelDate={travelDate}
        departureTime={departureTime}
        arrivalTime={arrivalTime}
        duration={duration}
        basePrice={basePrice}
        businessPrice={businessPrice}
        bookedSeatLabels={dynamicBookedLabels}
        onClose={handleAttemptClose}
        onConfirmSeat={handleConfirmSeat}
        onSelectedSeatChange={(seat) => setCurrentSelectedSeat(seat)}
      />

      {/* ─── Dirty Forms Modal with Smooth Pop-Up / Pop-Out ─── */}
      <DirtyFormsModal
        isOpen={dirtyModalOpen}
        seatLabel={currentSelectedSeat?.label}
        onKeepSeat={handleKeepSeat}
        onDiscardAndLeave={handleDiscardAndLeave}
      />
    </div>
  );
}
export default SeatSelectionPage;
