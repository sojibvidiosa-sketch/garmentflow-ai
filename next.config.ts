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
  // Security headers for the server deployment (static hosting cannot set headers).
  ...(!staticDemo && {
    poweredByHeader: false,
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
            { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          ],
        },
      ];
    },
  }),
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
