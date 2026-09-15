import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Standalone output is only for custom Docker builds, not for Vercel
  output: process.env.VERCEL ? undefined : "standalone",
  // Only enable standalone output when explicitly requested in Docker builds
  // (Prevents Vercel/Netlify NFT build errors)
  output: process.env.OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
};

export default nextConfig;

