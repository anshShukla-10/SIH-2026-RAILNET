import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only enable standalone output when explicitly requested in Docker builds
  // (Prevents Vercel/Netlify NFT build errors)
  output: process.env.OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
};

export default nextConfig;

