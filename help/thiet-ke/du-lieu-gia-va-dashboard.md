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

## Góp ý cho dashboard

Khi xem dashboard, hãy góp ý: biểu đồ có trả lời đúng câu hỏi không, đọc có dễ không, thiếu thông tin gì để ra quyết định.
