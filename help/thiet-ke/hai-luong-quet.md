# Hai luồng quét: Phát hiện và Đo tương tác

::: tip Mục tạm thời — kênh trao đổi thiết kế
Mục **Thiết kế đang phát triển** giải thích ý tưởng, cách làm và **hạn chế** của hệ thống trong giai đoạn xây dựng, để nhóm cùng xem và góp ý. Mục này sẽ được rút gọn hoặc xóa khi hệ thống ổn định. Góp ý gửi trực tiếp cho trưởng nhóm IT (CuongPV).
:::

## Vấn đề

Cách làm ban đầu: cứ quét lại hashtag rồi cập nhật số like, bình luận của bài. Cách này có ba vấn đề:

1. **Tốn tiền** — lần nào cũng tải lại cả bài cũ chỉ để lấy số like mới.
2. **Mất dấu bài** — bài rớt khỏi kết quả tìm kiếm của hashtag là không theo dõi được nữa, dù bài vẫn còn và vẫn tăng tương tác.
3. **Số liệu không đều** — bài được đo nhiều hay ít là do may rủi, không vẽ được đường cong chuẩn.

## Cách làm mới: việc nào ra việc đó

**Tìm bài (Apify) → Sàng lọc (quy tắc + AI + nghiên cứu viên) → Đo tương tác định kỳ (Social Fetch) → Dashboard, dữ liệu phẳng**

Mỗi khâu một công cụ, một trách nhiệm, một nhật ký và một khoản chi phí riêng. Khâu nào hỏng hoặc cần đổi nhà cung cấp thì thay khâu đó, các khâu khác giữ nguyên.

| | Luồng Phát hiện | Luồng Đo tương tác |
|---|---|---|
| Mục đích | Tìm **bài mới** | Theo dõi **bài đã có** |
| Đầu vào | Hashtag/từ khóa đã duyệt | Danh sách link bài trong hệ thống |
| Công cụ | Apify (actor tìm theo hashtag) | **Social Fetch** (đo theo link bài); Bright Data / actor Apify làm dự phòng |
| Lịch | Hằng ngày, nỗ lực quét giữ ổn định | Mỗi ngày chọn các bài đến mốc đo |
| Kết quả | Bài mới + lần đo đầu tiên (ngày 0) | Thêm một dòng số liệu cho mỗi lần đo |

- Số liệu Apify trả về lúc tìm bài được ghi thành **lần đo đầu tiên** (kể cả khi trống số — vẫn xác nhận bài còn tồn tại lúc phát hiện). Mỗi lần đo đều biết nguồn (Apify hay Social Fetch), nhóm phân tích tự quyết định có nối hai nguồn hay không.
- Bài đã có mà được quét hashtag gặp lại: không thêm bài, chỉ ghi nhận "gặp lại" (tín hiệu bài còn được đẩy) và lấy luôn số liệu.
- Tắt một hashtag thì các bài đã thu từ hashtag đó **vẫn được đo đủ lịch**.
- Danh sách bài cần đo do hệ thống tự sinh từ kho dữ liệu, không dùng lịch cố định của Apify.

## Sàng lọc trước khi đo

- AI sàng lọc trong vòng 24 giờ sau khi tìm thấy bài.
- Bài **liên quan** hoặc **chưa rõ** → vẫn đo bình thường trong lúc chờ người xem (không mất phần đầu đường cong).
- Bài **không liên quan** → không đo. Người xác minh kết luận ngược lại thì điều chỉnh: ngừng đo (giữ số liệu cũ, loại khỏi phân tích) hoặc đưa vào lịch đo từ lúc đó.

## Số liệu mỗi lần đo

Like (Facebook: tổng mọi loại cảm xúc), bình luận, chia sẻ, lượt xem (chỉ video/reel), lượt lưu (TikTok). Mỗi lần đo là một dòng mới, không ghi đè.

## Lịch đo của một bài (bậc thang)

| Giai đoạn | Đo khi nào |
|---|---|
| 30 ngày đầu kể từ lúc **phát hiện** | Ngày 0 (lần quét), 3, 7, 14, 30 |
| Bài phát hiện khi đã hơn 60 ngày tuổi | Chỉ ngày 0 và 30 |
| Sau 30 ngày, bài **còn tăng** | Kiểm kê hằng tháng |
| Sau 30 ngày, bài **đã nguội** (tăng dưới 5% giữa hai lần đo) | Kiểm kê toàn bộ trước 4 đợt phân tích (tháng 6, 10, 14, 18) và một lần ngay sau mỗi mốc chính sách mới |
| Bài **biến mất** (2 lần đo liền cách nhau ít nhất 24 giờ không thấy) | Ghi ngày biến mất, ngừng đo |

**Vì sao tính từ lúc phát hiện, không phải lúc đăng?** Quét hashtag trả về cả bài đăng từ nhiều tháng, nhiều năm trước, nên không thể đo "1 giờ sau khi đăng". Mỗi lần đo vẫn ghi thời điểm, khi phân tích dùng **tuổi thật của bài** (thời điểm đo trừ ngày đăng).

**Vì sao không đo mọi bài mỗi đêm?** Bài tích lũy dần, sau 18 tháng khoảng 14.000 bài. Đo hết mỗi đêm tốn hàng trăm USD mỗi tháng. Lịch bậc thang tốn khoảng **20–35 USD/tháng**, có trần chi phí; vượt trần thì ưu tiên mốc 30 ngày đầu.

**Vì sao vẫn đo sau 30 ngày?** Dự án kéo dài 18 tháng và cần biết bài **còn tồn tại hay đã biến mất** quanh các mốc chính sách.

## Góp ý đang cần

- Các mốc 3/7/14/30 ngày có phù hợp với cách thị trường vận hành không?
- Ngưỡng "nguội" 5% có hợp lý không?
