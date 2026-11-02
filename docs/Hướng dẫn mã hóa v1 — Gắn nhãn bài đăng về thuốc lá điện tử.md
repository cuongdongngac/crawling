# Hướng dẫn mã hóa v1 — Gắn nhãn bài đăng về thuốc lá điện tử

Nov 2, 2026 · @Phạm Việt Cường · Dự thảo chờ Ban nghiên cứu duyệt

## 1. Tài liệu này dùng để làm gì

Đây là thước đo chung để **người và AI gắn nhãn cùng một bài theo cùng một cách**, sao cho hai người chấm độc lập ra cùng kết quả, và độ đúng của AI đo được bằng con số. Tài liệu này là "Phụ lục A – Bảng mã hóa biến số" mà hồ sơ dự án đã hứa, cộng thêm phần quy tắc ra quyết định mà một bảng mã thuần túy không có.

- **Ai dùng:** nghiên cứu viên xác minh nhãn; giảng viên giữ đáp án bộ 50 bài mô phỏng; cộng tác viên khi làm bài hiệu chuẩn; nhóm IT khi đưa quy tắc vào câu lệnh cho AI.
- **Phạm vi:** bài đăng công khai do hệ thống thu về qua hashtag/từ khóa đã duyệt (TikTok, Facebook). Không áp dụng cho nhóm kín, tin nhắn, bình luận.
- **Gắn với phần mềm:** bảng mã v1 trong mã nguồn (`src/lib/ai/codebook.ts`), câu lệnh `post-label@1`. Khi Ban nghiên cứu duyệt tài liệu này, quy tắc sẽ được đưa vào câu lệnh `post-label@2` và hiển thị trên màn hình xác minh.
- **Tình trạng:** dự thảo do nhóm IT soạn. Các chỗ cần phán đoán chuyên môn được đánh dấu **\[Ban chốt\]** và gom lại ở mục 12.

## 2. Triết lý: bảy nguyên tắc

Gắn nhãn là **đo lường**, không phải phán xét. Mỗi nhãn là một phép đo về nội dung của bài; vì vậy nó phải lặp lại được, kiểm chứng được và công bố được sai số của mình.

1. **Cung cấp bằng chứng, không kết luận vi phạm.** Nhãn mô tả bài nói gì và nhằm làm gì. Nhãn không kết luận người đăng phạm luật, không đoán danh tính hay động cơ riêng. Xử lý vi phạm là việc của cơ quan có thẩm quyền.
2. **Chấm cái nhìn thấy được trước, suy luận sau và có luật.** Có giá, có số liên hệ, có từ "ship" là nội dung hiển hiện, ai đọc cũng thấy. "Mục đích" là nội dung ẩn, phải suy luận — nên chỉ được suy theo cây quyết định ở mục 5, không theo cảm nhận.
3. **Một thước đo cho cả người và máy.** AI được coi là một "người chấm" nữa: nhận cùng định nghĩa, cùng quy tắc, và bị đo bằng cùng chỉ số như người. Không có quy tắc riêng cho máy.
4. **AI gợi ý, người quyết định.** Nhãn của người luôn thắng nhãn của AI. Không bài nào được chuyển cho cơ quan chức năng mà chưa qua người.
5. **Tin cậy đi trước hợp lệ.** Nếu hai người chấm cùng một bài mà ra hai nhãn khác nhau, con số tổng hợp đo "ai chấm" chứ không đo thị trường. Vì thế độ đồng thuận phải được đo và đạt ngưỡng trước khi số liệu được dùng.
6. **Thận trọng bất đối xứng.** Loại nhầm một bài thật tệ hơn giữ nhầm một bài không liên quan: bài bị loại không được đo lại và biến mất khỏi phân tích, còn bài giữ nhầm sẽ được người phát hiện sau. Phân vân thì chọn **chưa rõ**, không chọn **không liên quan**.
7. **Tối thiểu dữ liệu, minh bạch phiên bản.** AI chỉ đọc chữ đã che số điện thoại, link, email, tài khoản. Mọi nhãn ghi kèm phiên bản bảng mã, câu lệnh và model, để bất kỳ con số nào cũng truy ngược được cách nó được tạo ra.

## 3. Cơ sở khoa học

Phương pháp gốc là **phân tích nội dung có hệ thống** (systematic content analysis): biến văn bản thành dữ liệu đếm được bằng một bảng mã công khai, người chấm được tập huấn, và độ tin cậy được báo cáo. Bốn trụ của bảng mã này:

| Trụ | Nội dung | Dùng ở đâu trong bảng mã |
| --- | --- | --- |
| Phân tích nội dung (Krippendorff; Neuendorf) | Đơn vị phân tích rõ, nhãn loại trừ nhau và bao trùm, quy tắc ghi mã viết sẵn, báo cáo độ đồng thuận | Mục 4, 5, 9 |
| Định nghĩa quảng cáo, khuyến mại thuốc lá của WHO FCTC Điều 13 | Mọi hình thức truyền thông thương mại có mục đích, tác dụng hoặc có khả năng tác dụng quảng bá sản phẩm, kể cả gián tiếp | Nhãn "Tiếp thị lối sống trá hình": không cần rao bán vẫn là quảng bá |
| Quy tắc "ba tiêu chí" của hồ sơ dự án | Nhìn hình – nhìn chữ – nhìn giao dịch; từ 2/3 là ca nghi ngờ | Xác định ca nghi ngờ và điều kiện chuyển tuyến |
| Ngôn ngữ học biến tướng | Biến dạng chính tả, dịch chuyển ngữ nghĩa ẩn dụ, ký hiệu emoji; bốn dạng thay đổi hình thức (đổi tên, viết tắt, ngụy trang mục đích, lách nền tảng) | Trường "Chiến thuật lách" và "Từ lóng" |

**Đo độ tin cậy bằng hệ số kappa.** Hai người chấm trùng nhau 90% chưa chắc đã tốt: nếu 90% bài đều "liên quan" thì chấm bừa cũng trùng gần như thế. Kappa của Cohen trừ phần trùng do may rủi:

```latex
\kappa = \frac{p_o - p_e}{1 - p_e}
```

Trong đó p₀ là tỷ lệ trùng thực tế, pₑ là tỷ lệ trùng kỳ vọng nếu hai người chấm ngẫu nhiên theo đúng tần suất nhãn của mình. Nhiều người chấm cùng lúc dùng kappa của Fleiss. Cách đọc thường dùng (Landis & Koch): 0,41–0,60 trung bình; 0,61–0,80 khá; trên 0,80 gần như hoàn toàn.

**Đo độ hợp lệ của AI bằng ngôn ngữ xét nghiệm chẩn đoán.** Coi "bài liên quan" là dương tính và nhãn người là tiêu chuẩn tham chiếu: độ nhạy = AI giữ được bao nhiêu phần trăm bài thật; độ đặc hiệu = AI loại đúng bao nhiêu phần trăm bài không liên quan. Đây là ngôn ngữ quen thuộc với cán bộ y tế công cộng, và đúng là các chỉ tiêu hồ sơ đã cam kết. Độ chính xác luôn báo cáo kèm khoảng tin cậy 95% (Wilson), vì 85% trên 40 bài và 85% trên 400 bài không chắc chắn như nhau.

**Vì sao chấm mù.** Người đã nhìn gợi ý có xu hướng "neo" theo gợi ý (thiên lệch neo, thiên lệch tin máy). Nếu đo AI bằng nhãn của người đã thấy AI, AI sẽ trông giỏi hơn thật. Vì vậy thước đo chính lấy từ một mẫu ngẫu nhiên cố định, chấm khi không thấy gợi ý lẫn kết luận của AI.

## 4. Đơn vị phân tích và nguyên tắc chấm chung

**Đơn vị chấm là một bài đăng công khai, tại thời điểm hệ thống phát hiện nó.** Gồm chữ của bài (caption), hashtag trong bài, và — chỉ với người — hình ảnh/video của chính bài đó. Không chấm bình luận, không chấm trang cá nhân người đăng, không chấm các bài khác của họ.

1. **Chỉ chấm cái có trong bài.** Không dùng hiểu biết ngoài bài về người đăng ("tài khoản này vốn là shop"). Thiếu thông tin thì chọn "Không xác định" hoặc để trống.
2. **Hashtag tìm kiếm không tự làm bài thành liên quan.** Bài được thu về vì có hashtag đó; đếm hashtag đó làm bằng chứng là lập luận vòng tròn. Phải có dấu hiệu khác trong chữ hoặc hình.
3. **Để trống khác với "Không".** "—" nghĩa là chưa chấm hoặc không đủ căn cứ; "Không" nghĩa là đã xem và khẳng định không có. Khi tính số liệu, ô trống bị bỏ qua, ô "Không" được tính.
4. **Mỗi bài một mục đích.** Bài có nhiều lớp nghĩa thì chọn theo thứ tự ưu tiên của cây quyết định (mục 5), không theo ý chính cảm nhận được.
5. **Không sửa nhãn theo kết quả mong muốn.** Không chấm khác đi vì biết bài đang có nhiều tương tác hay vì đang cần thêm ca nghi ngờ.
6. **Không chắc thì nói không chắc.** Tích "Tôi chưa chắc" thay vì đoán. Bài sẽ giữ trạng thái "chưa rõ" và không được dùng làm chuẩn đo AI. Ghi một dòng lý do vào ô ghi chú để Ban bổ sung quy tắc.

## 5. Cây quyết định

**Mục đích được xác định bằng bốn câu hỏi theo đúng thứ tự, dừng ở câu đầu tiên trả lời "có".** Thứ tự là quy tắc ưu tiên khi bài có nhiều lớp nghĩa: giao dịch thắng hỏi mua, hỏi mua thắng cảnh báo, và "lối sống" là phần còn lại.

&#91;embedded content: cây quyết định mục đích nội dung · 4 câu hỏi, 6 kết quả\]

Câu 1 là câu sàng lọc: "không" → bài không liên quan, ngừng đo lại; "chưa đủ căn cứ" → chưa rõ, chờ người. Mọi nhánh sau câu 1 đều là bài liên quan. Người chấm và AI trả lời cùng bốn câu này; chỉ người được dùng hình để trả lời.

## 6. Định nghĩa từng nhãn

**Mục đích nội dung là trường duy nhất bắt buộc**, và là trường quyết định kết luận sàng lọc: "Không liên quan" → bài không liên quan; bốn mục đích còn lại → bài liên quan. Ví dụ dưới đây là câu mô phỏng, không phải bài thật.

### 6.1 Mục đích nội dung (chọn một)

| Nhãn | Định nghĩa | Dấu hiệu đủ | Ví dụ mô phỏng |
| --- | --- | --- | --- |
| Tiếp thị trực tiếp | Người đăng mời người xem mua, đổi hoặc nhận sản phẩm | Một trong: giá; cách liên hệ để mua (ib, Zalo, số điện thoại, link shop); giao hàng; lời báo hàng ("hàng về", "sẵn hàng", "thanh lý", "pass lại") | "Thanh lý bút thơm, ship nội thành, ib nha" |
| Tiếp thị lối sống trá hình | Khoe, review, gắn sản phẩm với phong cách sống, giải trí, trào lưu — không có lời mời giao dịch | Sản phẩm xuất hiện theo hướng tích cực hoặc bình thường hóa; không có dấu hiệu giao dịch | "Vị xoài lạnh là chân ái luôn mọi người ạ" |
| Hỏi mua | Người đăng muốn mua, xin chỗ bán | Câu hỏi hoặc lời nhờ tìm nguồn hàng | "Ai biết chỗ nào bán pod ở Hưng Yên không ạ" |
| Cảnh báo – phòng chống | Nội dung nêu tác hại, chuyện cai, chính sách cấm, tin xử lý vi phạm | Thái độ phản đối hoặc thông tin thực thi | "Hành trình cai vape của mình sau 3 tháng" |
| Không liên quan | Không nói về thuốc lá điện tử, thuốc lá nung nóng, tinh dầu hoặc phụ kiện dùng cho các thiết bị này | Chỉ trùng từ (pod, khói, tinh dầu…) mà nội dung nói chuyện khác | "Review tai nghe AirPods Pro, bass ổn áp" |

### 6.2 Loại chủ thể đăng

| Nhãn | Chọn khi |
| --- | --- |
| Người bán | Bài có dấu hiệu kinh doanh thường xuyên: nhiều mẫu, bảng giá, tên shop, cam kết giao hàng |
| Người tạo xu hướng | Bài dạng sản xuất nội dung cho khán giả: review có dàn dựng, thử thách, kêu gọi theo dõi |
| Người dùng | Cá nhân nói về trải nghiệm của mình, kể cả bán lại đồ đã dùng một lần |
| Tổ chức / báo chí / cơ quan | Báo, cơ quan nhà nước, bệnh viện, trường học, tổ chức xã hội |
| Không xác định | Chữ quá ít để phân biệt. AI nên chọn nhãn này khi chỉ có một câu ngắn |

### 6.3 Ba tiêu chí (Có / Không / —)

| Tiêu chí | "Có" khi | Ai chấm |
| --- | --- | --- |
| Hình | Ảnh/video thấy sản phẩm, thiết bị, hộp tinh dầu hoặc người đang nhả khói từ thiết bị | Chỉ người (mở bài gốc) |
| Chữ | Chữ hoặc hashtag (ngoài hashtag tìm kiếm) gọi tên sản phẩm, kể cả gọi thẳng ("vape", "pod") hoặc bằng từ lóng, từ lách | Người và AI |
| Giao dịch | Có giá, cách liên hệ để mua hoặc giao hàng | Người và AI |

**Ca nghi ngờ = từ 2/3 tiêu chí "Có".** Vì AI không xem hình, AI chỉ đưa ra ca nghi ngờ khi có cả chữ và giao dịch. Bài AI chấm 1/3 vẫn có thể là ca nghi ngờ sau khi người xem hình.

### 6.4 Các trường mô tả khác

| Trường | Quy tắc |
| --- | --- |
| Có nêu giá | Có con số giá, kể cả viết tắt ("2xx", "1tr2", "99k"). "Giá tốt", "rẻ" không có số → Không |
| Kênh liên hệ (chọn nhiều) | Zalo / Telegram / Số điện thoại / Nhắn tin, inbox / Đường dẫn ngoài, shop / Khác. \[SĐT\] và \[LINK\] do hệ thống che vẫn tính. Không có kênh nào → "Không có" |
| Có nhắc giao hàng | Ship, giao, COD, hỏa tốc, "gửi xe" |
| Nhắm tới giới trẻ | Nói rõ học sinh, sinh viên, teen, gen Z, "giá HSSV", bối cảnh trường học. Người trong video trông trẻ thôi → không đủ |
| Chiến thuật lách (chọn nhiều) | Đổi tên sản phẩm ("bút thơm", "kẹo khói") · Viết tắt, teencode, biến dạng chính tả ("p0d", "v@pe") · Ký hiệu emoji thay tên sản phẩm (💨 đứng một mình không đủ) · Ngụy trang mục đích ("thanh lý", "pass đồ") · Kéo sang nền tảng khác ("vào nhóm kín", "nói qua Zalo") |
| Sắc thái với sản phẩm | Tích cực / Trung tính / Tiêu cực — thái độ của bài với sản phẩm, không phải cảm xúc chung của bài |
| Từ lóng xuất hiện | Chép nguyên cách viết trong bài, tối đa 10 từ. Nguồn đề xuất từ khóa mới cho danh mục |

## 7. Ca khó và quy tắc phân xử

Mỗi ca dưới đây đã có quy tắc đề xuất và lý do. Ca có **\[Ban chốt\]** là phán đoán chuyên môn, cần Ban nghiên cứu xác nhận trước buổi hiệu chuẩn.

| Ca | Quy tắc đề xuất | Lý do |
| --- | --- | --- |
| Review vị + "ai cần ib" | Tiếp thị trực tiếp | Có lời mời giao dịch thì giao dịch thắng mọi lớp nghĩa khác |
| Cá nhân "pass lại pod dùng 1 lần" | Tiếp thị trực tiếp; chủ thể = Người dùng; lách = Ngụy trang mục đích | Mô tả hành vi (mời giao dịch), không phán xét quy mô. Quy mô nằm ở trường chủ thể |
| Chỉ có hashtag và emoji, không chữ | AI: Chưa rõ. Người: xem hình rồi chấm; hình cũng không rõ → "Tôi chưa chắc" | Hashtag tìm kiếm không phải bằng chứng (mục 4) |
| "Hàng về rồi nhé", "ib" đứng một mình dưới hashtag sản phẩm | Tiếp thị trực tiếp nếu có thêm hashtag sản phẩm ngoài hashtag tìm kiếm; không thì Chưa rõ | Lời báo hàng là dấu hiệu giao dịch, nhưng cần biết hàng gì |
| Tin công an thu giữ hàng, tin xử phạt | Cảnh báo – phòng chống; chủ thể = Tổ chức nếu là báo/cơ quan | Thông tin thực thi là một phần của môi trường phòng chống |
| Tin tức trung tính về sản phẩm mới ở nước ngoài | **\[Ban chốt\]** Đề xuất: Tiếp thị lối sống trá hình nếu giới thiệu tính năng, hương vị; Cảnh báo nếu nêu tác hại hoặc chính sách | Theo FCTC Điều 13, xét cả tác dụng quảng bá, không chỉ ý định |
| Meme, video hài có cảnh dùng vape | Tiếp thị lối sống trá hình; sắc thái Tích cực hoặc Trung tính | Bình thường hóa hành vi là cơ chế quảng bá gián tiếp |
| Video chế giễu người dùng vape | Cảnh báo – phòng chống nếu thái độ rõ là phản đối; không rõ thì "Tôi chưa chắc" | Châm biếm dễ đọc ngược, không ép nhãn |
| "Tinh dầu thơm phòng", "nến thơm", "máy xông" | Không liên quan, trừ khi có thiết bị hút, đầu pod, vị "đá", "số hơi" hoặc từ lóng đi kèm | "Thơm phòng" có thể là lời ngụy trang; cần dấu hiệu thứ hai |
| Thuốc lá điếu, xì gà, shisha, thuốc lào | **\[Ban chốt\]** Đề xuất: Không liên quan, ghi chú loại sản phẩm | Phạm vi dự án là thuốc lá điện tử và thuốc lá nung nóng |
| Bài bằng tiếng nước ngoài | Chấm theo nội dung nếu người chấm hiểu; không hiểu → "Tôi chưa chắc" | Thuộc trách nhiệm khâu lọc ngôn ngữ, không phải bảng mã |
| Bài vừa bán vừa "khuyên không nên hút nhiều" | Tiếp thị trực tiếp | Thứ tự ưu tiên: giao dịch trước cảnh báo |
| Bài của chính dự án hoặc đối tác truyền thông | Cảnh báo – phòng chống + ghi chú "bài của dự án" | Hồ sơ cam kết loại bài của dự án khỏi chỉ số tác động |

Ca mới phát sinh khi xác minh: ghi vào ô ghi chú, Ban xem hằng tháng và bổ sung vào bảng này ở phiên bản sau (mục 10).

## 8. Quy trình chấm

**AI chấm mọi bài, người chấm ba nhóm bài, và chỉ bài qua người mới được chuyển tuyến.**

1. **AI chấm.** Mỗi bài mới được gửi cho AI: nền tảng, hashtag và chữ đã che thông tin liên hệ. AI trả về đủ các trường ở mục 6 (trừ tiêu chí hình), kèm độ chắc (0–1) và một câu lý do.
2. **Kết luận sàng lọc tạm thời.** "Không liên quan" với độ chắc từ 60% → không liên quan (ngừng đo lại). Mục đích khác với độ chắc từ 50% → liên quan. Còn lại → chưa rõ. Ngưỡng lệch về phía giữ bài theo nguyên tắc 6. **\[Ban chốt\]** sau khi có số liệu chấm mù.
3. **Người xác minh theo thứ tự ưu tiên:**
   1. Bài sắp vào danh sách chuyển tuyến — 100%, xem cả hình.
   2. Bài AI xếp "chưa rõ" — có hiện gợi ý AI, người chốt.
   3. Mẫu chấm mù \~10% bài AI đã kết luận — ẩn gợi ý và kết luận AI tới khi lưu. Mẫu chọn cố định theo mã bài nên không ai chọn lọc được.
   4. \~50 bài/tháng do hai người chấm độc lập — đo độ đồng thuận người với người.
4. **Người lưu nhãn → kết luận của người thay kết luận AI.** Nhãn AI vẫn được giữ để so sánh. Tích "Tôi chưa chắc" → bài ở lại "chưa rõ" cho người khác.
5. **Ca nghi ngờ → chuyển tuyến.** Một bài chỉ vào bản tin khi: người đã xác minh; mục đích là Tiếp thị trực tiếp, Tiếp thị lối sống trá hình hoặc Hỏi mua; đạt từ 2/3 tiêu chí; và từ khóa của bài đủ ngưỡng số nội dung dùng chung theo hồ sơ.

**"Liên quan" khác với "nghi vi phạm".** Bài cảnh báo vẫn là bài liên quan (đúng chủ đề, được đếm trong nhóm Cảnh báo) nhưng không bao giờ là ca nghi ngờ. Sàng lọc trả lời "có đo bài này không"; ba tiêu chí trả lời "có báo bài này không".

## 9. Kiểm soát chất lượng: ngưỡng và nhịp đo

**Người phải đạt chuẩn trước, rồi mới dùng người để đo AI.** Các ngưỡng lấy từ hồ sơ dự án (Phụ lục F), trừ dòng ghi "đề xuất thêm".

| Đối tượng đo | Chỉ số | Ngưỡng | Đo trên | Khi nào |
| --- | --- | --- | --- | --- |
| Người gắn nhãn, cộng tác viên | Độ nhạy | ≥ 0,85 | Bộ 50 bài mô phỏng | Tuần 0, lặp lại mỗi 8–12 tuần |
| Người gắn nhãn, cộng tác viên | Độ đặc hiệu | ≥ 0,80 | Bộ 50 bài mô phỏng | Tuần 0, lặp lại mỗi 8–12 tuần |
| Cả nhóm gắn nhãn | Fleiss' kappa | ≥ 0,61 mới bắt đầu | Bộ 50 bài mô phỏng | Tuần 0 |
| Tập chuẩn (hai người độc lập) | Cohen's kappa | ≥ 0,70 | \~50 bài thật/tháng chấm đôi | Hằng tháng |
| AI | Độ chính xác liên quan / không liên quan | ≥ 85% mới dùng kết quả AI | Mẫu chấm mù | Hằng tháng, và mỗi khi đổi model/câu lệnh |
| AI | Độ nhạy | Đề xuất thêm: ≥ 0,90 | Mẫu chấm mù | Hằng tháng |
| AI | Kappa với người | Đề xuất thêm: ≥ 0,70 (ngang người với người) | Mẫu chấm mù | Hằng tháng |

- **Vì sao thêm ngưỡng độ nhạy cho AI.** Độ chính xác 85% có thể đạt trong khi AI vẫn loại nhầm nhiều bài thật. Bài loại nhầm không được đo lại (nguyên tắc 6).
- **Vì sao AI không cần giỏi hơn người.** Tiêu chuẩn hợp lý là AI đồng thuận với người ở mức hai người đồng thuận với nhau. Đòi hỏi cao hơn là đòi AI đúng hơn cả thước đo.
- **Cỡ mẫu.** Không kết luận "đạt" dưới 50 bài. "Đạt chắc chắn" khi cận dưới khoảng tin cậy 95% cũng vượt ngưỡng.
- **Trôi chuẩn.** Từ lóng đổi theo thời gian nên cả người và AI đều có thể "trôi". Chạy lại bộ 50 bài mỗi 8–12 tuần và bổ sung bài thật đã ẩn danh vào tập chuẩn.
- **Giảm mẫu.** AI đạt ngưỡng 2 tháng liền thì giảm mẫu chấm mù từ 10% xuống 5%; tụt dưới ngưỡng thì quay lại 10%.
- **Người chấm trượt chuẩn.** Chấm lại bộ 50 bài sau 20 phút giảng lại; chưa đạt thì tạm ngừng xác minh.

## 10. Quản lý phiên bản

**Bảng mã đã dùng thì không sửa, chỉ ra phiên bản mới.** Nhãn cấp theo v1 phải so sánh được với nhau suốt 18 tháng.

| Thay đổi | Làm gì | Ví dụ |
| --- | --- | --- |
| Thêm/bớt nhãn, đổi định nghĩa | Bảng mã mới (v2), hiệu chuẩn lại người, chạy lại AI trên toàn bộ lịch sử | Tách "Tiếp thị trực tiếp" thành "Shop" và "Cá nhân bán lại" |
| Thêm quy tắc cho ca khó, không đổi nhãn | Bản hướng dẫn mới (v1.1); câu lệnh AI lên phiên bản mới | Thêm quy tắc cho "tinh dầu thơm phòng" |
| Đổi model AI | Giữ bảng mã và câu lệnh; chạy bộ 50 bài trước, rồi gắn lại toàn bộ lịch sử | Chuyển sang model rẻ hơn |

Hệ thống ghi sẵn phiên bản bảng mã, câu lệnh và model vào từng nhãn. Gắn lại toàn bộ lịch sử khi đổi AI là để đường "số bài liên quan theo tuần" không nhảy bậc chỉ vì đổi công cụ đo. Mỗi báo cáo ghi rõ con số được tính theo phiên bản nào.

## 11. Hạn chế và đạo đức

**Hạn chế phải ghi trong mọi báo cáo dùng nhãn:**

- AI chỉ đọc chữ; bài chủ yếu bằng hình dễ bị xếp "chưa rõ" hoặc bị bỏ sót. Hồ sơ viết AI "kể cả đọc chữ trong ảnh" — hiện chưa làm vì dự án không lưu ảnh.
- "Mục đích" là suy luận từ nội dung, không phải ý định thật của người đăng.
- Mẫu đến từ hashtag công khai, không đại diện cho thị trường trong nhóm kín.
- Độ chắc do model tự khai, chưa được hiệu chỉnh; ngưỡng 60%/50% cần kiểm tra lại bằng số liệu chấm mù.

**Đạo đức và dữ liệu cá nhân (NĐ 13/2023):**

- Chỉ quan sát bài công khai; không tương tác, không mua hàng, không nhắn tin cho người bán khi xác minh.
- AI chỉ nhận chữ đã che số điện thoại, link, email, tài khoản; không gửi ảnh. Trong tài khoản OpenRouter, chỉ dùng nhà cung cấp cam kết không dùng dữ liệu để huấn luyện.
- Tên tác giả được băm một chiều; nhãn không ghi danh tính. Nhãn và ghi chú không chứa phỏng đoán về người đăng.
- Chỉ nghiên cứu viên được xem nội dung bài để xác minh; cộng tác viên làm bài hiệu chuẩn trên bài mô phỏng.
- Muốn công bố bài báo từ bộ nhãn này: xin duyệt đạo đức nghiên cứu ngay khi dự án được phê duyệt.

## 12. Ban nghiên cứu cần chốt

- [ ] Phạm vi sản phẩm: thuốc lá điếu, xì gà, shisha, thuốc lào có tính là "không liên quan" không (mục 7)
- [ ] Tin tức trung tính về sản phẩm mới xếp vào nhãn nào (mục 7)
- [ ] Ngưỡng độ chắc 60%/50% cho kết luận sàng lọc của AI (mục 8)
- [ ] Thêm ngưỡng độ nhạy ≥ 0,90 và kappa ≥ 0,70 cho AI (mục 9)
- [ ] Ngưỡng "số nội dung dùng chung từ khóa" để chuyển tuyến (hồ sơ ghi "hơn 10" cho việc xác nhận từ khóa)
- [ ] Sự khác biệt giữa hồ sơ ("mục đích 4 nhãn") và bảng mã (5 nhãn, thêm "Không liên quan" để sàng lọc): sửa câu chữ hồ sơ cho khớp
- [ ] Câu "AI đọc cả chữ trong ảnh" trong hồ sơ: sửa câu chữ hay để giai đoạn sau
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
8. Luật Phòng, chống tác hại của thuốc lá số 09/2012/QH13; Nghị quyết 173/2024/QH15; Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
9. Hồ sơ dự án VPHA 2027–2028: quy tắc "ba tiêu chí", bộ 50 bài mô phỏng, Phụ lục F (ngưỡng hiệu chuẩn).
