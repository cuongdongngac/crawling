# Quét chính thức

::: warning Đang phát triển
Phần quét chính thức chạy ngầm theo lịch đang được hoàn thiện. Bài này mô tả cách hệ thống sẽ hoạt động.
:::

- Quản trị viên lập **lịch quét**: công cụ, nhóm hashtag, số bài mỗi từ khóa, tần suất.
- Hệ thống **tự chạy ngầm** đúng hạn bằng Apify token hệ thống — không ai phải ngồi chờ.
- Mỗi bài được lưu **một lần**; mỗi lần quét lưu thêm một dòng số liệu tương tác (không ghi đè) để vẽ xu hướng.
- Bài đã phát hiện sẽ được **đo lại theo các mốc tuổi bài** để thấy bài nào tiếp tục tăng tương tác.
- Nếu bật AI, bài mới được **gợi ý nhãn** (mục đích, loại chủ thể, tiêu chí chữ và giao dịch); người xác minh quyết định.
