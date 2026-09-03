import type { ReactNode } from "react";

interface BusChassisProps {
  children: ReactNode;
}

export function BusChassis({ children }: BusChassisProps) {
  return (
    <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[360px] select-none my-2">
      <svg
        viewBox="0 0 320 780"
        className="w-full h-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="46" y1="90" x2="36" y2="86" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <rect x="28" y="76" width="9" height="24" rx="3" fill="currentColor" className="text-slate-100 dark:text-slate-800" stroke="#94a3b8" strokeWidth="1.2" />

        <line x1="274" y1="90" x2="284" y2="86" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <rect x="283" y="76" width="9" height="24" rx="3" fill="currentColor" className="text-slate-100 dark:text-slate-800" stroke="#94a3b8" strokeWidth="1.2" />

        <path
          d="M 46 65 C 46 26, 110 12, 160 12 C 210 12, 274 26, 274 65 L 274 740 C 274 760, 236 768, 160 768 C 84 768, 46 760, 46 740 Z"
          className="fill-slate-100 dark:fill-slate-800/80 stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="2"
        />

        <path
          d="M 52 65 C 52 34, 112 20, 160 20 C 208 20, 268 34, 268 65 L 268 735 C 268 752, 234 760, 160 760 C 86 760, 52 752, 52 735 Z"
          className="fill-white dark:fill-slate-900/90 stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="1"
        />

        <path
          d="M 48 44 C 50 30, 70 30, 76 34 L 74 58 C 62 58, 49 58, 48 44 Z"
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#93c5fd"
          strokeWidth="1.5"
        />

        <path
          d="M 272 44 C 270 30, 250 30, 244 34 L 246 58 C 258 58, 271 58, 272 44 Z"
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#93c5fd"
          strokeWidth="1.5"
        />

        <path
          d="M 64 60 Q 160 48 256 60"
          className="stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        <g transform="translate(262, 400)">
          <rect
            x="0"
            y="0"
            width="14"
            height="55"
            rx="3"
            className="fill-blue-50 dark:fill-blue-950/60 stroke-blue-300 dark:stroke-blue-700"
            strokeWidth="1"
          />
          <text x="7" y="15" className="fill-blue-600 dark:fill-blue-400" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">D</text>
          <text x="7" y="27" className="fill-blue-600 dark:fill-blue-400" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">O</text>
          <text x="7" y="39" className="fill-blue-600 dark:fill-blue-400" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">O</text>
          <text x="7" y="51" className="fill-blue-600 dark:fill-blue-400" fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">R</text>
        </g>

        <path
          d="M 60 750 Q 160 756 260 750"
          className="stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect x="58" y="747" width="26" height="6" rx="2" fill="#ef4444" opacity="0.8" />
        <rect x="236" y="747" width="26" height="6" rx="2" fill="#ef4444" opacity="0.8" />
      </svg>

      <div className="absolute inset-0 z-10 flex flex-col justify-between pt-[21%] pb-[4%] px-[18%]">
        {children}
      </div>
    </div>
  );
}
