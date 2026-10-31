# Câu hỏi nghiên cứu và biểu đồ

::: tip Mục tạm thời — kênh trao đổi thiết kế
Mục **Thiết kế đang phát triển** giải thích ý tưởng, cách làm và **hạn chế** của hệ thống trong giai đoạn xây dựng, để nhóm cùng xem và góp ý. Mục này sẽ được rút gọn hoặc xóa khi hệ thống ổn định. Góp ý gửi trực tiếp cho trưởng nhóm IT (CuongPV).
:::

Mỗi biểu đồ trên dashboard trả lời **một câu hỏi**, dùng số liệu đo thật, và đi kèm hạn chế. Hệ thống **mô tả**, không khẳng định nhân quả.

| # | Câu hỏi | Đo bằng | Biểu đồ |
|---|---|---|---|
| 1 | Thị trường thích ứng thế nào trước và sau từng mốc chính sách? | Số bài mới (đã sàng lọc) mỗi **tuần** theo 4 nhóm hashtag cố định | Đường theo tuần, vạch dọc ở các mốc chính sách |
| 2 | Hình thức thay đổi ra sao (đổi tên, từ lóng)? | Hashtag được đề xuất → duyệt → số bài theo thời gian | Vòng đời hashtag: hashtag cũ giảm, hashtag thay thế xuất hiện |
| 3 | Bài nào đang tương tác mạnh nhất? | Đường cong tương tác theo tuổi bài | Top bài tăng nhanh + danh sách chuyển tuyến (đã xác minh) |
| 4 | Bài tồn tại bao lâu, có biến mất sau mốc chính sách không? | Ngày phát hiện → ngày biến mất | Đường tỷ lệ bài còn tồn tại |
| 5 | AI tiếng Việt đáng tin đến đâu? | Nhãn AI so với nhãn người | Độ chính xác, kappa theo tháng |
| 6 | Hai tỉnh khác nhau thế nào? | Nguồn đề xuất hashtag theo tỉnh | Số phiếu được duyệt, hashtag mới theo tỉnh |

## Vì sao 4 nhóm hashtag cố định?

Danh sách hashtag thay đổi liên tục (từ lóng mới, hashtag bị bỏ). Nếu so từng hashtag thì các đợt đo không so sánh được. Đơn vị phân tích là **nhóm** (tiếp thị trực tiếp, lối sống, từ lóng lách luật, cai thuốc và cảnh báo) — hashtag mới được xếp vào nhóm, nhóm thì giữ nguyên 18 tháng.

## Giữ nỗ lực quét ổn định

Số bài mới tăng hay giảm có thể chỉ vì **cách quét thay đổi** (thêm hashtag, đổi công cụ). Vì vậy hệ thống ghi lại nỗ lực quét mỗi lần và dùng thêm chỉ số **tỷ lệ bài mới** (bài mới / bài tải về). Ngày đổi công cụ quét được đánh dấu trên biểu đồ.

## Phân tích mở rộng cho báo cáo

Từ cùng dữ liệu, nhóm phân tích có thể làm thêm (không cần thu thêm):

| Phân tích | Mức tin cậy |
|---|---|
| Chuỗi thời gian ngắt quãng (thay đổi mức và độ dốc quanh mốc chính sách) | Tốt |
| Phân tích sống còn của bài (bao lâu thì biến mất; trước/sau mốc; người bán vs người dùng) | Tốt — "biến mất" không phân biệt tự xóa hay bị gỡ |
| Mạng lưới hashtag đi cùng nhau | Tốt — phải lọc hashtag chung chung trước |
| Độ tập trung người bán (bao nhiêu % tài khoản tạo phần lớn bài), cụm bài trùng nội dung | Tốt — chỉ trên mã băm, không định danh |
| Độ tin cậy AI so với người | Tốt |
| Đường cong tương tác, tỷ lệ bài lách luật trước/sau mốc | Trung bình — chỉ mô tả |
| So TikTok với Facebook | So xu hướng, không so số tuyệt đối |
| So hai tỉnh | Yếu — dữ liệu không có địa lý |
