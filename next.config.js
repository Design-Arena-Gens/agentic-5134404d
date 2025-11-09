/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lightweight-charts"],
  },
};

module.exports = nextConfig;
