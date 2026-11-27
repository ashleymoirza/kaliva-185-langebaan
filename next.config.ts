import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy.
 * NOTE: Meta Pixel + Next.js hydration bootstrap require inline scripts, so
 * 'unsafe-inline' is permitted for script-src. To tighten this later, generate
 * a per-request nonce inside proxy.ts and switch to a nonce-based policy.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://www.payfast.co.za https://sandbox.payfast.co.za https://checkout.stripe.com",
  "script-src 'self' 'unsafe-inline' https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.facebook.com https://web.facebook.com https://*.fbcdn.net https://maps.gstatic.com https://maps.googleapis.com",
  "font-src 'self' data:",
  "connect-src 'self' https://www.facebook.com https://connect.facebook.net https://api.stripe.com https://www.payfast.co.za",
  "frame-src 'self' https://www.google.com https://maps.google.com https://checkout.stripe.com",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Keep classic App Router rendering (no Cache Components model) so DB pages stay conventional.
  cacheComponents: false,
  poweredByHeader: false,
  reactStrictMode: true,
  // Standalone output is ideal for a Contabo/Nginx deployment.
  output: "standalone",
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 14400,
    // Placeholder art in /public is SVG. Allowing it here is safe because the
    // images are our own local assets and the CSP below neuters any scripting.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
