import type { NextConfig } from 'next';

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
