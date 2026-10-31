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
| Đo tương tác theo link | **Social Fetch** (chờ chạy thử 100 lượt miễn phí) | **Social Fetch** (chờ chạy thử) |
| Dự phòng tìm bài | api-ninja/tiktok-hashtag-scraper | scrapeforge/facebook-search-posts |
| Dự phòng đo | Bright Data; clockworks/tiktok-scraper; insiteco/social-insight-scraper | Bright Data; clappi/facebook-posts-reels-scraper |

Đã loại: actor chỉ thống kê độ phổ biến hashtag (không thu bài), actor Instagram (ngoài phạm vi), actor đang bảo trì, actor không ra kết quả, actor quét theo trang (trái nguyên tắc chỉ quét theo hashtag).

## Vì sao đo tương tác bằng Social Fetch, không bằng actor Apify?

- **Việc nào ra việc đó:** Apify giỏi tìm bài theo hashtag; đo lại theo link là việc khác, dùng dịch vụ chuyên cho việc đó.
- **Đơn giản:** đăng ký tự phục vụ, 100 lượt miễn phí không cần thẻ; gọi một lần nhận kết quả ngay (khoảng 3 giây), một bài một lượt.
- **Chi phí:** gói lượt mua một lần, không hết hạn (khoảng 1,6–2,4 USD/1.000 lượt tùy gói); lượt lỗi không tính tiền. Lượng đo dự kiến ~4.900 lượt/tháng → khoảng 12 USD/tháng.
- **Đo được cả xu hướng từ khóa TikTok:** tìm video theo từ khóa có lọc khu vực Việt Nam và ngày đăng — dùng làm "nhiệt kế" hằng tuần (xem dưới).

**Rủi ro:** Social Fetch là công ty nhỏ, mới (2024) — có thể đổi giá hoặc ngừng. Cách giảm: mua gói nhỏ dần; phần đo viết tách riêng nhà cung cấp; khi cần thì chuyển sang Bright Data (đã đánh giá: ~1,5 USD/1.000 bản ghi, có gói miễn phí hằng tháng, nhưng thủ tục đăng ký phức tạp hơn) hoặc actor Apify dự phòng. Dự án cần xu hướng, không cần chính xác tuyệt đối; ngày đổi nhà cung cấp được đánh dấu trên biểu đồ.

Đã xem và không chọn: Data365 (thuê bao, quá ngân sách), Oxylabs (không có sẵn bộ đọc cho TikTok/Facebook).

## "Nhiệt kế" xu hướng từ khóa (TikTok, đang thử)

Mỗi tuần, với mỗi từ khóa trong danh mục, hỏi TikTok "có bao nhiêu video mới trong tuần, ở Việt Nam" (lấy vài trang kết quả, cộng lượt xem). Đây là chỉ số **độc lập với mẫu bài đã thu**, rất rẻ (khoảng vài trăm lượt/tháng, dưới 2 USD), bổ sung cho câu hỏi 1.
Hạn chế: kết quả tìm kiếm có giới hạn và do TikTok sắp xếp, nên là **chỉ số tương đối** (tăng/giảm), không phải tổng số thật. Facebook không có tìm kiếm bài theo từ khóa nên không có nhiệt kế này.

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
