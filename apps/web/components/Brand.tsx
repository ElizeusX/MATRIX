const paths = {
  sofa: "M15 20v-8a6 6 0 0 1 6-6h34a6 6 0 0 1 6 6v8M14 20c-3-3-7-1-7 3v12a6 6 0 0 0 6 6h50a6 6 0 0 0 6-6V23c0-4-4-6-7-3l-3 5a4 4 0 0 1-3 2H20a4 4 0 0 1-3-2l-3-5ZM13 41v4m50-4v4M38 15v2",
  corner:
    "M5 22v-2a5 5 0 0 1 2-4L17 8a9 9 0 0 1 6-2h40a7 7 0 0 1 7 6l2 10v11a4 4 0 0 1-4 4H28v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V22Zm0 0h63a4 4 0 0 1 4 4M28 22v15m39 0v4",
  bed: "M16 24V12a6 6 0 0 1 6-6h32a6 6 0 0 1 6 6v12M15 25h46a4 4 0 0 1 4 4v8a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3v-8a4 4 0 0 1 4-4ZM20 24l1-5a4 4 0 0 1 4-3h5a4 4 0 0 1 4 3l1 5m6 0 1-5a4 4 0 0 1 4-3h5a4 4 0 0 1 4 3l1 5M15 40v5m46-5v5",
  search: "M22 13a9 9 0 1 1-9-9h4l5 5v4Zm-2 7 8 8M8 13q0-5 5-5",
  bag: "M7 11h18l3 17H4l3-17Zm5 3V8a4 4 0 0 1 8 0v6M11 22l5-4 5 4",
  cube: "m16 6 9 5v10l-9 5-9-5V11l9-5Zm0 10 9-5m-9 5-9-5m9 5v10M3 10V4h6m14 0h6v6M3 23v6h6m14 0h6v-6",
  arrow: "M4 16h24m-8-8 8 8-8 8",
  close: "M8 8 24 24M24 8 8 24",
} as const;
export function FurnitureIcon({ kind }: { kind: keyof typeof paths }) {
  const isFurniture = kind === "sofa" || kind === "corner" || kind === "bed";
  return (
    <svg
      className="matrix-icon"
      viewBox={isFurniture ? "0 0 76 48" : "0 0 32 32"}
      fill="none"
      stroke="currentColor"
      strokeWidth={isFurniture ? 2.6 : kind === "arrow" ? 1.6 : 1.4}
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

