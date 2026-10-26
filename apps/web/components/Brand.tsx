const paths = {
  sofa: "M7 17V11q0-4 4-4h10q4 0 4 4v6M7 15H4v10h24V15h-3M7 20h18M16 9v9M7 25v3m18-3v3",
  corner:
    "M6 5h20q3 0 3 3v17q0 2-2 2h-7q-2 0-2-2v-6H6q-3 0-3-3V8q0-3 3-3ZM7 9h18v14M7 9v6h18M16 9v6M22 15v8",
  bed: "M5 18V8q0-3 3-3h16q3 0 3 3v10M3 28V18h26v10M3 24h26M8 17v-6h6v6m4 0v-6h6v6M16 7v2",
  search: "M22 13a9 9 0 1 1-9-9h4l5 5v4Zm-2 7 8 8M8 13q0-5 5-5",
  bag: "M7 11h18l3 17H4l3-17Zm5 3V8a4 4 0 0 1 8 0v6M11 22l5-4 5 4",
  cube: "m16 6 9 5v10l-9 5-9-5V11l9-5Zm0 10 9-5m-9 5-9-5m9 5v10M3 10V4h6m14 0h6v6M3 23v6h6m14 0h6v-6",
  heart: "M16 27 5 16C-2 8 9-1 16 9c7-10 18-1 11 7L16 27Zm-8-15q0-4 4-4",
  arrow: "M3 16h25M21 8l8 8-8 8M6 12v8",
  close: "m8 8 16 16M24 8 8 24M4 10V4h6m12 24h6v-6",
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
        src="/media/matrix-logo.png"
        alt="MATRIX — Фабрика м’яких меблів"
        width={918}
        height={610}
        decoding="async"
      />
    </span>
  );
}
