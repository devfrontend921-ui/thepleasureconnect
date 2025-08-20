import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true, // Esto permite que la compilación continúe a pesar de errores de TypeScript
  },
  eslint: {
    ignoreDuringBuilds: true, // Esto permite que la compilación continúe a pesar de errores de ESLint
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

export default nextConfig;
