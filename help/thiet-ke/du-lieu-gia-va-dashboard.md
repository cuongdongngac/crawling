# Dữ liệu giả và dashboard

::: tip Mục tạm thời — kênh trao đổi thiết kế
Mục **Thiết kế đang phát triển** giải thích ý tưởng, cách làm và **hạn chế** của hệ thống trong giai đoạn xây dựng, để nhóm cùng xem và góp ý. Mục này sẽ được rút gọn hoặc xóa khi hệ thống ổn định. Góp ý gửi trực tiếp cho trưởng nhóm IT (CuongPV).
:::

::: danger Dữ liệu giả — chỉ để thử giao diện
Mọi con số trên dashboard trong giai đoạn này là **dữ liệu mô phỏng**, không phải số liệu thật. **Không trích dẫn, không đưa vào báo cáo.**
:::

## Vì sao dùng dữ liệu giả

Dashboard cần dữ liệu 18 tháng mới thử được, mà dự án chưa chạy. Dữ liệu giả cho phép dựng và góp ý giao diện ngay, để khi có dữ liệu thật thì dashboard chạy luôn.

## Dữ liệu giả được sinh như thế nào

Không phải số ngẫu nhiên, mà mô phỏng đúng thiết kế đo lường, để thử được cả 6 biểu đồ:

- 18 tháng, khoảng 800 bài mới mỗi tháng (60% TikTok, 40% Facebook), 4 nhóm hashtag cố định.
- Có một **mốc chính sách giả định**: sau mốc, nhóm tiếp thị trực tiếp giảm rồi hồi dần, nhóm từ lóng lách luật tăng mạnh, nhóm cai thuốc – cảnh báo tăng vọt rồi giảm; một số hashtag lách luật mới xuất hiện dần.
- Lịch đo đúng bậc thang (ngày 0/3/7/14/30, kiểm kê định kỳ); khoảng 1/4 số bài biến mất, nhiều hơn ngay sau mốc.
- Người bán đăng lặp lại nhiều, có cụm bài trùng nội dung, một ít bài có đợt tăng tương tác muộn (để thử phát hiện bài tăng bất thường).

Các xu hướng trên là **giả định để thử biểu đồ**, không phải dự đoán kết quả nghiên cứu.

## Nhận biết và xóa

Dữ liệu giả có nhãn riêng (tài khoản trong link bắt đầu bằng `mock_`) và được xóa sạch bằng một lệnh trước khi chạy thật.

## Trang Tổng quan đã có gì (31/10/2026)

![Trang Tổng quan với dữ liệu giả](/images/thiet-ke/du-lieu-gia-va-dashboard-01-tong-quan.png)
<p class="img-caption">Hình 1: Trang Tổng quan — băng cảnh báo dữ liệu giả, bốn số chính, bài liên quan mới mỗi tuần theo nhóm (dữ liệu giả)</p>

- **Bộ lọc nền tảng** (Tất cả / TikTok / Facebook) — áp cho mọi phần bên dưới.
- **Bốn số chính:** bài đã phát hiện, bài liên quan (và tỷ lệ trên số bài đã sàng lọc), không liên quan, chờ sàng lọc / chưa rõ.
- **Câu hỏi 1 — Bài liên quan mới mỗi tuần theo 4 nhóm hashtag**, có vạch mốc chính sách; chuyển được sang "tất cả bài" (trước sàng lọc) để thấy sàng lọc loại bớt bao nhiêu; rê chuột để xem số từng tuần; nút **Bảng** để xem số liệu dạng bảng. Tuần cuối chưa đủ 7 ngày được vẽ nét đứt để không bị đọc thành "giảm".
- **Vận hành theo khâu:** số lần chạy, khối lượng, lỗi, chi phí của Phát hiện bài / Đo biến động / Nhiệt kế.
- **Câu hỏi 3 — Bài tăng tương tác mạnh nhất** trong khoảng 7 ngày gần nhất (chỉ bài liên quan hoặc chưa rõ, còn tồn tại). **Chỉ quản trị viên** thấy danh sách này vì có đường dẫn bài. Đây là danh sách *đề xuất xem xét*, không phải danh sách chuyển tuyến.
- Mỗi phần ghi rõ câu hỏi nó trả lời và **hạn chế**.

Chưa có (làm tiếp): vòng đời hashtag (câu hỏi 2), đường tỷ lệ bài còn tồn tại (câu hỏi 4), AI so với người (câu hỏi 5), hai tỉnh (câu hỏi 6), nhiệt kế từ khóa đặt cạnh.

## Góp ý cho dashboard

Khi xem dashboard, hãy góp ý: biểu đồ có trả lời đúng câu hỏi không, đọc có dễ không, thiếu thông tin gì để ra quyết định.
