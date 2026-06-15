/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@jup-ag/wallet-adapter"],
  serverExternalPackages: ["@aztec/bb.js", "@noir-lang/noir_js"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      {
        // public images/fonts — cache 7 days, stale-while-revalidate 30 days
        source: "/:path*\\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
