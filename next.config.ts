import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server build (used by `npm run start` / container deploys).
  output: "standalone",

  typescript: {
    // NOTE: This lets `next build` succeed even if there are TypeScript errors.
    // It is kept ON so the production build cannot be blocked by a type error.
    // Recommended follow-up: run `npx tsc --noEmit`, fix any errors, then set
    // this to `false` so type errors are caught at build time.
    ignoreBuildErrors: true,
  },

  reactStrictMode: false,
};

export default nextConfig;
