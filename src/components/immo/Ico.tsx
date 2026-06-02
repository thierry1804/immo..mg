import type { SVGProps } from "react";

export type IcoName =
  | "spark"
  | "shield"
  | "bolt"
  | "gate"
  | "car"
  | "drop"
  | "plug"
  | "house"
  | "bed"
  | "ruler"
  | "floors"
  | "check"
  | "minus"
  | "pin"
  | "layers"
  | "school"
  | "clock";

const PATHS: Record<IcoName, React.ReactNode> = {
  spark: <path d="M12 3v6m0 6v6m-9-9h6m6 0h6" />,
  shield: <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" />,
  bolt: <path d="M13 3L5 13h6l-2 8 8-10h-6l2-8z" />,
  gate: <path d="M4 21V6l8-3 8 3v15M4 11h16M9 11v10M15 11v10" />,
  car: <path d="M5 16l1.5-5h11L19 16M3 16h18v3H3zM7 19v2M17 19v2" />,
  drop: <path d="M12 3c4 5 6 8 6 11a6 6 0 11-12 0c0-3 2-6 6-11z" />,
  plug: <path d="M9 3v5m6-5v5M6 8h12v3a6 6 0 01-12 0V8zm6 9v4" />,
  house: <path d="M4 11l8-7 8 7M6 10v10h12V10" />,
  bed: <path d="M3 8v10M3 13h18v5M21 18v-5a3 3 0 00-3-3H9v3" />,
  ruler: <path d="M4 14L14 4l6 6L10 20 4 14zm3-3l2 2m1-4l2 2m1-4l2 2" />,
  floors: <path d="M4 20h16M4 20V9l8-5 8 5v11M9 20v-6h6v6" />,
  check: <path d="M5 12l5 5L19 7" strokeWidth={2.4} />,
  minus: <path d="M6 12h12" strokeWidth={2.4} />,
  pin: <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12zm0-9a3 3 0 100-6 3 3 0 000 6z" />,
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5" />,
  school: <path d="M3 9l9-4 9 4-9 4-9-4zm3 2v5c0 1 3 2 6 2s6-1 6-2v-5" />,
  clock: <path d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-14v5l3 2" />,
};

type Props = SVGProps<SVGSVGElement> & { name: IcoName; size?: number };

export default function Ico({ name, size = 18, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
