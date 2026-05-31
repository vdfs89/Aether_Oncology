import type { NextConfig } from "next"
import BundleAnalyzer from "@next/bundle-analyzer"

const withBundleAnalyzer = BundleAnalyzer({
  // Run: ANALYZE=true npm run build  — to open the bundle treemap
  enabled: process.env.ANALYZE === "true",
})

const nextConfig: NextConfig = {
  // ── Turbopack root — suppresses multiple-lockfile workspace warning ──────────
  // The repo root carries its own package-lock.json (the Vite static portal),
  // so Next mis-infers the workspace root. Pin it to this frontend dir.
  turbopack: { root: __dirname },

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

  // ── Security headers ────────────────────────────────────────────────────────
  // Migrated from the root vercel.json (which now only governs the legacy Vite
  // portal). These apply to the Next.js app on any host (Vercel / self-hosted).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "img-src 'self' data: https://images.unsplash.com; " +
              "connect-src 'self' https://aether-oncology-api.onrender.com https://api.vitorsilva.engineer;",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
}

export default withBundleAnalyzer(nextConfig)
