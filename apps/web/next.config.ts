import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@listingforge/adapters",
    "@listingforge/ai",
    "@listingforge/config",
    "@listingforge/html",
    "@listingforge/pricing",
    "@listingforge/schemas",
    "@listingforge/security",
    "@listingforge/ui"
  ]
};

export default nextConfig;
