import type { Seat } from "@/types/seat";
import { HiaceCommuterSeatMap } from "./hiace/HiaceCommuterSeatMap";
import { BusSeatMap } from "./BusSeatMap";

interface SeatMapProps {
  seats: Seat[];
  selectedSeatId: string | null;
  onSelect: (seat: Seat) => void;
  vehicleName?: string;
  vehicleNumber?: string;
}

export function SeatMap({
  seats,
  selectedSeatId,
  onSelect,
  vehicleName,
  vehicleNumber,
}: SeatMapProps) {
  const normalized = (vehicleName ?? "").toLowerCase();
  const isBus =
    normalized.includes("ceres") ||
    normalized.includes("shuttle") ||
    normalized.includes("bus") ||
    normalized.includes("liner") ||
    seats.length > 20;

  if (isBus) {
    return (
      <BusSeatMap
        seats={seats}
        selectedSeatId={selectedSeatId}
        onSelect={onSelect}
        vehicleName={vehicleName}
        vehicleNumber={vehicleNumber}
      />
    );
  }

  return (
    <HiaceCommuterSeatMap
      seats={seats}
      selectedSeatId={selectedSeatId}
      onSelect={onSelect}
      vehicleName={vehicleName}
      vehicleNumber={vehicleNumber}
    />
  );
}
