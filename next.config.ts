import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trang trợ giúp (VitePress build ra public/help): /help -> trang chủ trợ giúp.
  async rewrites() {
    return [{ source: "/help", destination: "/help/index.html" }];
  },
  // Phòng hờ: link cũ /dashboard.html (do router VitePress gắn đuôi .html) -> /dashboard.
  async redirects() {
    return [{ source: "/dashboard.html", destination: "/dashboard", permanent: false }];
  },
  async headers() {
    return [
      {
        // Service worker luôn lấy bản mới nhất để cập nhật ứng dụng ngay khi deploy.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
