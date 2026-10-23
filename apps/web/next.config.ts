import type { NextConfig } from "next";
const nextConfig: NextConfig = {
 async rewrites() {
  return [{ source: "/api/v1/:path*", destination: `${process.env.MATRIX_API_INTERNAL_URL || "http://localhost:8080"}/api/v1/:path*` }];
 },
 reactStrictMode: true,
};
export default nextConfig;
