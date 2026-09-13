import { useMemo } from "react";
import type { DeckTemplate } from "@/data/vesselTemplates";
import { gridToIso } from "./isoMath";

interface IsometricShipHullProps {
  deck: DeckTemplate;
  category?: "fastcraft" | "roro";
  cellW?: number;
  cellH?: number;
}

export function IsometricShipHull({
  deck,
  cellW = 41,
  cellH = 56,
}: IsometricShipHullProps) {
  const { columns: cols, rows, centerAisleCol } = deck;

  const isBusiness = deck.class === "business";

  // Inverted ship hull geometry with symmetrical keel line:
  // - Soft pointy nose at the BOW (forward end, row > rows)
  // - Rounded curved transom at the STERN (aft end, row < 0)
  // - Symmetric portMargin and stbdMargin centered at midCol
  const hullData = useMemo(() => {
    const portMargin = isBusiness ? -1.25 : -1.1;
    const stbdMargin = isBusiness ? cols + 0.25 : cols + 0.1;
    const midCol = (cols - 1) / 2; // Centerline

    const bowTipRow = rows + (isBusiness ? 3.0 : 2.8);
    const bowShoulderRow = rows + (isBusiness ? 0.7 : 0.5);
    const sternRow = isBusiness ? -2.4 : -2.2;
    const sternCornerRow = -0.6;

    // Bow (soft pointy nose centered on midCol)
    const bowTip = gridToIso(midCol, bowTipRow, cellW, cellH);
    const bowPortCtrl = gridToIso(portMargin + 0.8, rows + 1.8, cellW, cellH);
    const bowPortShoulder = gridToIso(portMargin, bowShoulderRow, cellW, cellH);

    const bowStbdCtrl = gridToIso(stbdMargin - 0.8, rows + 1.8, cellW, cellH);
    const bowStbdShoulder = gridToIso(stbdMargin, bowShoulderRow, cellW, cellH);

    // Stern (rounded aft transom centered on midCol)
    const sternPortShoulder = gridToIso(portMargin, sternCornerRow, cellW, cellH);
    const sternPortAft = gridToIso(portMargin + 0.8, sternRow, cellW, cellH);

    const sternStbdShoulder = gridToIso(stbdMargin, sternCornerRow, cellW, cellH);
    const sternStbdAft = gridToIso(stbdMargin - 0.8, sternRow, cellW, cellH);

    const sternMid = gridToIso(midCol, sternRow - 0.3, cellW, cellH);

    // Hull perimeter path: Bow (pointy) -> Starboard -> Stern (rounded) -> Port -> Bow
    const d = [
      `M ${bowTip.x.toFixed(1)} ${bowTip.y.toFixed(1)}`,
      // Curve up to starboard bow shoulder
      `C ${bowStbdCtrl.x.toFixed(1)} ${bowStbdCtrl.y.toFixed(1)}, ${bowStbdShoulder.x.toFixed(1)} ${bowStbdShoulder.y.toFixed(1)}, ${bowStbdShoulder.x.toFixed(1)} ${bowStbdShoulder.y.toFixed(1)}`,
      // Straight run along starboard side
      `L ${sternStbdShoulder.x.toFixed(1)} ${sternStbdShoulder.y.toFixed(1)}`,
      // Rounded curve around starboard stern to aft center
      `C ${sternStbdAft.x.toFixed(1)} ${sternStbdAft.y.toFixed(1)}, ${sternMid.x.toFixed(1)} ${sternMid.y.toFixed(1)}, ${sternMid.x.toFixed(1)} ${sternMid.y.toFixed(1)}`,
      // Rounded curve around port stern
      `C ${sternPortAft.x.toFixed(1)} ${sternPortAft.y.toFixed(1)}, ${sternPortShoulder.x.toFixed(1)} ${sternPortShoulder.y.toFixed(1)}, ${sternPortShoulder.x.toFixed(1)} ${sternPortShoulder.y.toFixed(1)}`,
      // Straight run down port side
      `L ${bowPortShoulder.x.toFixed(1)} ${bowPortShoulder.y.toFixed(1)}`,
      // Curve from port bow shoulder down to bow tip
      `C ${bowPortCtrl.x.toFixed(1)} ${bowPortCtrl.y.toFixed(1)}, ${bowTip.x.toFixed(1)} ${bowTip.y.toFixed(1)}, ${bowTip.x.toFixed(1)} ${bowTip.y.toFixed(1)}`,
      "Z",
    ].join(" ");

    // 3D Rim drop height (visible along front/bow curve)
    const rimH = isBusiness ? 16 : 14;
    const bowFace = [
      `M ${bowPortShoulder.x.toFixed(1)} ${bowPortShoulder.y.toFixed(1)}`,
      `C ${bowPortCtrl.x.toFixed(1)} ${bowPortCtrl.y.toFixed(1)}, ${bowTip.x.toFixed(1)} ${bowTip.y.toFixed(1)}, ${bowTip.x.toFixed(1)} ${bowTip.y.toFixed(1)}`,
      `C ${bowStbdCtrl.x.toFixed(1)} ${bowStbdCtrl.y.toFixed(1)}, ${bowStbdShoulder.x.toFixed(1)} ${bowStbdShoulder.y.toFixed(1)}, ${bowStbdShoulder.x.toFixed(1)} ${bowStbdShoulder.y.toFixed(1)}`,
      `L ${bowStbdShoulder.x.toFixed(1)} ${(bowStbdShoulder.y + rimH).toFixed(1)}`,
      `C ${bowStbdCtrl.x.toFixed(1)} ${(bowStbdCtrl.y + rimH).toFixed(1)}, ${bowTip.x.toFixed(1)} ${(bowTip.y + rimH).toFixed(1)}, ${bowTip.x.toFixed(1)} ${(bowTip.y + rimH).toFixed(1)}`,
      `C ${bowPortCtrl.x.toFixed(1)} ${(bowPortCtrl.y + rimH).toFixed(1)}, ${bowPortShoulder.x.toFixed(1)} ${(bowPortShoulder.y + rimH).toFixed(1)}, ${bowPortShoulder.x.toFixed(1)} ${(bowPortShoulder.y + rimH).toFixed(1)}`,
      "Z",
    ].join(" ");

    return { d, bowFace, bowTip, sternMid, rimH, midCol };
  }, [cols, rows, cellW, cellH, isBusiness]);

  // Center Aisle Walkway Runner: Symmetrically centered between Port and Starboard
  const aislePolygon = useMemo(() => {
    const halfWidth = isBusiness ? 0.52 : 0.48;
    const leftCol = centerAisleCol - halfWidth;
    const rightCol = centerAisleCol + halfWidth;
    const startRow = -1.2;
    const endRow = rows + 0.8;

    const p1 = gridToIso(leftCol, startRow, cellW, cellH);
    const p2 = gridToIso(rightCol, startRow, cellW, cellH);
    const p3 = gridToIso(rightCol, endRow, cellW, cellH);
    const p4 = gridToIso(leftCol, endRow, cellW, cellH);

    return `${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)} ${p4.x.toFixed(1)},${p4.y.toFixed(1)}`;
  }, [centerAisleCol, rows, cellW, cellH, isBusiness]);

  // Center aisle guide dashes down the exact keel line
  const aisleGuide = useMemo(() => {
    const start = gridToIso(centerAisleCol, -1.0, cellW, cellH);
    const end = gridToIso(centerAisleCol, rows + 0.6, cellW, cellH);
    return { start, end };
  }, [centerAisleCol, rows, cellW, cellH]);

  // Oblong Windows: Smooth rounded capsules aligned with each seat row (offset slightly to the back)
  const oblongWindows = useMemo(() => {
    const portList: { x: number; y: number; rowIdx: number }[] = [];
    const stbdList: { x: number; y: number; rowIdx: number }[] = [];
    const rowOffsetToBack = -0.22;
    const portWinCol = isBusiness ? -0.85 : -0.75;
    const stbdWinCol = isBusiness ? cols - 0.15 : cols - 0.25;

    // Exactly one window per seat row, positioned alongside that row's seats
    for (let r = 0; r < rows; r++) {
      const p = gridToIso(portWinCol, r + rowOffsetToBack, cellW, cellH);
      portList.push({ ...p, rowIdx: r });

      const s = gridToIso(stbdWinCol, r + rowOffsetToBack, cellW, cellH);
      stbdList.push({ ...s, rowIdx: r });
    }

    return { portList, stbdList };
  }, [rows, cols, cellW, cellH, isBusiness]);

  // Directional text markers (Bow forward, Stern aft)
  const bowMarker = useMemo(() => {
    return gridToIso(centerAisleCol, rows + 1.4, cellW, cellH);
  }, [centerAisleCol, rows, cellW, cellH]);

  const sternMarker = useMemo(() => {
    return gridToIso(centerAisleCol, -1.2, cellW, cellH);
  }, [centerAisleCol, cellW, cellH]);

  // Layered Isometric Topography / Wave Elevation Lines
  // Subtle bathymetric nautical depth contours simulating marine elevation surrounding the hull
  const topographyContours = useMemo(() => {
    const midCol = centerAisleCol;
    const contours: { d: string; stroke: string; strokeWidth: number; dash: string; opacity: number; depthLabel?: string; labelPos?: { x: number; y: number } }[] = [];

    const levels = [
      { offset: 2.2, stroke: "#38BDF8", strokeWidth: 1.3, dash: "none", opacity: 0.40, depth: "-5m" },
      { offset: 3.8, stroke: "#60A5FA", strokeWidth: 1.1, dash: "8 6", opacity: 0.32, depth: "-15m" },
      { offset: 5.6, stroke: "#93C5FD", strokeWidth: 1.0, dash: "12 8", opacity: 0.25, depth: "-30m" },
      { offset: 7.6, stroke: "#BFDBFE", strokeWidth: 0.9, dash: "6 8", opacity: 0.18, depth: "-50m" },
      { offset: 9.8, stroke: "#DBEAFE", strokeWidth: 0.8, dash: "none", opacity: 0.14 },
    ];

    levels.forEach(({ offset, stroke, strokeWidth, dash, opacity, depth }) => {
      const pStart = gridToIso(-2.6 - offset * 0.22, rows + offset * 0.85, cellW, cellH);
      const pCtrl1 = gridToIso(midCol - 1.2, rows + offset + 1.3, cellW, cellH);
      const pMid = gridToIso(midCol, rows + offset + 1.0, cellW, cellH);
      const pCtrl2 = gridToIso(midCol + 1.2, rows + offset + 1.3, cellW, cellH);
      const pEnd = gridToIso(cols + 1.6 + offset * 0.22, rows + offset * 0.85, cellW, cellH);

      const d = `M ${pStart.x.toFixed(1)} ${pStart.y.toFixed(1)} C ${pCtrl1.x.toFixed(1)} ${pCtrl1.y.toFixed(1)}, ${pCtrl2.x.toFixed(1)} ${pCtrl2.y.toFixed(1)}, ${pEnd.x.toFixed(1)} ${pEnd.y.toFixed(1)}`;

      contours.push({
        d,
        stroke,
        strokeWidth,
        dash,
        opacity,
        depthLabel: depth,
        labelPos: pMid,
      });
    });

    return contours;
  }, [centerAisleCol, cols, rows, cellW, cellH]);

  return (
    <g className="vessel-hull-plate" pointerEvents="none" aria-hidden="true">
      <defs>
        {/* Subtle deck plank grid */}
        <pattern
          id="cabin-floor-pattern"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 16 0 L 0 0 0 16"
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="0.8"
          />
        </pattern>
      </defs>

      {/* ─── 1. Isometric Topography & Bathymetric Wave Elevation Contours ─── */}
      {topographyContours.map((topo, idx) => (
        <g key={`topo-contour-${idx}`}>
          <path
            d={topo.d}
            fill="none"
            stroke={topo.stroke}
            strokeWidth={topo.strokeWidth}
            strokeDasharray={topo.dash === "none" ? undefined : topo.dash}
            opacity={topo.opacity}
          />
          {topo.depthLabel && topo.labelPos && (
            <text
              x={topo.labelPos.x + 8}
              y={topo.labelPos.y + 11}
              fill={topo.stroke}
              fontSize={7.5}
              fontWeight={600}
              fontFamily="ui-monospace, monospace"
              opacity={topo.opacity * 1.3}
              textAnchor="middle"
            >
              {topo.depthLabel}
            </text>
          )}
        </g>
      ))}

      {/* ─── 2. 3D Bow Drop Rim (Gives the pointy nose physical depth) ─── */}
      <path
        d={hullData.bowFace}
        fill="#CBD5E1"
        stroke="#94A3B8"
        strokeWidth={1}
      />

      {/* ─── 3. Main Deck Floor Plate (Soft Pointy Bow in Front, Rounded Stern Aft) ─── */}
      <path
        d={hullData.d}
        fill="#FFFFFF"
        stroke="#CBD5E1"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {/* ─── 4. Subtle Floor Plank Pattern ─── */}
      <path
        d={hullData.d}
        fill="url(#cabin-floor-pattern)"
        opacity={0.65}
      />

      {/* ─── 5. Center Aisle Walkway Runner (Symmetrically Centered on Keel Line) ─── */}
      <polygon
        points={aislePolygon}
        fill="#F8FAFC"
        stroke="#E2E8F0"
        strokeWidth={1}
      />
      {/* Center aisle dashed guide strip */}
      <line
        x1={aisleGuide.start.x}
        y1={aisleGuide.start.y}
        x2={aisleGuide.end.x}
        y2={aisleGuide.end.y}
        stroke="#CBD5E1"
        strokeWidth={1.2}
        strokeDasharray="4 6"
      />

      {/* ─── 6. Port Oblong Windows (Aligned with Each Seat Row) ─── */}
      {oblongWindows.portList.map((pt) => (
        <g
          key={`port-oblong-win-${pt.rowIdx}`}
          transform={`translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}) rotate(-26.565)`}
        >
          {/* Subtle drop shadow */}
          <rect
            x={-9.5}
            y={-3.8}
            width={19}
            height={8.6}
            rx={4.3}
            fill="#CBD5E1"
            opacity={0.35}
          />
          {/* Outer chrome bezel */}
          <rect
            x={-9.5}
            y={-4.5}
            width={19}
            height={8.6}
            rx={4.3}
            fill="#F8FAFC"
            stroke="#64748B"
            strokeWidth={1.3}
          />
          {/* Inner bezel groove */}
          <rect
            x={-8.0}
            y={-3.4}
            width={16}
            height={6.4}
            rx={3.2}
            fill="none"
            stroke="#94A3B8"
            strokeWidth={0.7}
          />
          {/* Azure maritime glass */}
          <rect
            x={-7.0}
            y={-2.6}
            width={14}
            height={4.8}
            rx={2.4}
            fill="#0284C7"
          />
          {/* Cyan water reflection */}
          <rect
            x={-7.0}
            y={-2.6}
            width={14}
            height={4.8}
            rx={2.4}
            fill="#38BDF8"
            opacity={0.75}
          />
          {/* Primary horizontal specular glint */}
          <rect
            x={-5.0}
            y={-1.8}
            width={6.5}
            height={1.3}
            rx={0.65}
            fill="#FFFFFF"
            opacity={0.92}
          />
          {/* Secondary subtle glint point */}
          <circle
            cx={4.0}
            cy={0.8}
            r={0.7}
            fill="#E0F2FE"
            opacity={0.75}
          />
        </g>
      ))}

      {/* ─── 7. Starboard Oblong Windows (Aligned with Each Seat Row) ─── */}
      {oblongWindows.stbdList.map((pt) => (
        <g
          key={`stbd-oblong-win-${pt.rowIdx}`}
          transform={`translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}) rotate(-26.565)`}
        >
          {/* Subtle drop shadow */}
          <rect
            x={-9.5}
            y={-3.8}
            width={19}
            height={8.6}
            rx={4.3}
            fill="#CBD5E1"
            opacity={0.35}
          />
          {/* Outer chrome bezel */}
          <rect
            x={-9.5}
            y={-4.5}
            width={19}
            height={8.6}
            rx={4.3}
            fill="#F8FAFC"
            stroke="#64748B"
            strokeWidth={1.3}
          />
          {/* Inner bezel groove */}
          <rect
            x={-8.0}
            y={-3.4}
            width={16}
            height={6.4}
            rx={3.2}
            fill="none"
            stroke="#94A3B8"
            strokeWidth={0.7}
          />
          {/* Azure maritime glass */}
          <rect
            x={-7.0}
            y={-2.6}
            width={14}
            height={4.8}
            rx={2.4}
            fill="#0284C7"
          />
          {/* Cyan water reflection */}
          <rect
            x={-7.0}
            y={-2.6}
            width={14}
            height={4.8}
            rx={2.4}
            fill="#38BDF8"
            opacity={0.75}
          />
          {/* Primary horizontal specular glint */}
          <rect
            x={-5.0}
            y={-1.8}
            width={6.5}
            height={1.3}
            rx={0.65}
            fill="#FFFFFF"
            opacity={0.92}
          />
          {/* Secondary subtle glint point */}
          <circle
            cx={4.0}
            cy={0.8}
            r={0.7}
            fill="#E0F2FE"
            opacity={0.75}
          />
        </g>
      ))}

      {/* ─── 8. Directional Text: BOW at Soft Pointy Nose (Forward) ─── */}
      <g transform={`translate(${bowMarker.x}, ${bowMarker.y})`}>
        <text
          x={0}
          y={0}
          fill="#475569"
          fontSize={10}
          fontWeight={800}
          fontFamily="ui-monospace, monospace"
          textAnchor="middle"
          dominantBaseline="central"
          letterSpacing="0.16em"
        >
          ▲ BOW (FORWARD)
        </text>
      </g>

      {/* ─── 9. Directional Text: AFT at Rounded Stern (Rear) ─── */}
      <g transform={`translate(${sternMarker.x}, ${sternMarker.y})`}>
        <text
          x={0}
          y={0}
          fill="#64748B"
          fontSize={9}
          fontWeight={700}
          fontFamily="ui-monospace, monospace"
          textAnchor="middle"
          dominantBaseline="central"
          letterSpacing="0.14em"
        >
          ▼ AFT (STERN)
        </text>
      </g>
    </g>
  );
}
