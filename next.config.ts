import type { NextConfig } from "next";

// Cache Components is intentionally off: every page here is per-user, live data
// read from Google Sheets, so the classic "dynamic when you read cookies" model fits.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
