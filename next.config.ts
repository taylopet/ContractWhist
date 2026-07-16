import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/fun',
  output: 'standalone',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/fun',
  },
  async redirects() {
    return [
      // www → apex, path preserved
      {
        source: '/:path*',
        basePath: false,
        has: [{ type: 'host', value: 'www.tixo.com' }],
        destination: 'https://tixo.com/:path*',
        permanent: true,
      },
      // Root → /fun so tixo.com lands somewhere useful
      {
        source: '/',
        basePath: false,
        destination: '/fun',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        basePath: false,
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
