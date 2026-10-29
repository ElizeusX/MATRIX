const paths = {
  sofa: "M15 19V10a4 4 0 0 1 4-4h38a4 4 0 0 1 4 4v9M14 20c-3-3-7-1-7 4v13a4 4 0 0 0 4 4h54a4 4 0 0 0 4-4V24c0-5-4-7-7-4l-5 6H19l-5-6ZM12 41v4m52-4v4M38 15v2",
  corner:
    "M4 21v-1a5 5 0 0 1 2-4L16 8a9 9 0 0 1 6-2h43a6 6 0 0 1 6 5l2 10v13a3 3 0 0 1-3 3H27v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V21Zm0 0h69M27 21v16m41 0v4",
  bed: "M16 24V10a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v14M14 25h48a4 4 0 0 1 4 4v11H10V29a4 4 0 0 1 4-4ZM21 24v-3c0-3 2-5 5-5h3c4 0 6 3 7 8m4 0c1-5 3-8 7-8h3c3 0 5 2 5 5v3M14 40v5m48-5v5",
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
  const isFurniture = kind === "sofa" || kind === "corner" || kind === "bed";
  return (
    <svg
      className="matrix-icon"
      viewBox={isFurniture ? "0 0 76 48" : "0 0 32 32"}
      fill="none"
      stroke="currentColor"
      strokeWidth={isFurniture ? 2.6 : 1.4}
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

