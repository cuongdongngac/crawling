# Sàng lọc bài không liên quan: AI và người

::: tip Mục tạm thời — kênh trao đổi thiết kế
Mục **Thiết kế đang phát triển** giải thích ý tưởng, cách làm và **hạn chế** của hệ thống trong giai đoạn xây dựng, để nhóm cùng xem và góp ý. Mục này sẽ được rút gọn hoặc xóa khi hệ thống ổn định. Góp ý gửi trực tiếp cho trưởng nhóm IT (CuongPV).
:::

## Vấn đề

Quét theo hashtag ra rất nhiều bài có đúng hashtag nhưng **chẳng liên quan gì đến thuốc lá điện tử** (ví dụ cùng một từ nhưng là podcast, tin nước ngoài, quảng cáo hàng khác). Nếu không lọc, mọi con số phía sau đều sai.

## Ba tầng sàng lọc

1. **Quy tắc (miễn phí, tự động):** loại bài không phải tiếng Việt, bài chỉ có hashtag chung chung mà không có chữ liên quan.
2. **AI gắn nhãn** *liên quan / không liên quan / chưa rõ*, chạy ngay sau mỗi lần quét chính thức. Chỉ gửi phần chữ đã che số điện thoại, link, email, tên tài khoản; **không gửi ảnh**.
3. **Nghiên cứu viên xác minh** theo hàng đợi (dưới đây).

- **Không xóa** bài không liên quan, chỉ đánh dấu — để kiểm chứng và đo độ chính xác của AI. Khi phân tích chỉ tính bài liên quan.
- **Không đo lại** bài không liên quan → tiết kiệm chi phí. Vì vậy AI chạy trước mốc đo ngày 3.
- Bài gần như chỉ có hình, ít chữ: AI xếp "chưa rõ", người xem.

## Ai làm gì

| Vai trò | Việc |
|---|---|
| **Cộng tác viên** | Quét thử, **đề xuất hashtag mới** kèm bài minh chứng; làm bài kiểm tra 50 bài mô phỏng (đầu kỳ và định kỳ). **Không** phải xác minh bài của hệ thống. |
| **Hệ thống** | Quét chính thức, lọc bằng quy tắc, AI gắn nhãn, đo lại bài liên quan, tính tỷ lệ liên quan của từng hashtag |
| **Nghiên cứu viên (gồm quản trị)** | Duyệt hashtag, xác minh nhãn AI, chốt danh sách chuyển tuyến |

Vì sao cộng tác viên không xác minh bài: ít người xem dữ liệu thô hơn thì an toàn dữ liệu cá nhân hơn; ít người gắn nhãn, được tập huấn kỹ thì nhãn ổn định hơn; và cộng tác viên được ghi nhận theo **chất lượng đề xuất**, không theo số bài đã xem.

## Hàng đợi xác minh của nghiên cứu viên (thứ tự ưu tiên)

1. **Bài sắp vào danh sách chuyển tuyến — xem 100%.** Không bài nào được chuyển đi mà chưa qua người.
2. Bài AI xếp "chưa rõ".
3. Mẫu ngẫu nhiên ~10% bài AI **loại** — để biết AI bỏ sót bao nhiêu bài thật.
4. Mẫu ngẫu nhiên ~10% bài AI **giữ**.
5. ~50 bài/tháng do 2 nghiên cứu viên gắn nhãn độc lập để tính độ đồng thuận giữa người với người.

Ước tính với ~800 bài mới/tháng: ~250 lượt xem/tháng (~60 bài/tuần), chia cho 2–4 nghiên cứu viên. Khi AI đạt độ chính xác từ 85% ổn định trong 2 tháng thì giảm mẫu ngẫu nhiên xuống 5%.

## Tỷ lệ liên quan của hashtag

Mỗi hashtag có **tỷ lệ bài liên quan**. Dùng để:
- **Duyệt hashtag mới:** khi duyệt thử một đề xuất, hệ thống quét một mẫu nhỏ (~50 bài), AI gắn nhãn, phiếu đề xuất hiện tỷ lệ liên quan → căn cứ khách quan để duyệt hay từ chối.
- **Tắt hashtag "nhiễu"** có tỷ lệ liên quan thấp kéo dài.
- **Ghi nhận cộng tác viên:** hashtag do bạn đề xuất càng "sạch" (tỷ lệ liên quan cao, bền) thì đề xuất càng có giá trị.

## Giữ số liệu nhất quán khi đổi AI

Mỗi nhãn ghi rõ phiên bản bảng mã, câu lệnh (prompt) và mô hình. Khi đổi mô hình hoặc câu lệnh, **gắn nhãn lại toàn bộ dữ liệu cũ** bằng phiên bản mới, để đường "số bài liên quan" 18 tháng không nhảy vọt chỉ vì đổi AI.

## Đo độ tin cậy của AI

Hằng tháng so nhãn AI với nhãn người: độ chính xác, số bài AI loại nhầm, hệ số kappa. Bảng này được công khai trong báo cáo — AI làm phần nặng, người kiểm soát chất lượng, và độ tin cậy được đo chứ không phải tin suông.
