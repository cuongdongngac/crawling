import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import "./custom.css";

// Thêm nút "← Về ứng dụng" trên thanh đầu trang (link tuyệt đối /dashboard, nằm ngoài base /help/).
export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      "nav-bar-content-after": () => h("a", { href: "/dashboard", class: "vpha-back" }, "← Về ứng dụng"),
    });
  },
};
