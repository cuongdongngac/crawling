---
title: "Đo tương tác (Social Fetch)"
---

**Apify tìm ra link bài; bài không liên quan bị loại; Social Fetch đo lại like, bình luận, chia sẻ, lượt xem, lượt lưu của từng bài theo lịch, để vẽ bức tranh tương tác theo thời gian.** Trang **Đo tương tác** (chỉ quản trị viên) cho xem bài nào đến hạn đo, bấm đo ngay và xem các lần đo đã chạy.

## Lịch đo của mỗi bài

| Khi nào | Đo gì |
|---|---|
| Ngày 0 (lúc Apify tìm thấy bài) | Số liệu Apify trả về — không tốn lượt Social Fetch |
| 3, 7, 14, 30 ngày sau khi phát hiện | Một lần đo mỗi mốc |
| Bài phát hiện khi đã hơn 60 ngày tuổi | Chỉ đo mốc 30 ngày |
| Sau 30 ngày, bài **còn nóng** (tương tác tăng từ 5% giữa hai lần đo gần nhất) | Đo lại khoảng 30 ngày một lần |
| Lần đo trước **không thấy bài** | Đo lại sau ít nhất 24 giờ. Vẫn không thấy → ghi ngày biến mất, ngừng đo |
| **Kiểm kê toàn bộ** (bấm tay, trước mỗi đợt phân tích hoặc sau một mốc chính sách) | Mọi bài liên quan còn tồn tại chưa đo trong 7 ngày |

**Không bao giờ gửi đi đo:** bài đã kết luận *không liên quan*, bài đã biến mất, và bài giả (dữ liệu thử giao diện).

## Mỗi lần đo lưu gì

Chỉ một dòng số liệu: thời điểm đo, like, bình luận, chia sẻ, lượt xem, lượt lưu (TikTok). Không lưu tên, ảnh tài khoản, link tải video hay bất cứ thứ gì khác Social Fetch trả về.

## Chạy tự động

- **Mặc định: Vercel Cron**, mỗi ngày lúc 3 giờ sáng (giờ Việt Nam). Vercel chỉ điều phối; việc lấy dữ liệu do Social Fetch làm. Mỗi lần chạy: AI sàng lọc bài mới trước (nếu bật ở trang Cấu hình), rồi đo các bài đến hạn.
- **Chạy ở máy khác cũng được** (NAS, máy chủ): đặt lịch gọi địa chỉ `/api/cron/daily` kèm mã bí mật, hoặc chạy lệnh trong thư mục web: `npx tsx scripts/measure-run.mts` (thêm `--dry` để chỉ xem số bài đến hạn).
- **Nút "Đo ngay"** trên trang để đo tay, ví dụ khi muốn kiểm kê toàn bộ.

## Chi phí

- Mỗi lần đo một bài tốn 1 lượt Social Fetch, kể cả khi không thấy bài. Lỗi phía Social Fetch không tính lượt.
- Ở trang **Cấu hình**: khai báo khóa Social Fetch, **trần chi phí đo mỗi tháng** (mặc định 40 USD) và **giá mỗi lượt** theo gói đang dùng (Starter 0,014; Growth 0,00236 USD/lượt). Chạm trần thì ngừng đo đến tháng sau.
- Hết lượt trên tài khoản Social Fetch: lần đo dừng ngay và báo lỗi.

## Cài đặt lần đầu (quản trị kỹ thuật)

1. Chạy `docs/migrations/2026-11-04_do-tuong-tac.sql` trên Supabase.
2. Trang **Cấu hình** → dán khóa Social Fetch → **Kiểm tra** (xem số dư, không tốn lượt) → Lưu.
3. Trên Vercel: thêm biến môi trường `CRON_SECRET` (chuỗi ngẫu nhiên dài). Tệp `vercel.json` đã khai báo lịch chạy.
