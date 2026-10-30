# Lấy API key Apify cá nhân

Quét thử dùng tài khoản **Apify** của chính bạn. Apify là dịch vụ chạy các công cụ thu thập bài công khai trên TikTok, Facebook…; chi phí mỗi lần quét tính vào tài khoản của bạn.

## Các bước

1. Vào [console.apify.com](https://console.apify.com) và đăng ký tài khoản (có thể đăng nhập bằng Google).
2. Mở **Settings → API & Integrations** ([đường dẫn trực tiếp](https://console.apify.com/settings/integrations)).
3. Trong mục **Personal API tokens**, bấm biểu tượng sao chép để lấy key (dạng `apify_api_…`).
4. Mở trang **Quét thử** của hệ thống, dán vào ô **API key Apify của bạn**.

::: tip Nhớ key trên máy
Tích **“Nhớ key trên máy này”** để lần sau khỏi dán lại. Key chỉ lưu trong trình duyệt của máy đó, không gửi lên cơ sở dữ liệu. **Không tích trên máy dùng chung.**
:::

## Chi phí

- Gói miễn phí của Apify có hạn mức sử dụng hằng tháng; xem số đã dùng trong Apify Console → **Billing**.
- Trước khi quét, hệ thống hiện **ước tính chi phí tối đa** theo giá gói miễn phí.
- Với công cụ Facebook, tài khoản miễn phí chỉ lấy được tối đa khoảng 100 bài cho mỗi từ khóa.

::: danger Giữ bí mật key
Ai có key của bạn có thể dùng hết hạn mức trên tài khoản của bạn. Không gửi key qua tin nhắn, không dán vào nhóm chat. Nếu lỡ lộ: vào lại trang trên, tạo key mới và xóa key cũ.
:::
