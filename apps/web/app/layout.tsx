import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "MATRIX — Furniture for living", description: "Premium furniture and thoughtful interiors." };

export default function RootLayout({ children }: { children: ReactNode }) {
 return <html lang="uk"><body>{children}</body></html>;
}
