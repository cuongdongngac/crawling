---
title: "Hướng dẫn mã hóa: triết lý và cơ sở khoa học"
---

:::tip[Mục tạm thời — kênh trao đổi thiết kế]
Trang này giải thích **vì sao** hướng dẫn gắn nhãn được viết như vậy, và liệt kê các điểm còn chờ Ban nghiên cứu chốt. Phần quy trình dùng lâu dài nằm ở [Hướng dẫn gắn nhãn bài (bảng mã v1)](../nghien-cuu/huong-dan-gan-nhan). Góp ý gửi trưởng nhóm IT (CuongPV).
:::

Gắn nhãn là **đo lường**, không phải phán xét. Mỗi nhãn là một phép đo về nội dung của bài; vì vậy nó phải lặp lại được, kiểm chứng được và công bố được sai số của mình. Tài liệu này là "Phụ lục A – Bảng mã hóa biến số" mà hồ sơ dự án đã hứa, cộng thêm phần quy tắc ra quyết định.

## Triết lý: bảy nguyên tắc

1. **Cung cấp bằng chứng, không kết luận vi phạm.** Nhãn mô tả bài nói gì và nhằm làm gì. Nhãn không kết luận người đăng phạm luật, không đoán danh tính hay động cơ riêng. Xử lý vi phạm là việc của cơ quan có thẩm quyền.
2. **Chấm cái nhìn thấy được trước, suy luận sau và có luật.** Có giá, có số liên hệ, có từ "ship" là nội dung hiển hiện, ai đọc cũng thấy. "Mục đích" là nội dung ẩn, phải suy luận — nên chỉ được suy theo cây quyết định, không theo cảm nhận.
3. **Một thước đo cho cả người và máy.** AI là một "người chấm" nữa: nhận cùng định nghĩa, cùng quy tắc, và bị đo bằng cùng chỉ số như người. Không có quy tắc riêng cho máy.
4. **AI gợi ý, người quyết định.** Nhãn của người luôn thắng nhãn của AI. Không bài nào được chuyển cho cơ quan chức năng mà chưa qua người.
5. **Tin cậy đi trước hợp lệ.** Hai người chấm cùng một bài mà ra hai nhãn khác nhau thì con số tổng hợp đo "ai chấm" chứ không đo thị trường. Độ đồng thuận phải đạt ngưỡng trước khi số liệu được dùng.
6. **Thận trọng bất đối xứng.** Loại nhầm một bài thật tệ hơn giữ nhầm một bài không liên quan: bài bị loại không được đo lại và biến mất khỏi phân tích. Phân vân thì chọn "chưa rõ".
7. **Tối thiểu dữ liệu, minh bạch phiên bản.** AI chỉ đọc chữ đã che số điện thoại, link, email, tài khoản. Mọi nhãn ghi kèm phiên bản bảng mã, câu lệnh và model.

## Cơ sở khoa học

Phương pháp gốc là **phân tích nội dung có hệ thống**: biến văn bản thành dữ liệu đếm được bằng một bảng mã công khai, người chấm được tập huấn, và độ tin cậy được báo cáo.

| Trụ | Nội dung | Dùng ở đâu |
|---|---|---|
| Phân tích nội dung (Krippendorff; Neuendorf) | Đơn vị phân tích rõ, nhãn loại trừ nhau và bao trùm, quy tắc ghi mã viết sẵn, báo cáo độ đồng thuận | Đơn vị chấm, cây quyết định, kiểm soát chất lượng |
| Định nghĩa quảng cáo, khuyến mại thuốc lá của WHO FCTC Điều 13 | Mọi hình thức truyền thông thương mại có mục đích, tác dụng hoặc có khả năng tác dụng quảng bá sản phẩm, kể cả gián tiếp | Nhãn "Tiếp thị lối sống trá hình": không rao bán vẫn là quảng bá |
| Quy tắc "ba tiêu chí" của hồ sơ dự án | Nhìn hình – nhìn chữ – nhìn giao dịch; từ 2/3 là ca nghi ngờ | Ca nghi ngờ, điều kiện chuyển tuyến |
| Ngôn ngữ học biến tướng | Biến dạng chính tả, dịch chuyển ngữ nghĩa ẩn dụ, ký hiệu emoji; bốn dạng thay đổi hình thức | "Chiến thuật lách", "Từ lóng" |

**Đo độ tin cậy bằng hệ số kappa.** Hai người chấm trùng nhau 90% chưa chắc đã tốt: nếu 90% bài đều "liên quan" thì chấm bừa cũng trùng gần như thế. Kappa của Cohen trừ phần trùng do may rủi:

<p style="text-align:center;font-size:1.25em"><b>κ = (p₀ − pₑ) / (1 − pₑ)</b></p>

trong đó p₀ là tỷ lệ trùng thực tế, pₑ là tỷ lệ trùng kỳ vọng nếu hai người chấm ngẫu nhiên theo đúng tần suất nhãn của mình. Nhiều người chấm cùng lúc dùng kappa của Fleiss. Cách đọc thường dùng (Landis & Koch): 0,41–0,60 trung bình; 0,61–0,80 khá; trên 0,80 gần như hoàn toàn.

**Đo độ hợp lệ của AI bằng ngôn ngữ xét nghiệm chẩn đoán.** Coi "bài liên quan" là dương tính và nhãn người là tiêu chuẩn tham chiếu: độ nhạy = AI giữ được bao nhiêu phần trăm bài thật; độ đặc hiệu = AI loại đúng bao nhiêu phần trăm bài không liên quan. Đây là ngôn ngữ quen thuộc với cán bộ y tế công cộng và đúng là các chỉ tiêu hồ sơ đã cam kết. Độ chính xác luôn báo cáo kèm khoảng tin cậy 95% (Wilson), vì 85% trên 40 bài và 85% trên 400 bài không chắc chắn như nhau.

**Vì sao chấm mù.** Người đã nhìn gợi ý có xu hướng "neo" theo gợi ý. Nếu đo AI bằng nhãn của người đã thấy AI, AI sẽ trông giỏi hơn thật. Vì vậy thước đo chính lấy từ một mẫu ngẫu nhiên cố định, chấm khi không thấy gợi ý lẫn kết luận của AI.

**Vì sao AI không cần giỏi hơn người.** Tiêu chuẩn hợp lý là AI đồng thuận với người ở mức hai người đồng thuận với nhau. Đòi cao hơn là đòi AI đúng hơn cả thước đo.

## Hạn chế và đạo đức

- AI chỉ đọc chữ; bài chủ yếu bằng hình dễ bị xếp "chưa rõ" hoặc bỏ sót. Hồ sơ viết AI "kể cả đọc chữ trong ảnh" — hiện chưa làm vì dự án không lưu ảnh.
- "Mục đích" là suy luận từ nội dung, không phải ý định thật của người đăng.
- Mẫu đến từ hashtag công khai, không đại diện cho thị trường trong nhóm kín.
- Độ chắc do model tự khai, chưa được hiệu chỉnh; ngưỡng 60%/50% cần kiểm tra lại bằng số liệu chấm mù.
- Chỉ quan sát bài công khai, không tương tác khi xác minh. Tên tác giả được băm một chiều; nhãn và ghi chú không chứa phỏng đoán về người đăng (NĐ 13/2023).
- Muốn công bố bài báo từ bộ nhãn này: xin duyệt đạo đức nghiên cứu ngay khi dự án được phê duyệt.

## Ban nghiên cứu cần chốt

- [ ] Khớp bảng mã với khung P2M của tệp hiệu chuẩn "3 con mắt": thêm **nhóm hành vi 1–4** và **ngoại lệ Lab** (tín hiệu sản xuất báo ngay bất kể điểm); thống nhất cách gọi "3 con mắt"; chỉ giữ trong hệ thống liên quan + 3 con mắt + nhóm hành vi, phần còn lại chuyển sang phiên hội chẩn ([lý do](../bat-dau/he-thong-cung-cap-gi))
- [ ] Thay bộ 50 bài do máy sinh trong hệ thống bằng đề 50 bài của giảng viên (chỉ nạp đề, đáp án giữ trong tệp Excel)

- [ ] Phạm vi sản phẩm: thuốc lá điếu, xì gà, shisha, thuốc lào có tính là "không liên quan" không
- [ ] Tin tức trung tính về sản phẩm mới xếp vào nhãn nào
- [ ] Ngưỡng độ chắc 60%/50% cho kết luận sàng lọc của AI
- [ ] Thêm ngưỡng độ nhạy ≥ 0,90 và kappa ≥ 0,70 cho AI
- [ ] Ngưỡng "số nội dung dùng chung từ khóa" để chuyển tuyến
- [ ] Hồ sơ ghi "mục đích 4 nhãn", bảng mã có 5 (thêm "Không liên quan" để sàng lọc): sửa câu chữ hồ sơ cho khớp
- [ ] Câu "AI đọc cả chữ trong ảnh" trong hồ sơ: sửa câu chữ hay để giai đoạn sau
- [ ] Trang [Quy tắc ba tiêu chí](../cong-tac-vien/ba-tieu-chi) ghi "nhìn giao dịch" ở cả bình luận công khai, còn đơn vị chấm ở đây không gồm bình luận (hệ thống không thu bình luận): thống nhất một cách
- [ ] Ai giữ đáp án bộ 50 bài mô phỏng; đáp án hiện do máy sinh, cần giảng viên duyệt lại từng bài
- [ ] Ai là nghiên cứu viên xác minh, bao nhiêu bài mỗi tuần

## Tài liệu tham khảo

Tài liệu kinh điển, dẫn theo hiểu biết của nhóm soạn; cần rà soát số trang, năm xuất bản trước khi đưa vào hồ sơ.

1. Krippendorff K. *Content Analysis: An Introduction to Its Methodology*. Sage, 4th ed., 2018.
2. Neuendorf KA. *The Content Analysis Guidebook*. Sage, 2nd ed., 2017.
3. Cohen J. A coefficient of agreement for nominal scales. *Educational and Psychological Measurement*, 1960;20:37–46.
4. Fleiss JL. Measuring nominal scale agreement among many raters. *Psychological Bulletin*, 1971;76:378–382.
5. Landis JR, Koch GG. The measurement of observer agreement for categorical data. *Biometrics*, 1977;33:159–174.
6. Wilson EB. Probable inference, the law of succession, and statistical inference. *JASA*, 1927;22:209–212.
7. WHO. *Framework Convention on Tobacco Control*, Điều 13, và Hướng dẫn thực hiện Điều 13 (2008).
8. Luật Phòng, chống tác hại của thuốc lá số 09/2012/QH13; Nghị quyết 173/2024/QH15; Nghị định 13/2023/NĐ-CP.
9. Hồ sơ dự án VPHA 2027–2028: quy tắc "ba tiêu chí", bộ 50 bài mô phỏng, Phụ lục F.
