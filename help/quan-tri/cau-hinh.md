# Cấu hình khóa hệ thống & AI

Trang **Cấu hình** (chỉ quản trị viên) khai báo các khóa dùng cho **quét chính thức**. Quét thử của cộng tác viên **không** dùng các khóa này.

## Apify — công cụ quét

- Dán **Apify token** của tài khoản dự án → **Kiểm tra** để xem tài khoản, gói, số đã dùng và hạn mức tháng.
- Lịch quét chính thức dùng token này để chạy và ghi bài vào kho dữ liệu.

## OpenRouter — AI

- Dán **OpenRouter key** (dạng `sk-or-…`) → **Kiểm tra** để xem đã dùng, hạn mức, còn lại.
- **Nên đặt hạn mức chi tiêu cho key** trên openrouter.ai; trang sẽ nhắc nếu key chưa có hạn mức.
- **Model mặc định**: chọn trong danh sách (tìm kiếm, lọc *Miễn phí*, *Đọc được ảnh*, *Trả JSON*; sắp xếp theo giá, ngữ cảnh…). Giá ghi theo USD / 1 triệu token (vào / ra). Bấm **Thử model** để hỏi một câu và xem tốc độ, chi phí.
- **Tự gắn nhãn bài mới** sau mỗi lần quét chính thức: mặc định **tắt**. AI chỉ gợi ý; nhãn lưu riêng, không sửa dữ liệu bài.
- **Trần chi phí AI mỗi tháng**: hết trần thì AI tự dừng.

## Lưu ý

- Ô khóa **để trống = giữ khóa cũ**. Khóa mới được kiểm tra với dịch vụ trước khi lưu; khóa sai không lưu.
- Khóa chỉ hiện dạng che (`sk-or-v1…abcd`), không ai đọc lại được nguyên văn trên giao diện.
- Bấm **Lưu cấu hình** một lần cho tất cả thay đổi.
