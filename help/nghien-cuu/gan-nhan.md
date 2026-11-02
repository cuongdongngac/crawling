# Gắn nhãn bài (AI hỗ trợ)

Trang **Gắn nhãn (AI)** (chỉ **nghiên cứu viên**) có ba thẻ: **Xác minh**, **Chạy AI**, **Độ tin cậy AI**.

Căn cứ để chấm: [Hướng dẫn gắn nhãn bài (bảng mã v1)](./huong-dan-gan-nhan).

Nguyên tắc: **AI gợi ý, người quyết định.** AI chỉ đọc phần chữ của bài, đã che số điện thoại, link, email, tên tài khoản; không xem ảnh. Nhãn AI và nhãn người được lưu riêng, không ghi đè nhau. Kết luận của người luôn thắng kết luận của AI.

## 1. Chạy AI

- **Model**: lấy mặc định ở trang Cấu hình; có thể gõ model khác để thử.
- **Bài phát hiện từ ngày**: chỉ gắn nhãn bài mới từ ngày đó (để thử nhanh, tiết kiệm).
- **Số bài lần này** → **Gắn nhãn**. Hệ thống chạy từng lô 20 bài, hiện tiến độ, chi phí; bấm **Dừng sau lô này** để dừng.
- Mỗi bài chỉ gắn **một lần cho mỗi bộ (bảng mã + câu lệnh + model)**: chạy lại không tốn tiền cho bài đã có nhãn. Đổi model thì bài được gắn lại bằng model mới (để so sánh), nhãn cũ vẫn giữ.
- Hết **trần chi phí AI tháng** (trang Cấu hình) thì tự dừng.
- Sau khi AI gắn nhãn, kết luận sàng lọc của bài được cập nhật: *liên quan*, *không liên quan*, hoặc *chưa rõ* khi AI không đủ chắc (dưới 60% với kết luận "không liên quan", dưới 50% với kết luận "liên quan").

**Bộ 50 bài mô phỏng có đáp án**: chạy mỗi khi đổi model hoặc câu lệnh để so sánh công bằng trên cùng một đề.

## 2. Xác minh

Ba hàng đợi:

| Hàng | Gồm những bài nào | Gợi ý AI |
|---|---|---|
| **AI chưa rõ** (ưu tiên) | AI không đủ chắc | Hiện — người chốt |
| **Mẫu chấm mù (~10%)** | Một phần mười bài AI đã kết luận, **trộn lẫn bài AI giữ và bài AI loại**, chọn cố định theo mã bài | **Ẩn tới khi lưu**, kể cả kết luận hiện tại |
| **Tự chọn** | Mọi bài AI đã gắn, lọc theo mục đích | Hiện |

- Chọn **Mục đích nội dung** (bắt buộc). **Chi tiết theo bảng mã** không bắt buộc; để "—" là *chưa chấm* (khác với "Không").
- Gợi ý AI được điền sẵn; chỗ bạn sửa khác AI được đánh dấu "đã sửa so với AI".
- Không chắc thì tick **Tôi chưa chắc**: bài giữ trạng thái *chưa rõ* và không dùng làm chuẩn đo AI.
- Bài thật có nút **Mở bài gốc** để xem cả ảnh/video (tiêu chí hình chỉ người chấm).
- Phím tắt: **1–5** chọn mục đích, **Ctrl+Enter** lưu, **N** bỏ qua, **Enter** sang bài tiếp sau khi xem đối chiếu.

**Vì sao chấm mù?** Người nhìn gợi ý AI dễ "gật theo", làm độ chính xác của AI trông cao hơn thật. Hàng mẫu trộn bài AI giữ và AI loại để người chấm không đoán được AI đã kết luận gì. Sau khi lưu, màn hình hiện đối chiếu với AI.

## 3. Độ tin cậy AI

Mỗi thẻ là một cách so sánh, kèm model:

- **Người chấm mù**: thước đo chính.
- **Người xác minh khi thấy gợi ý AI**: thường cao hơn thật — chỉ tham khảo.
- **Đáp án dữ liệu giả (GOLD)**: chỉ có khi đang dùng dữ liệu giả.
- **Bộ bài mô phỏng**: so các model/câu lệnh với nhau.

Các chỉ số (coi "liên quan" là dương tính):

- **Độ chính xác**: tỷ lệ AI kết luận đúng liên quan / không liên quan, kèm **cận dưới** khoảng tin cậy 95%.
- **Độ nhạy**: AI giữ được bao nhiêu % bài thật sự liên quan. **Thấp nghĩa là AI loại nhầm bài thật** — các bài này sẽ không được đo lại và không vào phân tích, nên đây là chỉ số đáng lo nhất.
- **Độ đặc hiệu**: AI loại đúng bao nhiêu % bài không liên quan.
- **Kappa**: mức đồng thuận sau khi trừ phần trùng do may rủi (≥ 0,6 khá; ≥ 0,8 rất tốt).

So với ngưỡng trong hồ sơ (**dùng AI khi độ chính xác từ 85%**), thẻ hiện: *Đạt* (kể cả khi tính sai số mẫu), *Đạt nhưng mẫu còn nhỏ*, *Chưa đạt*, hoặc *Chưa đủ mẫu* (dưới 50 bài).

Bảng **Ca AI và người chấm khác nhau** dùng để sửa câu lệnh hoặc bổ sung từ lóng mới.

## Dữ liệu giả (giai đoạn dựng hệ thống)

Bài giả có nhãn **BÀI GIẢ**; số đo trên bài giả chỉ để thử hệ thống, không đưa vào báo cáo. Quản trị kỹ thuật chuẩn bị dữ liệu bằng script trong thư mục `scripts/mock` (xem README ở đó).
