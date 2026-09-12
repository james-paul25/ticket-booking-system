import { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sun,
  Sunrise,
  Moon,
  Ship,
  Check,
  X,
  ArrowRight,
} from "lucide-react";
import { REAL_SCHEDULE_TEMPLATES, type ScheduleTemplate } from "@/data/realSchedules";
import { BOHOL_PORTS, type PortLocation } from "@/components/map/nauticalRoutes";

export interface SailingPreference {
  date: string; // "YYYY-MM-DD"
  timeOfDay: "all" | "morning" | "afternoon" | "evening";
  timeFormat?: "standard" | "military";
  selectedTemplateId?: string;
  vesselName?: string;
  departureTime?: string;
  arrivalTime?: string;
  price?: number;
  category?: "fastcraft" | "roro";
  operator?: string;
}

export function formatTimeDisplay(timeStr?: string, format: "standard" | "military" = "standard"): string {
  if (!timeStr) return "";
  if (format === "military") return timeStr;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr || "00"} ${ampm}`;
}

interface SailingDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  originPortId?: string;
  destPortId?: string;
  preference: SailingPreference;
  onConfirm: (pref: SailingPreference) => void;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function matchPortToSchedule(port: PortLocation, schedulePortName: string): boolean {
  const sp = schedulePortName.toLowerCase();
  const pid = port.id.toLowerCase();
  const pname = port.name.toLowerCase();
  const pshort = port.shortName.toLowerCase();
  const pcity = port.city.toLowerCase();

  if (pid === "cebu-pier-1") {
    return sp.includes("cebu");
  }
  if (pid === "tagbilaran") {
    return sp.includes("tagbilaran");
  }
  if (pid === "tubigon") {
    return sp.includes("tubigon");
  }
  if (pid === "getafe") {
    return sp.includes("getafe") || sp.includes("jetafe");
  }
  if (pid === "jagna") {
    return sp.includes("jagna");
  }
  if (pid === "ubay") {
    return sp.includes("ubay");
  }
  if (pid === "cordova") {
    return sp.includes("cordova");
  }
  if (pid === "siquijor") {
    return sp.includes("siquijor") || sp.includes("larena");
  }
  if (pid === "camiguin") {
    return sp.includes("camiguin") || sp.includes("balbagon");
  }
  if (pid === "cagayan-de-oro") {
    return sp.includes("cagayan") || sp.includes("cdo");
  }
  if (pid === "dumaguete") {
    return sp.includes("dumaguete");
  }
  if (pid === "bato-leyte") {
    return sp.includes("bato");
  }
  if (pid === "hilongos") {
    return sp.includes("hilongos");
  }
  if (pid === "nasipit") {
    return sp.includes("nasipit");
  }
  if (pid === "balingoan") {
    return sp.includes("balingoan");
  }
  if (pid === "ormoc") {
    return sp.includes("ormoc");
  }
  if (pid === "iligan") {
    return sp.includes("iligan");
  }
  return sp.includes(pname) || pname.includes(sp) || sp.includes(pshort) || sp.includes(pcity);
}

export function SailingDateModal({
  isOpen,
  onClose,
  originPortId,
  destPortId,
  preference,
  onConfirm,
}: SailingDateModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Local draft state
  const [draftDate, setDraftDate] = useState(preference.date);
  const [draftTimeOfDay, setDraftTimeOfDay] = useState<"all" | "morning" | "afternoon" | "evening">(
    preference.timeOfDay || "all"
  );
  const [draftTemplateId, setDraftTemplateId] = useState<string | undefined>(
    preference.selectedTemplateId
  );
  const [draftTimeFormat, setDraftTimeFormat] = useState<"standard" | "military">(
    preference.timeFormat || "standard"
  );
  const [selectedVesselInfo, setSelectedVesselInfo] = useState<Partial<ScheduleTemplate> | null>(null);

  // Month view state
  const [viewYear, setViewYear] = useState<number>(() => {
    const d = new Date(preference.date || Date.now());
    return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const d = new Date(preference.date || Date.now());
    return isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  });

  // Calculate today & tomorrow
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  const tomorrowStr = useMemo(() => {
    const tom = new Date(today);
    tom.setDate(tom.getDate() + 1);
    const y = tom.getFullYear();
    const m = String(tom.getMonth() + 1).padStart(2, "0");
    const d = String(tom.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  // Lock body scroll while modal is open to eliminate background page scrolling
  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      const origTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = origOverflow;
        document.body.style.touchAction = origTouchAction;
      };
    }
  }, [isOpen]);

  // Sync draft state on open
  useEffect(() => {
    if (isOpen) {
      setDraftDate(preference.date || todayStr);
      setDraftTimeOfDay(preference.timeOfDay || "all");
      setDraftTemplateId(preference.selectedTemplateId);
      setDraftTimeFormat(preference.timeFormat || "standard");

      const d = new Date(preference.date || todayStr);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }

      if (preference.selectedTemplateId) {
        const found = REAL_SCHEDULE_TEMPLATES.find(
          (t) => t.templateId === preference.selectedTemplateId
        );
        if (found) setSelectedVesselInfo(found);
      } else if (originPort && destPort) {
        const found = REAL_SCHEDULE_TEMPLATES.find(
          (item) =>
            matchPortToSchedule(originPort, item.origin) &&
            matchPortToSchedule(destPort, item.destination)
        );
        if (found) {
          setDraftTemplateId(found.templateId);
          setSelectedVesselInfo(found);
        } else {
          setSelectedVesselInfo(null);
        }
      } else {
        setSelectedVesselInfo(null);
      }

      setIsMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, preference, todayStr]);

  // Escape key listener (stops propagation so map background does not exit)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onClose]);

  // Port lookup
  const originPort = useMemo(
    () => BOHOL_PORTS.find((p) => p.id === originPortId),
    [originPortId]
  );
  const destPort = useMemo(
    () => BOHOL_PORTS.find((p) => p.id === destPortId),
    [destPortId]
  );

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const isPrevMonthDisabled = useMemo(() => {
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();
    return viewYear < curYear || (viewYear === curYear && viewMonth <= curMonth);
  }, [viewYear, viewMonth, today]);

  // Calendar cells generation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: {
      dayNum: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isPast: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    // Prev month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
      cells.push({
        dayNum: dNum,
        dateStr,
        isCurrentMonth: false,
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === draftDate,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === draftDate,
      });
    }

    // Next month overflow
    const remainingSlots = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: false,
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === draftDate,
      });
    }

    return cells;
  }, [viewYear, viewMonth, draftDate, todayStr]);

  const monthName = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [viewYear, viewMonth]);

  const formattedDraftDate = useMemo(() => {
    if (!draftDate) return "";
    const parts = draftDate.split("-").map(Number);
    if (parts.length < 3) return draftDate;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [draftDate]);

  // Timetable strictly derived from selected origin & destination piers
  const accommodatedVessels = useMemo(() => {
    if (!originPort || !destPort) return [];

    let list = REAL_SCHEDULE_TEMPLATES.filter(
      (item) =>
        matchPortToSchedule(originPort, item.origin) &&
        matchPortToSchedule(destPort, item.destination)
    );

    // Filter by Time of Day
    if (draftTimeOfDay !== "all") {
      list = list.filter((item) => {
        const hour = parseInt(item.departureTime.split(":")[0], 10);
        if (draftTimeOfDay === "morning") return hour >= 5 && hour < 12;
        if (draftTimeOfDay === "afternoon") return hour >= 12 && hour < 18;
        if (draftTimeOfDay === "evening") return hour >= 18 && hour <= 23;
        return true;
      });
    }

    return list;
  }, [originPort, destPort, draftTimeOfDay]);

  const handleSelectVessel = (template: ScheduleTemplate) => {
    if (draftTemplateId === template.templateId) {
      setDraftTemplateId(undefined);
      setSelectedVesselInfo(null);
    } else {
      setDraftTemplateId(template.templateId);
      setSelectedVesselInfo(template);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      date: draftDate,
      timeOfDay: draftTimeOfDay,
      timeFormat: draftTimeFormat,
      selectedTemplateId: draftTemplateId,
      vesselName: selectedVesselInfo?.vehicleName,
      departureTime: selectedVesselInfo?.departureTime,
      arrivalTime: selectedVesselInfo?.arrivalTime,
      price: selectedVesselInfo?.price,
      category: selectedVesselInfo?.category,
      operator: selectedVesselInfo?.operator,
    });
    onClose();
  };

  if (!isMounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-sailing-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden overscroll-none"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-260 ease-out cursor-pointer ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Modal Container */}
      <div
        className={`relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] my-auto max-h-[88vh] flex flex-col overscroll-contain ${
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-3"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <CalendarIcon size={16} />
            </div>
            <div>
              <h2 id="modal-sailing-title" className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Sailing Date & Departures
              </h2>
              {originPort && destPort && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{originPort.shortName}</span>
                  <ArrowRight size={11} className="text-blue-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{destPort.shortName}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto px-5 sm:px-6 py-4 space-y-4 flex-1 custom-scrollbar overscroll-contain">
          {/* Calendar Section */}
          <div className="bg-slate-50/60 dark:bg-slate-950/40 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-800/80">
            {/* Month Header & Controls */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {monthName}
                </span>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-900/50">
                  {formattedDraftDate}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setDraftDate(todayStr);
                    const d = new Date();
                    setViewYear(d.getFullYear());
                    setViewMonth(d.getMonth());
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    draftDate === todayStr
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftDate(tomorrowStr);
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setViewYear(d.getFullYear());
                    setViewMonth(d.getMonth());
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    draftDate === tomorrowStr
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                  }`}
                >
                  Tomorrow
                </button>
                <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  disabled={isPrevMonthDisabled}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Weekdays Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {WEEKDAYS.map((day) => (
                <span
                  key={day}
                  className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 py-0.5"
                >
                  {day}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                const isCurrentActive = cell.isSelected;
                const isPast = cell.isPast;

                return (
                  <button
                    key={`${cell.dateStr}-${idx}`}
                    type="button"
                    disabled={isPast}
                    onClick={() => {
                      if (!isPast) {
                        setDraftDate(cell.dateStr);
                      }
                    }}
                    className={`h-8 rounded-xl flex flex-col items-center justify-center text-xs font-extrabold transition-all relative select-none ${
                      isPast
                        ? "text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-40"
                        : isCurrentActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105 z-10"
                        : cell.isCurrentMonth
                        ? "text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xs cursor-pointer"
                        : "text-slate-400 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/40 cursor-pointer"
                    }`}
                  >
                    <span>{cell.dayNum}</span>
                    {cell.isToday && !isCurrentActive && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time of Day Preference */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Clock size={13} className="text-blue-600 dark:text-blue-400" />
                <span>Time of Day</span>
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "all", label: "All", time: "All Day", icon: Clock },
                { id: "morning", label: "Morning", time: "05:00 - 11:59", icon: Sunrise },
                { id: "afternoon", label: "Afternoon", time: "12:00 - 17:59", icon: Sun },
                { id: "evening", label: "Evening", time: "18:00 - 23:59", icon: Moon },
              ].map((slot) => {
                const active = draftTimeOfDay === slot.id;
                const Icon = slot.icon;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setDraftTimeOfDay(slot.id as any)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      active
                        ? "bg-blue-50/90 dark:bg-blue-950/60 border-blue-500/80 dark:border-blue-700 text-blue-950 dark:text-blue-100 shadow-xs ring-1 ring-blue-500/20"
                        : "bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-tight">{slot.label}</span>
                      <Icon
                        size={12}
                        className={active ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                      {slot.time}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Departures Timetable based strictly on selected corridor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Ship size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Departures ({accommodatedVessels.length})</span>
              </label>

              {/* Time format selector: Standard | 24h */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setDraftTimeFormat("standard")}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    draftTimeFormat === "standard"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setDraftTimeFormat("military")}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    draftTimeFormat === "military"
                      ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  24h
                </button>
              </div>
            </div>

            {accommodatedVessels.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {draftTimeOfDay === "all"
                    ? "No scheduled sailings found for this route."
                    : `No departures in the ${draftTimeOfDay}.`}
                </p>
                {draftTimeOfDay !== "all" && (
                  <button
                    type="button"
                    onClick={() => setDraftTimeOfDay("all")}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Show all departures
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {accommodatedVessels.map((vessel) => {
                  const isSelected = draftTemplateId === vessel.templateId;

                  return (
                    <div
                      key={vessel.templateId}
                      onClick={() => handleSelectVessel(vessel)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-blue-50/90 dark:bg-blue-950/70 border-blue-500 dark:border-blue-600 shadow-xs ring-1 ring-blue-500/30"
                          : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-slate-300 dark:border-slate-600 bg-transparent"
                          }`}
                        >
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">
                              {formatTimeDisplay(vessel.departureTime, draftTimeFormat)}
                            </span>
                            <ArrowRight size={11} className="text-slate-400 shrink-0" />
                            <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                              {formatTimeDisplay(vessel.arrivalTime, draftTimeFormat)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                              {vessel.vehicleName}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              · {vessel.operator}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className="font-mono text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                          ₱{Number(vessel.price).toFixed(2)}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider mt-0.5 ${
                            vessel.category === "fastcraft"
                              ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                              : "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {vessel.category}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Minimal Impeccable Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            {selectedVesselInfo ? (
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                <span className="text-blue-600 dark:text-blue-400 font-mono">
                  {formatTimeDisplay(selectedVesselInfo.departureTime, draftTimeFormat)}
                </span>
                <span>·</span>
                <span>{selectedVesselInfo.vehicleName}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">₱{Number(selectedVesselInfo.price).toFixed(2)}</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Any vessel on this date
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
