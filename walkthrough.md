# Walkthrough: Isometric 3D Vessel Seating Experience

All requested improvements for the 3D isometric cabin seating interface, centered aisle symmetry, auto-zoom on selection, interactive seat animations, and window enhancements have been implemented and verified.

---

## Key Problems Identified & Root-Cause Solutions

### 1. Root Cause of the Off-Centered Aisle
- **Finding**: `isoBoxFaces` previously generated box polygons starting at `(screenX, screenY)` and extending only into the positive coordinate directions (`col` to `col + 0.70`). Consequently, Seat C (col 2) ended at `col 2.70`, whereas Seat D (col 4) started at `col 4.00`. The gap was centered at `col 3.35`, but the aisle polygon was drawn around `col 3.00`, causing the aisle runner to overlap and hug Seat C while leaving a large empty gap before Seat D.
- **Fix**:
  - Re-centered all seat polygons so that the cushion, backrest, ground beacon, and labels are co-axial and centered exactly on `(screenX, screenY)`.
  - With Seat C centered at `2.0` and Seat D centered at `4.0`, the aisle corridor is now mathematically centered on `col 3.0` with identical 8.6px margins on both sides.
  - Symmetrized the hull keel line (`midCol = 3.0`), bow tip, stern transom, and porthole spacing.

### 2. Seat Spacing & Breathing Room
- Expanded grid pitch from `44 × 46` to `48 × 56`:
  - **Width**: `cellW = 48px`, `seatW = 31px` $\rightarrow$ 17px of clear breathing room between columns.
  - **Legroom**: `cellH = 56px`, `seatD = 31px` $\rightarrow$ 25px of generous passenger legroom between rows.
  - Seats no longer look cramped or crowded.

### 3. Automatic Dramatic Zoom-In on Seat Selection
- When an available seat is clicked:
  - Calculates the exact offset between the selected seat in SVG coordinate space and the viewport center.
  - Smoothly translates and zooms the stage to **2.1x (210%)**, bringing the chosen seat to the exact center of the screen using `cubic-bezier(0.16, 1, 0.3, 1)` over 550ms.
  - Deselecting or clicking "Reset" glides the camera back out to **1.0x (100%)** overview.

### 4. Elimination of the Black Box Outline
- **Root Cause**: Browsers apply an automatic black rectangular focus ring (`:focus` / `:focus-visible`) to SVG `<g>` elements that have `role="button"` and `tabIndex={0}`.
- **Fix**:
  - Added global SVG focus reset in [index.css](file:///c:/Users/codew/Desktop/Bisu%20Projects/Sequential%20Booking/ticket-booking-system/src/index.css).
  - Added embedded SVG `<style>` rules inside [IsometricCabinStage.tsx](file:///c:/Users/codew/Desktop/Bisu%20Projects/Sequential%20Booking/ticket-booking-system/src/features/seats/isometric/IsometricCabinStage.tsx).
  - Explicitly set `outline: "none"`, `border: "none"`, and `focus:outline-none` on [IsometricSeat.tsx](file:///c:/Users/codew/Desktop/Bisu%20Projects/Sequential%20Booking/ticket-booking-system/src/features/seats/isometric/IsometricSeat.tsx).

### 5. Interactive Seat Animation (Spring Pop & Floor Beacon)
- When selected:
  - **Physical Spring Lift**: The seat physically lifts up by 6px with an elastic spring animation (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
  - **Glowing Floor Beacon**: A royal blue floor target with an expanding ripple wave projects on the deck beneath the lifted seat.
  - **Floating Pin Badge**: A tethered floating badge displaying `✓ {label}` appears right above the headrest (inspired by the Mondaysys Dribbble reference).

### 6. Portholes: Bigger & More Frequent
- Doubled frequency to **every row** along the cabin (`step = 1.0`).
- Enlarged porthole radius to `8.0px` (inner glass `5.8px`).
- Added dual chrome/metallic bezel rings, azure marine glass, and primary + secondary specular glints.

---

## Verification Results
- **TypeScript Type Check**: `tsc --noEmit` passed with 0 errors.
- **Production Build**: `vite build` completed in 7.86s with zero errors.
