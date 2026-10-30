import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // src/lib/data.ts lê os JSON de public/data com fs: garante que eles vão junto nas funções do servidor
  outputFileTracingIncludes: {
    "/*": ["./public/data/*.json"],
    "/cidade/*": ["./public/data/mun/*.json"],
  },
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
