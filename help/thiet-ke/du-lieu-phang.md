# Dữ liệu phẳng cho phân tích

::: tip Mục tạm thời — kênh trao đổi thiết kế
Mục **Thiết kế đang phát triển** giải thích ý tưởng, cách làm và **hạn chế** của hệ thống trong giai đoạn xây dựng, để nhóm cùng xem và góp ý. Mục này sẽ được rút gọn hoặc xóa khi hệ thống ổn định. Góp ý gửi trực tiếp cho trưởng nhóm IT (CuongPV).
:::

## Phân vai giữa các hệ thống

| Hệ thống này | Hệ thống phân tích (bên ngoài) |
|---|---|
| Thu thập, khử trùng, sàng lọc, lưu chuỗi số liệu, truy vết nguồn gốc | Phân tích thống kê sâu (R, Stata, SPSS, REDCap…) |
| Dashboard: cái nhìn tổng quan cho 6 câu hỏi | Mô hình, kiểm định, viết báo cáo khoa học |
| **Xuất dữ liệu phẳng, sạch, có từ điển dữ liệu** | Nhận dữ liệu phẳng làm đầu vào |

Dashboard đủ để theo dõi và ra quyết định hằng ngày; phân tích chuyên sâu là việc của hệ thống phân tích.

## Công cụ xuất (đang phác thảo)

Xuất ra các bảng phẳng (mỗi bảng một file CSV/Excel), kèm **từ điển dữ liệu** và **thông tin phiên bản** (ngày xuất, phiên bản bảng mã nhãn, công cụ quét đã dùng):

| Bảng | Mỗi dòng là | Dùng cho |
|---|---|---|
| Bài viết | Một bài: nền tảng, nhóm hashtag, ngày đăng, ngày phát hiện, giai đoạn so với mốc chính sách, nhãn liên quan (đã xác minh hay chưa), ngày biến mất, số liệu lần đo gần nhất | Mô tả, phân tích sống còn |
| Lần đo | Một lần đo của một bài: thời điểm, tuổi bài, like, bình luận, chia sẻ, lượt xem | Đường cong tương tác, tốc độ tăng |
| Chuỗi tuần | Một tuần × một nhóm hashtag × một nền tảng: số bài mới (đã sàng lọc), nỗ lực quét, tỷ lệ bài mới | Chuỗi thời gian ngắt quãng |
| Hashtag của bài | Một cặp bài – hashtag | Mạng lưới hashtag |
| Nhãn | Một nhãn AI hoặc người cho một bài | Độ tin cậy AI so với người |

## Nguyên tắc

- **Không xuất** tên tài khoản, link bài (trừ khi được cấp quyền riêng), ảnh, bình luận. Tác giả chỉ có mã băm.
- Mặc định chỉ xuất bài **liên quan**; có tùy chọn xuất cả bài bị loại để kiểm tra sàng lọc.
- Mỗi lần xuất được ghi nhật ký (ai, khi nào, bảng nào).
