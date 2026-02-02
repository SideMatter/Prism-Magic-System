/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    localPatterns: [
      {
        pathname: '/paul-bot.png',
        // Omit search to allow query strings for cache busting
      },
    ],
  },
  // Fix for Next.js 15 build issues
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;

