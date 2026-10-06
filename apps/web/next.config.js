/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@playmate/types", "@playmate/validation", "@playmate/config"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;
