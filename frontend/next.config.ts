import type { NextConfig } from "next"
import BundleAnalyzer from "@next/bundle-analyzer"

const withBundleAnalyzer = BundleAnalyzer({
  // Run: ANALYZE=true npm run build  — to open the bundle treemap
  enabled: process.env.ANALYZE === "true",
})

const nextConfig: NextConfig = {
  // ── Turbopack root — suppresses multiple-lockfile workspace warning ──────────
  // turbopack: { root: __dirname },  // Uncomment if workspace root mismatch persists

  // ── Image optimization ─────────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes:  [16, 32, 48, 64, 96, 128, 256],
  },

  // ── Compiler options ───────────────────────────────────────────────────────
  compiler: {
    // Remove console.log in production (keeps console.warn/error)
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["warn", "error"] }
      : false,
  },

  // ── Experimental ──────────────────────────────────────────────────────────
  experimental: {
    // Inline small CSS to reduce render-blocking requests
    inlineCss: true,
  },
}

export default withBundleAnalyzer(nextConfig)
