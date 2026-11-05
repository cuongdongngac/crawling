---
title: "Hướng dẫn gắn nhãn bài (bảng mã v1)"
---

Đây là thước đo chung để **người và AI gắn nhãn một bài theo cùng một cách**, sao cho hai người chấm độc lập ra cùng kết quả, và độ đúng của AI đo được bằng con số. Màn hình dùng hướng dẫn này: [Gắn nhãn bài (AI hỗ trợ)](./gan-nhan). Vì sao làm thế (triết lý, cơ sở khoa học, các điểm đang chờ chốt): [Hướng dẫn mã hóa — triết lý và cơ sở khoa học](../thiet-ke/huong-dan-ma-hoa).

:::caution[Bản v1 — dự thảo]
Các quy tắc đánh dấu **[chờ chốt]** đang chờ Ban nghiên cứu xác nhận. Khi chốt, quy tắc được đưa vào câu lệnh của AI và hiển thị trên màn hình xác minh.
:::

:::note[Phần nào chấm trong hệ thống]
Trong hệ thống chỉ chấm những gì quyết định "đo bài nào" và "báo bài nào": **liên quan hay không**, **3 con mắt** (hình, chữ, giao dịch → ca nghi ngờ) và **nhóm hành vi 1–4** (khung P2M). Các trường mô tả chi tiết ở mục 3.4 và loại chủ thể dùng trong **phiên hội chẩn** ngoài hệ thống, trên mẫu bài xuất ra — xem [Hệ thống cung cấp gì](../bat-dau/he-thong-cung-cap-gi). Màn hình xác minh hiện vẫn còn đủ các trường; sẽ rút gọn theo nguyên tắc này.
:::

## 1. Đơn vị chấm và nguyên tắc chung

**Đơn vị chấm là một bài đăng công khai, tại thời điểm hệ thống phát hiện nó.** Gồm chữ của bài, hashtag trong bài, và — chỉ với người — hình ảnh/video của chính bài đó. Không chấm bình luận, trang cá nhân hay các bài khác của người đăng.

1. **Chỉ chấm cái có trong bài.** Không dùng hiểu biết ngoài bài về người đăng. Thiếu thông tin thì chọn "Không xác định" hoặc để trống.
2. **Hashtag tìm kiếm không tự làm bài thành liên quan.** Bài được thu về vì có hashtag đó; đếm nó làm bằng chứng là lập luận vòng tròn. Phải có dấu hiệu khác trong chữ hoặc hình.
3. **Để trống khác với "Không".** "—" là chưa chấm hoặc không đủ căn cứ; "Không" là đã xem và khẳng định không có. Khi tính số liệu, ô trống bị bỏ qua.
4. **Mỗi bài một mục đích**, chọn theo thứ tự của cây quyết định (mục 2).
5. **Không sửa nhãn theo kết quả mong muốn** — không chấm khác đi vì bài nhiều tương tác hay vì đang cần thêm ca nghi ngờ.
6. **Không chắc thì nói không chắc.** Tích "Tôi chưa chắc" và ghi một dòng lý do. Bài giữ trạng thái "chưa rõ" và không dùng làm chuẩn đo AI.
7. **Phân vân giữa "liên quan" và "không liên quan" thì chọn "chưa rõ".** Bài bị loại sẽ không được đo lại; bài giữ nhầm còn được người phát hiện sau.

## 2. Cây quyết định: xác định mục đích

**Hỏi bốn câu theo đúng thứ tự, dừng ở câu đầu tiên trả lời "có".** Thứ tự chính là quy tắc ưu tiên khi bài có nhiều lớp nghĩa: giao dịch thắng hỏi mua, hỏi mua thắng cảnh báo, "lối sống" là phần còn lại.

<a href="/help/images/thiet-ke/cay-quyet-dinh-ma-hoa.svg" target="_blank" title="Mở hình cỡ lớn"><img src="/images/thiet-ke/cay-quyet-dinh-ma-hoa.svg" alt="Cây quyết định mục đích nội dung: 4 câu hỏi, 6 kết quả"></a>

Câu 1 là câu sàng lọc: "không" → bài không liên quan, ngừng đo lại; "chưa đủ căn cứ" → chưa rõ, chờ người. Mọi nhánh sau câu 1 đều là bài liên quan. Người và AI trả lời cùng bốn câu; chỉ người được dùng hình.

## 3. Định nghĩa từng nhãn

Ví dụ là câu mô phỏng, không phải bài thật.

### 3.1 Mục đích nội dung (bắt buộc, chọn một)

| Nhãn | Định nghĩa | Dấu hiệu đủ | Ví dụ mô phỏng |
|---|---|---|---|
| Tiếp thị trực tiếp | Người đăng mời người xem mua, đổi hoặc nhận sản phẩm | Một trong: giá; cách liên hệ để mua; giao hàng; lời báo hàng ("hàng về", "thanh lý", "pass lại") | "Thanh lý bút thơm, ship nội thành, ib nha" |
| Tiếp thị lối sống trá hình | Khoe, review, gắn sản phẩm với phong cách sống, giải trí, trào lưu — không mời giao dịch | Sản phẩm xuất hiện theo hướng tích cực hoặc bình thường hóa | "Vị xoài lạnh là chân ái luôn mọi người ạ" |
| Hỏi mua | Người đăng muốn mua, xin chỗ bán | Câu hỏi hoặc lời nhờ tìm nguồn hàng | "Ai biết chỗ nào bán pod ở Hưng Yên không ạ" |
| Cảnh báo – phòng chống | Nêu tác hại, chuyện cai, chính sách cấm, tin xử lý vi phạm | Thái độ phản đối hoặc thông tin thực thi | "Hành trình cai vape của mình sau 3 tháng" |
| Không liên quan | Không nói về thuốc lá điện tử, thuốc lá nung nóng, tinh dầu hoặc phụ kiện cho các thiết bị này | Chỉ trùng từ (pod, khói, tinh dầu…) mà nội dung nói chuyện khác | "Review tai nghe AirPods Pro, bass ổn áp" |

### 3.2 Loại chủ thể đăng

| Nhãn | Chọn khi |
|---|---|
| Người bán | Dấu hiệu kinh doanh thường xuyên: nhiều mẫu, bảng giá, tên shop, cam kết giao hàng |
| Người tạo xu hướng | Bài dạng sản xuất nội dung cho khán giả: review có dàn dựng, thử thách, kêu gọi theo dõi |
| Người dùng | Cá nhân nói về trải nghiệm của mình, kể cả bán lại đồ đã dùng một lần |
| Tổ chức / báo chí / cơ quan | Báo, cơ quan nhà nước, bệnh viện, trường học, tổ chức xã hội |
| Không xác định | Chữ quá ít để phân biệt |

### 3.3 Ba tiêu chí (Có / Không / —)

| Tiêu chí | "Có" khi | Ai chấm |
|---|---|---|
| Hình | Ảnh/video thấy sản phẩm, thiết bị, hộp tinh dầu hoặc người đang nhả khói từ thiết bị | Chỉ người (mở bài gốc) |
| Chữ | Chữ hoặc hashtag (ngoài hashtag tìm kiếm) gọi tên sản phẩm, kể cả gọi thẳng hoặc bằng từ lóng, từ lách | Người và AI |
| Giao dịch | Có giá, cách liên hệ để mua hoặc giao hàng | Người và AI |

**Ca nghi ngờ = từ 2/3 tiêu chí "Có".** AI không xem hình nên chỉ đưa ra ca nghi ngờ khi có cả chữ và giao dịch; bài AI chấm 1/3 vẫn có thể thành ca nghi ngờ sau khi người xem hình. Xem thêm [Quy tắc ba tiêu chí](../cong-tac-vien/ba-tieu-chi).

### 3.4 Các trường mô tả khác

| Trường | Quy tắc |
|---|---|
| Có nêu giá | Có con số giá, kể cả viết tắt ("2xx", "1tr2", "99k"). "Giá tốt", "rẻ" không có số → Không |
| Kênh liên hệ (chọn nhiều) | Zalo / Telegram / Số điện thoại / Nhắn tin, inbox / Đường dẫn ngoài, shop / Khác. [SĐT] và [LINK] do hệ thống che vẫn tính. Không có kênh nào → "Không có" |
| Có nhắc giao hàng | Ship, giao, COD, hỏa tốc, "gửi xe" |
| Nhắm tới giới trẻ | Nói rõ học sinh, sinh viên, teen, gen Z, "giá HSSV", bối cảnh trường học. Người trong video trông trẻ thôi → không đủ |
| Chiến thuật lách (chọn nhiều) | Đổi tên sản phẩm · Viết tắt, teencode, biến dạng chính tả · Ký hiệu emoji thay tên sản phẩm (một biểu tượng khói đứng một mình không đủ) · Ngụy trang mục đích ("thanh lý", "pass đồ") · Kéo sang nền tảng khác ("vào nhóm kín", "nói qua Zalo") |
| Sắc thái với sản phẩm | Tích cực / Trung tính / Tiêu cực — thái độ của bài với sản phẩm, không phải cảm xúc chung của bài |
| Từ lóng xuất hiện | Chép nguyên cách viết trong bài, tối đa 10 từ |

## 4. Ca khó và quy tắc phân xử

| Ca | Quy tắc | Lý do |
|---|---|---|
| Review vị + "ai cần ib" | Tiếp thị trực tiếp | Có lời mời giao dịch thì giao dịch thắng |
| Cá nhân "pass lại pod dùng 1 lần" | Tiếp thị trực tiếp; chủ thể = Người dùng; lách = Ngụy trang mục đích | Mô tả hành vi, không phán xét quy mô. Quy mô nằm ở trường chủ thể |
| Chỉ có hashtag và emoji, không chữ | AI: Chưa rõ. Người: xem hình rồi chấm; hình cũng không rõ → "Tôi chưa chắc" | Hashtag tìm kiếm không phải bằng chứng |
| "Hàng về rồi nhé", "ib" đứng một mình | Tiếp thị trực tiếp nếu có thêm hashtag sản phẩm ngoài hashtag tìm kiếm; không thì Chưa rõ | Lời báo hàng là dấu hiệu giao dịch, nhưng cần biết hàng gì |
| Tin công an thu giữ hàng, tin xử phạt | Cảnh báo – phòng chống; chủ thể = Tổ chức nếu là báo/cơ quan | Thông tin thực thi thuộc môi trường phòng chống |
| Tin tức trung tính về sản phẩm mới ở nước ngoài | **[chờ chốt]** Lối sống trá hình nếu giới thiệu tính năng, hương vị; Cảnh báo nếu nêu tác hại hoặc chính sách | Xét cả tác dụng quảng bá, không chỉ ý định |
| Meme, video hài có cảnh dùng vape | Lối sống trá hình | Bình thường hóa hành vi là quảng bá gián tiếp |
| Video chế giễu người dùng vape | Cảnh báo nếu thái độ rõ là phản đối; không rõ → "Tôi chưa chắc" | Châm biếm dễ đọc ngược |
| "Tinh dầu thơm phòng", "nến thơm", "máy xông" | Không liên quan, trừ khi có thiết bị hút, đầu pod, "số hơi" hoặc từ lóng đi kèm | "Thơm phòng" có thể là ngụy trang; cần dấu hiệu thứ hai |
| Thuốc lá điếu, xì gà, shisha, thuốc lào | **[chờ chốt]** Không liên quan, ghi chú loại sản phẩm | Phạm vi dự án là thuốc lá điện tử và nung nóng |
| Bài bằng tiếng nước ngoài | Chấm theo nội dung nếu hiểu; không hiểu → "Tôi chưa chắc" | Thuộc khâu lọc ngôn ngữ |
| Vừa bán vừa "khuyên không nên hút nhiều" | Tiếp thị trực tiếp | Giao dịch xét trước cảnh báo |
| Bài của chính dự án hoặc đối tác truyền thông | Cảnh báo + ghi chú "bài của dự án" | Loại khỏi chỉ số đo tác động |

Ca mới phát sinh: ghi vào ô ghi chú khi xác minh. Ban nghiên cứu xem hằng tháng và bổ sung vào bảng này ở phiên bản sau.

## 5. Quy trình chấm

**AI chấm mọi bài, người chấm ba nhóm bài, và chỉ bài qua người mới được chuyển tuyến.**

1. **AI chấm** chữ đã che thông tin liên hệ, trả về đủ các trường (trừ tiêu chí hình), kèm độ chắc (0–1) và một câu lý do.
2. **Kết luận sàng lọc tạm thời:** "Không liên quan" với độ chắc từ 60% → không liên quan (ngừng đo lại); mục đích khác với độ chắc từ 50% → liên quan; còn lại → chưa rõ. **[chờ chốt]** ngưỡng sau khi có số liệu chấm mù.
3. **Người xác minh theo thứ tự:**
    1. Bài sắp vào danh sách chuyển tuyến — 100%, xem cả hình.
    2. Bài AI xếp "chưa rõ" — có gợi ý AI, người chốt.
    3. Mẫu chấm mù ~10% bài AI đã kết luận — ẩn gợi ý và kết luận AI tới khi lưu.
    4. ~50 bài/tháng do hai người chấm độc lập — đo đồng thuận người với người.
4. **Nhãn người thay kết luận AI.** Nhãn AI vẫn được giữ để so sánh.
5. **Chuyển tuyến** chỉ khi: người đã xác minh; mục đích là Tiếp thị trực tiếp, Lối sống trá hình hoặc Hỏi mua; đạt từ 2/3 tiêu chí; từ khóa đủ ngưỡng số nội dung dùng chung.

:::tip["Liên quan" khác với "nghi vi phạm"]
Bài cảnh báo vẫn là bài liên quan (đúng chủ đề, được đếm trong nhóm Cảnh báo) nhưng không bao giờ là ca nghi ngờ. Sàng lọc trả lời "có đo bài này không"; ba tiêu chí trả lời "có báo bài này không".
:::

## 6. Ngưỡng chất lượng

| Đối tượng | Chỉ số | Ngưỡng | Đo trên | Khi nào |
|---|---|---|---|---|
| Người gắn nhãn, cộng tác viên | Độ nhạy / độ đặc hiệu | ≥ 0,85 / ≥ 0,80 | Bộ 50 bài mô phỏng | Tuần 0, lặp lại mỗi 8–12 tuần |
| Cả nhóm gắn nhãn | Fleiss' kappa | ≥ 0,61 mới bắt đầu | Bộ 50 bài mô phỏng | Tuần 0 |
| Tập chuẩn (hai người độc lập) | Cohen's kappa | ≥ 0,70 | ~50 bài thật/tháng chấm đôi | Hằng tháng |
| AI | Độ chính xác liên quan / không liên quan | ≥ 85% mới dùng kết quả AI | Mẫu chấm mù | Hằng tháng, và mỗi khi đổi model/câu lệnh |
| AI | Độ nhạy; kappa với người | **[chờ chốt]** ≥ 0,90; ≥ 0,70 | Mẫu chấm mù | Hằng tháng |

- Không kết luận "đạt" dưới 50 bài. "Đạt chắc chắn" khi cận dưới khoảng tin cậy 95% cũng vượt ngưỡng.
- AI đạt ngưỡng 2 tháng liền thì giảm mẫu chấm mù từ 10% xuống 5%; tụt dưới ngưỡng thì quay lại 10%.
- Người chấm trượt chuẩn: chấm lại bộ 50 bài sau buổi giảng lại; chưa đạt thì tạm ngừng xác minh.

## 7. Phiên bản

**Bảng mã đã dùng thì không sửa, chỉ ra phiên bản mới.**

| Thay đổi | Làm gì |
|---|---|
| Thêm/bớt nhãn, đổi định nghĩa | Bảng mã mới (v2), hiệu chuẩn lại người, chạy lại AI trên toàn bộ lịch sử |
| Thêm quy tắc cho ca khó, không đổi nhãn | Bản hướng dẫn mới (v1.1); câu lệnh AI lên phiên bản mới |
| Đổi model AI | Chạy bộ 50 bài trước, rồi gắn lại toàn bộ lịch sử |

Mỗi nhãn tự ghi phiên bản bảng mã, câu lệnh và model. Mỗi báo cáo ghi rõ con số tính theo phiên bản nào.
