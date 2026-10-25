import type { ReactNode } from "react";
export function FurnitureIcon({
  kind,
}: {
  kind: "sofa" | "corner" | "bed" | "search" | "bag" | "cube";
}) {
  const paths: Record<string, ReactNode> = {
    sofa: (
      <>
        <path d="M5 12V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4M5 10H3v9h18v-9h-2M5 14h14M6 19v2m12-2v2" />
      </>
    ),
    corner: (
      <>
        <path d="M3 12V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13h-6v-6H3v-4h3v4m9 0V9h6M5 14v5m14 1v2" />
      </>
    ),
    bed: (
      <>
        <path d="M4 12V5h16v7M2 20v-8h20v8M2 17h20M6 12V8h5v4m2 0V8h5v4" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    bag: (
      <>
        <path d="M5 7h14l2 14H3L5 7Zm3 3V6a4 4 0 0 1 8 0v4" />
      </>
    ),
    cube: (
      <>
        <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5M12 12 3 7m9 5v10M7 4.5l9 5" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  );
}
export function Brand() {
  return (
    <>
      <span className="brand-symbol" aria-hidden="true">
        M
      </span>
      <span className="brand-type">
        MATRIX<small>ФАБРИКА М’ЯКИХ МЕБЛІВ</small>
      </span>
    </>
  );
}
