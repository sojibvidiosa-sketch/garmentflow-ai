import type { NextConfig } from "next";

// STATIC_DEMO=1 builds a fully static copy of the demo (no server) for
// preview hosting. The normal build keeps server features for Phase 2+.
const staticDemo = process.env.STATIC_DEMO === "1";
// Sub-path when hosted at e.g. https://<user>.github.io/<repo>/ (set by CI).
const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(staticDemo && { output: "export", trailingSlash: true, images: { unoptimized: true } }),
  ...(basePath && { basePath }),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  cacheComponents: !staticDemo,
  partialPrefetching: !staticDemo,
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
