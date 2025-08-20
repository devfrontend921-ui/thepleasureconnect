import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
   env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
  },
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
