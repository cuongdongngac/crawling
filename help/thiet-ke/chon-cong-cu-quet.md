# Chọn công cụ quét (actor Apify)

::: tip Mục tạm thời — kênh trao đổi thiết kế
Mục **Thiết kế đang phát triển** giải thích ý tưởng, cách làm và **hạn chế** của hệ thống trong giai đoạn xây dựng, để nhóm cùng xem và góp ý. Mục này sẽ được rút gọn hoặc xóa khi hệ thống ổn định. Góp ý gửi trực tiếp cho trưởng nhóm IT (CuongPV).
:::

Hệ thống không tự viết phần thu thập dữ liệu mà dùng **actor** — các công cụ quét có sẵn trên nền tảng Apify, trả tiền theo lượng dùng. Mỗi actor có ưu nhược riêng, có thể ngừng hoạt động hoặc đổi giá, nên phải đánh giá và luôn có phương án dự phòng.

## Tiêu chí đánh giá

1. Đầu vào là hashtag/từ khóa (dự án chỉ quét theo hashtag, không theo trang/người).
2. Mỗi bài có đủ: link, ngày đăng, nội dung, mã tác giả, like, bình luận, chia sẻ (TikTok thêm lượt xem).
3. Giới hạn được số bài mỗi lần chạy (khóa trần chi phí).
4. Giới hạn được theo thời gian đăng (nếu không có thì lọc sau).
5. Ra được bài **tiếng Việt**.
6. Có actor **đo lại theo link bài** cho luồng Đo tương tác.

## Lựa chọn hiện tại (31/10/2026)

| Vai trò | TikTok | Facebook |
|---|---|---|
| Phát hiện (quét hashtag) | clockworks/tiktok-hashtag-scraper | scraper_one/facebook-posts-search |
| Đo lại theo link | clockworks/tiktok-scraper (chờ chạy thử) | clappi/facebook-posts-reels-scraper (đã chạy mẫu, chờ chạy với link của dự án) |
| Dự phòng | api-ninja/tiktok-hashtag-scraper; insiteco/social-insight-scraper (đo lại) | scrapeforge/facebook-search-posts |

Đã loại: actor chỉ thống kê độ phổ biến hashtag (không thu bài), actor Instagram (ngoài phạm vi), actor đang bảo trì, actor không ra kết quả, actor quét theo trang (trái nguyên tắc chỉ quét theo hashtag).

## Điểm dừng — khi nào đổi hướng

| Kiểm tra | Nếu không đạt |
|---|---|
| Quét hashtag tiếng Việt ra ít nhất 30% bài tiếng Việt | Bộ từ khóa chưa đúng → làm lại danh mục từ lóng cùng cộng tác viên trước khi bàn kỹ thuật |
| Actor đo lại nhận đủ các dạng link và báo được bài đã xóa | Chuẩn hóa link trước khi gửi; nếu không báo được bài xóa thì ghi là hạn chế |
| Số liệu của actor đo lại khớp actor quét (lệch dưới 10%) | Không nối chuỗi giữa hai actor |
| Chi phí thật không quá 1,5 lần ước tính | Giãn lịch đo, giảm số bài mỗi lần quét |
| Không có actor ổn định cho một nền tảng | Tập trung nền tảng còn lại, ghi rõ trong báo cáo |

## Hiện trạng mẫu thử

Các mẫu chạy thử đến nay dùng từ khóa tiếng Anh, **chưa có bài tiếng Việt** → tiêu chí 5 chưa kiểm được. Việc tiếp theo là chạy thử với hashtag tiếng Việt thật.
