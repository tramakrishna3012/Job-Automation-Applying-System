import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  typescript: { ignoreBuildErrors: true },
  experimental: {
    cpus: 1,
    workerThreads: false,
  }
};

export default nextConfig;
