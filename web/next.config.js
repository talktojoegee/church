const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  staticPageGenerationTimeout: 180,
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  serverExternalPackages: ['axios'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
