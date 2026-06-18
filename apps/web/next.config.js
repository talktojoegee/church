const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' produces a self-contained server bundle that runs well as a
  // single Node app on Hostinger (Setup Node.js App) or under PM2 on a VPS.
  output: 'standalone',
  // Trace from the monorepo root so workspace deps are bundled into standalone.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  reactStrictMode: true,
  // Consume the shared TS workspace package directly.
  transpilePackages: ['@chms/shared'],
  // Avoid broken vendor-chunk references for axios in pnpm monorepos.
  serverExternalPackages: ['axios'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
