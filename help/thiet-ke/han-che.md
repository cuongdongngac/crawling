# Hạn chế của hệ thống

::: tip Mục tạm thời — kênh trao đổi thiết kế
Mục **Thiết kế đang phát triển** giải thích ý tưởng, cách làm và **hạn chế** của hệ thống trong giai đoạn xây dựng, để nhóm cùng xem và góp ý. Mục này sẽ được rút gọn hoặc xóa khi hệ thống ổn định. Góp ý gửi trực tiếp cho trưởng nhóm IT (CuongPV).
:::

Nói rõ hạn chế là một phần của tính trung thực khoa học. Khi đọc số liệu hoặc viết báo cáo, luôn kèm các lưu ý dưới đây.

## Về phạm vi dữ liệu

- **Chỉ thấy phần công khai qua hashtag.** Số liệu mô tả "thị trường hiện diện qua hashtag công khai", **không phải toàn bộ thị trường**. Mẫu không ngẫu nhiên.
- **Giao dịch thật thường chuyển vào nhóm kín, tin nhắn riêng** — phần này dự án không theo dõi.
- **Không đọc ảnh, video.** Chỉ đọc chữ (nội dung, hashtag). Bài chỉ có hình sẽ khó sàng lọc.
- **Không có địa lý.** Không biết bài đăng từ tỉnh nào; so sánh hai tỉnh chỉ dựa vào nguồn đề xuất hashtag.
- **Không lưu bình luận chi tiết, ảnh, tên tài khoản** (bảo vệ dữ liệu cá nhân) — tác giả chỉ có mã băm.
- **Bài cũ:** quét hashtag trả cả bài cũ; không đo được tương tác ở những giờ đầu sau khi đăng.

## Về đo lường

- **Phụ thuộc thuật toán nền tảng:** kết quả tìm theo hashtag do TikTok/Facebook quyết định và có thể đổi bất cứ lúc nào.
- **Hai nguồn số liệu:** lần đo đầu lấy từ công cụ tìm bài (Apify), các lần sau từ công cụ đo (Social Fetch) — hai bên có thể đếm hơi khác nhau. Mỗi lần đo đều ghi nguồn; phép thử so sánh quyết định có nối hai nguồn không.
- **Phụ thuộc công cụ quét bên ngoài:** actor có thể hỏng, đổi định dạng, đổi giá → có thể gãy chuỗi số liệu. Có dự phòng và đánh dấu ngày đổi công cụ.
- **"Biến mất" không phải "bị gỡ":** bài không còn có thể do người đăng tự xóa, đặt riêng tư hoặc bị nền tảng gỡ — hệ thống không phân biệt được.
- **Like, bình luận, chia sẻ là số tại thời điểm đo**, không phải số cuối cùng; lượt xem chỉ có ở video.
- **TikTok và Facebook đếm khác nhau** → chỉ so xu hướng, không so số tuyệt đối.
- **AI có thể nhầm** → luôn có người xác minh và đo độ chính xác định kỳ; danh sách chuyển tuyến 100% do người xem.

## Về suy luận

- Hệ thống **mô tả xu hướng**, không chứng minh nguyên nhân. Thị trường thay đổi quanh một mốc chính sách có thể do nhiều yếu tố khác.
- Các mốc chính sách gần nhau khó tách tác động riêng.

## Về giai đoạn hiện tại

- Hệ thống đang phát triển; một số phần mới là thiết kế (xem [trạng thái](./index)).
- Dashboard đang dùng **dữ liệu giả** để thử giao diện — [đọc kỹ](./du-lieu-gia-va-dashboard).
