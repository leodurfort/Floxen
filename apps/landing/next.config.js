/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static exports for optimal CDN caching
  output: 'standalone',
};

module.exports = nextConfig;
