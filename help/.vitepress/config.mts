import { defineConfig } from "vitepress";

// Trang trợ giúp VPHA — build ra trang tĩnh, Next.js phục vụ tại /help (cùng repo, cùng lần deploy).
//   npm run help:dev    -> xem thử khi viết bài (http://localhost:5173/help/)
//   npm run help:build  -> xuất ra public/help (tự chạy trong `npm run build`)
// Thêm bài: tạo file .md trong thư mục tương ứng rồi thêm một dòng vào `sidebar` bên dưới.
export default defineConfig({
  lang: "vi-VN",
  title: "Trợ giúp VPHA M&E",
  description: "Hướng dẫn sử dụng hệ thống giám sát hashtag – VPHA",
  base: "/help/",
  outDir: "../public/help",
  cleanUrls: false, // Next.js phục vụ file tĩnh nguyên tên (.html)
  srcExclude: ["README.md"],
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", href: "/icons/icon-192.png" }],
    ["meta", { name: "theme-color", content: "#1c1917" }],
  ],

  themeConfig: {
    siteTitle: "Trợ giúp VPHA M&E",
    logo: "/icons/icon-192.png",

    nav: [
      { text: "Bắt đầu", link: "/bat-dau/gioi-thieu" },
      { text: "Cộng tác viên", link: "/cong-tac-vien/quet-thu" },
      { text: "Quản trị", link: "/quan-tri/cau-hinh" },
      { text: "Hỏi đáp", link: "/hoi-dap" },
    ],

    sidebar: [
      {
        text: "1. Bắt đầu",
        items: [
          { text: "Hệ thống làm gì, không làm gì", link: "/bat-dau/gioi-thieu" },
          { text: "Cài ứng dụng lên điện thoại", link: "/bat-dau/cai-ung-dung" },
          { text: "Nguyên tắc an toàn khi quan sát", link: "/bat-dau/nguyen-tac-an-toan" },
        ],
      },
      {
        text: "2. Cộng tác viên",
        items: [
          { text: "Lấy API key Apify cá nhân", link: "/cong-tac-vien/api-key-apify" },
          { text: "Quét thử từ khóa", link: "/cong-tac-vien/quet-thu" },
          { text: "Quy tắc ba tiêu chí", link: "/cong-tac-vien/ba-tieu-chi" },
          { text: "Gửi phiếu đề xuất hashtag", link: "/cong-tac-vien/de-xuat-hashtag" },
        ],
      },
      {
        text: "3. Quản trị",
        items: [
          { text: "Cấu hình khóa hệ thống & AI", link: "/quan-tri/cau-hinh" },
          { text: "Duyệt phiếu đề xuất", link: "/quan-tri/duyet-de-xuat" },
          { text: "Quét chính thức (đang phát triển)", link: "/quan-tri/quet-chinh-thuc" },
        ],
      },
      { text: "Hỏi đáp", link: "/hoi-dap" },
    ],

    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "Tìm hướng dẫn…", buttonAriaLabel: "Tìm hướng dẫn" },
          modal: {
            noResultsText: "Không tìm thấy kết quả phù hợp",
            resetButtonTitle: "Xóa tìm kiếm",
            footer: { selectText: "chọn", navigateText: "di chuyển", closeText: "đóng" },
          },
        },
      },
    },

    outline: { level: [2, 3], label: "Trong bài này" },
    docFooter: { prev: "Bài trước", next: "Bài tiếp theo" },
    lastUpdated: { text: "Cập nhật lần cuối" },
    darkModeSwitchLabel: "Giao diện",
    sidebarMenuLabel: "Mục lục",
    returnToTopLabel: "Lên đầu trang",
    footer: {
      message: "Hội Y tế công cộng Việt Nam (VPHA) – Hệ thống giám sát M&E",
      copyright: "Tài liệu nội bộ dành cho cộng tác viên và nhóm nghiên cứu.",
    },
  },
});
