const paths = {
  sofa: "M7 15v-5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v5M7 15H5a2 2 0 0 0-2 2v7h26v-7a2 2 0 0 0-2-2h-2M7 15v5h18v-5M5 24v3m22-3v3M16 12v.5",
  corner:
    "m3 13 6-6h17a3 3 0 0 1 3 3v11H13v6H3V13Zm0 0h26M13 13v14m0-6h16M5 27v2m22-8v3",
  bed: "M6 16V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7M5 16h22a2 2 0 0 1 2 2v7H3v-7a2 2 0 0 1 2-2ZM8 16v-3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3m4 0v-3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3M5 25v3m22-3v3",
  search: "M22 13a9 9 0 1 1-9-9h4l5 5v4Zm-2 7 8 8M8 13q0-5 5-5",
  bag: "M7 11h18l3 17H4l3-17Zm5 3V8a4 4 0 0 1 8 0v6M11 22l5-4 5 4",
  cube: "m16 6 9 5v10l-9 5-9-5V11l9-5Zm0 10 9-5m-9 5-9-5m9 5v10M3 10V4h6m14 0h6v6M3 23v6h6m14 0h6v-6",
  heart: "M16 27 5 16C-2 8 9-1 16 9c7-10 18-1 11 7L16 27Zm-8-15q0-4 4-4",
  arrow: "M3 16h25M21 8l8 8-8 8M6 12v8",
  close: "M8 8 24 24M24 8 8 24",
  menu: "M4 8h24M4 16h18M4 24h24M27 14v4",
  reset: "M6 12a11 11 0 1 1 1 12M6 4v8h8M16 10v7l5 3",
  fullscreen: "M4 12V4h8m8 0h8v8M4 20v8h8m8 0h8v-8M12 16h8m-4-4v8",
} as const;
export function FurnitureIcon({ kind }: { kind: keyof typeof paths }) {
  return (
    <svg
      className="matrix-icon"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[kind]} />
    </svg>
  );
}
export function Brand() {
  return (
    <span className="brand-logo">
      <img
        src="/media/matrix-logo-transparent-v1.png"
        alt="MATRIX — Фабрика м’яких меблів"
        width={1539}
        height={1022}
        decoding="async"
      />
    </span>
  );
}

