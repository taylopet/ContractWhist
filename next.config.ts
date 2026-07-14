import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/fun',
  output: 'standalone',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/fun',
  },
};

export default nextConfig;
