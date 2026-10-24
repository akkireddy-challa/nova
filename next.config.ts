import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker build sets NEXT_OUTPUT=standalone to emit .next/standalone (minimal server.js);
  // `next start` does not support standalone output, so it stays off for local use.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
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
