import type { NextConfig } from "next";

// STATIC_DEMO=1 builds a fully static copy of the demo (no server) for
// preview hosting. The normal build keeps server features for Phase 2+.
const staticDemo = process.env.STATIC_DEMO === "1";
// Sub-path when hosted at e.g. https://<user>.github.io/<repo>/ (set by CI).
const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(staticDemo && { output: "export", trailingSlash: true, images: { unoptimized: true } }),
  ...(basePath && { basePath }),
  // Files named *.server.ts (auth route handlers, proxy) need a server, so
  // the static demo build leaves them out.
  pageExtensions: staticDemo ? ["tsx", "ts"] : ["server.ts", "tsx", "ts"],
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  cacheComponents: !staticDemo,
  partialPrefetching: !staticDemo,
  turbopack: {
    // The static demo has no server: each server-action module "x.ts" is
    // replaced by its demo stand-in "x.static.ts" when one exists.
    ...(staticDemo && {
      resolveExtensions: [".static.ts", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
    }),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
