import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Standalone output is only for custom Docker builds, not for Vercel
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;

