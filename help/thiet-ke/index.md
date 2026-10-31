# Thiết kế đang phát triển — đọc trước

::: tip Mục tạm thời — kênh trao đổi thiết kế
Mục **Thiết kế đang phát triển** giải thích ý tưởng, cách làm và **hạn chế** của hệ thống trong giai đoạn xây dựng, để nhóm cùng xem và góp ý. Mục này sẽ được rút gọn hoặc xóa khi hệ thống ổn định. Góp ý gửi trực tiếp cho trưởng nhóm IT (CuongPV).
:::

Hệ thống đang được xây dựng trong lúc dự án chờ phê duyệt. Thay vì họp nhiều, mọi quyết định thiết kế được ghi lại ở đây: **vì sao làm thế, làm thế nào, chưa làm được gì**. Bạn đọc phần liên quan đến mình, thấy chỗ nào chưa hợp lý thì góp ý — góp ý sớm rẻ hơn sửa muộn.

## Đọc theo vai trò

| Bạn là | Nên đọc |
|---|---|
| Cộng tác viên | [Sàng lọc bằng AI và người](./sang-loc-ai) (phần vai trò), [Hạn chế của hệ thống](./han-che) |
| Nghiên cứu viên / quản trị | Tất cả, nhất là [Hai luồng quét](./hai-luong-quet) và [Sàng lọc](./sang-loc-ai) |
| Nhóm phân tích số liệu | [Câu hỏi nghiên cứu và biểu đồ](./cau-hoi-nghien-cuu), [Dữ liệu phẳng cho phân tích](./du-lieu-phang), [Hạn chế](./han-che) |

## Trạng thái các phần (cập nhật 31/10/2026)

| Phần | Trạng thái |
|---|---|
| Quét thử cho cộng tác viên, phiếu đề xuất, duyệt phiếu, nhật ký hoạt động | ✅ Đã làm, đang dùng thử |
| Đánh giá và chọn công cụ quét (actor Apify) | 🟡 Đã chọn sơ bộ, chờ chạy thử với từ khóa tiếng Việt — [xem](./chon-cong-cu-quet) |
| Hai luồng quét: Phát hiện + Đo tương tác theo link bài | 🟡 Đã thiết kế, chưa viết phần chạy ngầm — [xem](./hai-luong-quet) |
| Sàng lọc bài không liên quan (quy tắc + AI + người) | 🟡 Đã thiết kế; khung AI đã dựng, chưa có màn hình xác minh — [xem](./sang-loc-ai) |
| Dữ liệu giả 18 tháng để dựng dashboard | ✅ Đã có — [xem](./du-lieu-gia-va-dashboard) |
| Dashboard 6 câu hỏi nghiên cứu | ⏳ Đang dựng |
| Công cụ xuất dữ liệu phẳng cho phân tích | ⏳ Đã phác thảo — [xem](./du-lieu-phang) |

## Nguyên tắc chung của thiết kế

- **Cung cấp bằng chứng, không thực thi.** Hệ thống mô tả, không kết luận nhân quả, không xử lý vi phạm.
- **Mỗi biểu đồ trả lời một câu hỏi nghiên cứu** và luôn đi kèm hạn chế.
- **Thà ít chỉ số mà chuỗi số liệu liền mạch 18 tháng, còn hơn nhiều chỉ số mà gãy giữa chừng.**
- **AI gợi ý, người quyết định.**
