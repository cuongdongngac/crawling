# Quét chính thức

::: warning Đang phát triển
Phần quét chính thức chạy ngầm theo lịch đang được hoàn thiện. Bài này mô tả cách hệ thống sẽ hoạt động. Thiết kế chi tiết: [Hai luồng quét](../thiet-ke/hai-luong-quet), [Sàng lọc bài](../thiet-ke/sang-loc-ai).
:::

- Quản trị viên lập **lịch quét**: công cụ, nhóm hashtag, số bài mỗi từ khóa, tần suất.
- Hệ thống **tự chạy ngầm** đúng hạn bằng Apify token hệ thống — không ai phải ngồi chờ.
- Mỗi bài được lưu **một lần**; mỗi lần quét lưu thêm một dòng số liệu tương tác (không ghi đè) để vẽ xu hướng.
- Bài đã phát hiện sẽ được **đo lại theo link bài** ở các mốc 3/7/14/30 ngày rồi kiểm kê định kỳ, bằng công cụ đo lại riêng (không quét lại hashtag).
- Bài **không liên quan** (đúng hashtag nhưng không về thuốc lá điện tử) được AI và nghiên cứu viên sàng lọc, không đo lại.
- Nếu bật AI, bài mới được **gợi ý nhãn** (mục đích, loại chủ thể, tiêu chí chữ và giao dịch); người xác minh quyết định.
