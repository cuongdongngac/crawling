import type { MetadataRoute } from "next";

// Web App Manifest: cho phép "cài" ứng dụng lên màn hình chính điện thoại (PWA).
// Mở thẳng vào trang Quét thử vì người dùng điện thoại chủ yếu là cộng tác viên.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "VPHA M&E – Quét hashtag",
    short_name: "VPHA Quét",
    description:
      "Quét thử hashtag/từ khóa trên mạng xã hội, xem bài tương tác cao và đề xuất hashtag mới.",
    lang: "vi",
    dir: "ltr",
    start_url: "/dashboard/quet-thu",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafaf9",
    theme_color: "#1c1917",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Quét thử",
        url: "/dashboard/quet-thu",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Đề xuất hashtag",
        url: "/dashboard/de-xuat",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
