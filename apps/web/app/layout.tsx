import type { ReactNode } from "react";
import type { Viewport } from "next";
import "./globals.css";

export const metadata = { title: "MATRIX — Furniture for living", description: "Premium furniture and thoughtful interiors." };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
 return <html lang="uk"><body>{children}</body></html>;
}
