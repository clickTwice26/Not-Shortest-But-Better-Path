import type { NextConfig } from 'next';

// Single-origin deployment. The /api/* proxy lives in a route handler
// (src/app/api/[...path]/route.ts) rather than a rewrite, because rewrite
// destinations are baked at build time and would pin the API address into the
// image. See that file for the reasoning.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Required by web/Dockerfile — emits .next/standalone with a bundled server.
  output: 'standalone',
  modularizeImports: {
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
  },
};

export default nextConfig;
