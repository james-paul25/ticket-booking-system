/**
 * vesselTemplates.ts
 *
 * Fact-checked seat matrices for Philippine inter-island passenger vessels.
 *
 * Configured with authentic center aisle (walkway down the keel line)
 * and comfortable row pitch so passengers can easily navigate.
 */

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export type DeckClass = "tourist" | "business" | "open-air";

export interface SeatPosition {
  /** Column index in isometric grid */
  col: number;
  /** Row index (0 = bow/front, increases toward stern) */
  row: number;
  /** Seat label shown to passengers, e.g. "1A", "12C", "J4" */
  label: string;
  /** Physical seat group */
  group: "port" | "starboard";
  /** Whether this is a window seat */
  isWindow: boolean;
  /** Seat class tier */
  tier: "economy" | "business";
}

export interface DeckTemplate {
  id: string;
  name: string;
  class: DeckClass;
  /** Total bookable seats on this deck */
  capacity: number;
  /** Total column span (including aisle) */
  columns: number;
  /** Number of seat rows */
  rows: number;
  /** Column index where the center aisle sits */
  centerAisleCol: number;
  /** All seat positions on this deck */
  seats: SeatPosition[];
}

export interface VesselTemplate {
  id: string;
  name: string;
  category: "fastcraft" | "roro";
  operator: string;
  totalCapacity: number;
  decks: DeckTemplate[];
}

// ────────────────────────────────────────────
// Seat grid generators
// ────────────────────────────────────────────

/** Fastcraft Tourist Deck: 3 (Port) — Center Aisle — 3 (Starboard), 20 rows */
function generateFastcraftTouristSeats(): SeatPosition[] {
  const seats: SeatPosition[] = [];
  const rows = 20;

  // Port: cols 0, 1, 2 (Letters A, B, C)
  // Center Aisle: col 3
  // Starboard: cols 4, 5, 6 (Letters D, E, F)
  for (let row = 0; row < rows; row++) {
    const rowNum = row + 1;

    // Port seats
    const portCols = [
      { col: 0, letter: "A", isWindow: true },
      { col: 1, letter: "B", isWindow: false },
      { col: 2, letter: "C", isWindow: false },
    ];
    for (const { col, letter, isWindow } of portCols) {
      seats.push({
        col,
        row,
        label: `${rowNum}${letter}`,
        group: "port",
        isWindow,
        tier: "economy",
      });
    }

    // Starboard seats
    const stbdCols = [
      { col: 4, letter: "D", isWindow: false },
      { col: 5, letter: "E", isWindow: false },
      { col: 6, letter: "F", isWindow: true },
    ];
    for (const { col, letter, isWindow } of stbdCols) {
      seats.push({
        col,
        row,
        label: `${rowNum}${letter}`,
        group: "starboard",
        isWindow,
        tier: "economy",
      });
    }
  }

  return seats;
}

/** Fastcraft Business Deck: 2 (Port) — Center Aisle — 2 (Starboard), 10 rows */
function generateFastcraftBusinessSeats(): SeatPosition[] {
  const seats: SeatPosition[] = [];
  const rows = 10;

  for (let row = 0; row < rows; row++) {
    const rowNum = row + 1;

    // Port seats: cols 0, 1 (A, B)
    seats.push({
      col: 0,
      row,
      label: `J${rowNum}A`,
      group: "port",
      isWindow: true,
      tier: "business",
    });
    seats.push({
      col: 1,
      row,
      label: `J${rowNum}B`,
      group: "port",
      isWindow: false,
      tier: "business",
    });

    // Center aisle at col 2

    // Starboard seats: cols 3, 4 (C, D)
    seats.push({
      col: 3,
      row,
      label: `J${rowNum}C`,
      group: "starboard",
      isWindow: false,
      tier: "business",
    });
    seats.push({
      col: 4,
      row,
      label: `J${rowNum}D`,
      group: "starboard",
      isWindow: true,
      tier: "business",
    });
  }

  return seats;
}

// ────────────────────────────────────────────
// Vessel templates
// ────────────────────────────────────────────

export const OCEANJET_FASTCRAFT: VesselTemplate = {
  id: "oceanjet-fastcraft",
  name: "OceanJet Fastcraft",
  category: "fastcraft",
  operator: "Ocean Fast Ferries, Inc.",
  totalCapacity: 350,
  decks: [
    {
      id: "main-tourist",
      name: "Economy Class",
      class: "tourist",
      capacity: 120,
      columns: 7, // cols 0..6 (aisle at col 3)
      rows: 20,
      centerAisleCol: 3,
      seats: generateFastcraftTouristSeats(),
    },
    {
      id: "upper-business",
      name: "Business Class",
      class: "business",
      capacity: 40,
      columns: 5, // cols 0..4 (aisle at col 2)
      rows: 10,
      centerAisleCol: 2,
      seats: generateFastcraftBusinessSeats(),
    },
  ],
};

export const LITE_FERRY_RORO: VesselTemplate = {
  id: "lite-ferry-roro",
  name: "Lite Ferry",
  category: "roro",
  operator: "Lite Shipping Corporation",
  totalCapacity: 500,
  decks: [
    {
      id: "main-economy",
      name: "Economy Class",
      class: "tourist",
      capacity: 120,
      columns: 7,
      rows: 20,
      centerAisleCol: 3,
      seats: generateFastcraftTouristSeats(),
    },
    {
      id: "business-deck",
      name: "Business Class",
      class: "business",
      capacity: 40,
      columns: 5,
      rows: 10,
      centerAisleCol: 2,
      seats: generateFastcraftBusinessSeats(),
    },
  ],
};

// ────────────────────────────────────────────
// Lookup helpers
// ────────────────────────────────────────────

const VESSEL_REGISTRY: VesselTemplate[] = [OCEANJET_FASTCRAFT, LITE_FERRY_RORO];

export function getVesselTemplate(
  category?: "fastcraft" | "roro",
  vehicleName?: string,
): VesselTemplate {
  if (category === "roro") return LITE_FERRY_RORO;
  if (vehicleName?.toLowerCase().includes("lite")) return LITE_FERRY_RORO;
  return OCEANJET_FASTCRAFT;
}

export function getAllVesselTemplates(): VesselTemplate[] {
  return VESSEL_REGISTRY;
}
