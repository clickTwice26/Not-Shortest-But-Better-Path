import type { NextConfig } from 'next';

// Single-origin deployment: the browser only ever talks to this app, and
// /api/* is proxied to FastAPI server-side. One domain, one certificate, no
// CORS. API_ORIGIN is read at runtime, so the same image works anywhere.
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:8000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Required by web/Dockerfile — emits .next/standalone with a bundled server.
  output: 'standalone',
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/:path*` }];
  },
  modularizeImports: {
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
  },
};

export default nextConfig;
