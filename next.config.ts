import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Header-based CSP (no nonces) so every page can stay statically prerendered.
// React needs 'unsafe-eval' in development only. If you add third-party scripts, analytics
// or embeds, extend the matching directive here.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  // Lets `npm run dev` work through a Cloudflare quick tunnel (cloudflared tunnel --url http://localhost:3000).
  // Hostnames only, no port; localhost is already allowed. Has no effect on `next start`.
  allowedDevOrigins: ["*.trycloudflare.com"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
