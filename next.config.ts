import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/fun',
  output: 'standalone',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/fun',
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.tixo.com' }],
        destination: 'https://tixo.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
