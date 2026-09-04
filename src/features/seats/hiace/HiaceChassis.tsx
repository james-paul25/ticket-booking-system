import type { ReactNode } from "react";

interface HiaceChassisProps {
  children: ReactNode;
}

export function HiaceChassis({ children }: HiaceChassisProps) {
  return (
    <div className="relative mx-auto w-full max-w-[270px] select-none my-2">
      <svg
        viewBox="0 0 320 530"
        className="w-full h-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line x1="46" y1="102" x2="36" y2="98" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <rect x="28" y="88" width="9" height="20" rx="3" fill="currentColor" className="text-slate-100 dark:text-slate-800" stroke="#94a3b8" strokeWidth="1.2" />

        <line x1="274" y1="102" x2="284" y2="98" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <rect x="283" y="88" width="9" height="20" rx="3" fill="currentColor" className="text-slate-100 dark:text-slate-800" stroke="#94a3b8" strokeWidth="1.2" />

        <path
          d="M 46 75 C 46 32, 110 18, 160 18 C 210 18, 274 32, 274 75 L 274 485 C 274 508, 240 516, 160 516 C 80 516, 46 508, 46 485 Z"
          className="fill-slate-100 dark:fill-slate-800/80 stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="2"
        />

        <path
          d="M 52 75 C 52 40, 112 28, 160 28 C 208 28, 268 40, 268 75 L 268 480 C 268 500, 236 508, 160 508 C 84 508, 52 500, 52 480 Z"
          className="fill-white dark:fill-slate-900/90 stroke-slate-200 dark:stroke-slate-700"
          strokeWidth="1"
        />

        <path
          d="M 48 50 C 50 34, 70 34, 76 38 L 74 66 C 62 66, 49 66, 48 50 Z"
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#93c5fd"
          strokeWidth="1.5"
        />

        <path
          d="M 272 50 C 270 34, 250 34, 244 38 L 246 66 C 258 66, 271 66, 272 50 Z"
          fill="rgba(59, 130, 246, 0.1)"
          stroke="#93c5fd"
          strokeWidth="1.5"
        />

        <path
          d="M 64 78 Q 160 64 256 78"
          className="stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        <g transform="translate(262, 155)">
          <rect
            x="0"
            y="0"
            width="14"
            height="75"
            rx="3"
            className="fill-blue-50 dark:fill-blue-950/60 stroke-blue-300 dark:stroke-blue-700"
            strokeWidth="1"
          />
          <text x="7" y="19" className="fill-blue-600 dark:fill-blue-400" fontSize="7.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">D</text>
          <text x="7" y="33" className="fill-blue-600 dark:fill-blue-400" fontSize="7.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">O</text>
          <text x="7" y="47" className="fill-blue-600 dark:fill-blue-400" fontSize="7.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">O</text>
          <text x="7" y="61" className="fill-blue-600 dark:fill-blue-400" fontSize="7.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">R</text>
        </g>

        <path
          d="M 60 496 Q 160 504 260 496"
          className="stroke-slate-300 dark:stroke-slate-600"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect x="58" y="493" width="26" height="6" rx="2" fill="#ef4444" opacity="0.8" />
        <rect x="236" y="493" width="26" height="6" rx="2" fill="#ef4444" opacity="0.8" />
      </svg>

      <div className="absolute inset-0 z-10 flex flex-col justify-between pt-[27%] pb-[6%] px-[18%]">
        {children}
      </div>
    </div>
  );
}
