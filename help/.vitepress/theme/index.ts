import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import "./custom.css";

// Thêm nút "← Về ứng dụng" trên thanh đầu trang (link tuyệt đối /dashboard, nằm ngoài base /help/).
// target="_self" để router VitePress không chặn cú bấm — nếu không nó tự gắn đuôi .html (cleanUrls: false) → /dashboard.html bị 404.
export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "nav-bar-content-after": () => h("a", { href: "/dashboard", target: "_self", class: "vpha-back" }, "← Về ứng dụng"),
    });
  },
};
