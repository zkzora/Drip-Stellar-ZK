/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@jup-ag/wallet-adapter"],
  serverExternalPackages: ["@aztec/bb.js", "@noir-lang/noir_js"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

module.exports = nextConfig;
