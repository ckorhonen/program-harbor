import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/admin", destination: "/" },
        { source: "/admin/:path*", destination: "/" },
        { source: "/evaluator", destination: "/" },
        { source: "/portal", destination: "/" },
        { source: "/cfp", destination: "/" },
        { source: "/schedule", destination: "/" },
        { source: "/speakers", destination: "/" },
        { source: "/api/docs", destination: "/" },
      ],
    };
  },
};

export default nextConfig;
