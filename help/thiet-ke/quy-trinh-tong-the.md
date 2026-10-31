# Quy trình tổng thể: công cụ nào, làm gì, vì sao

::: tip Mục tạm thời — kênh trao đổi thiết kế
Mục **Thiết kế đang phát triển** giải thích ý tưởng, cách làm và **hạn chế** của hệ thống trong giai đoạn xây dựng, để nhóm cùng xem và góp ý. Mục này sẽ được rút gọn hoặc xóa khi hệ thống ổn định. Góp ý gửi trực tiếp cho trưởng nhóm IT (CuongPV).
:::

Trang này dành cho người cần nắm **toàn cảnh**: hệ thống gồm những khâu nào, mỗi khâu dùng công cụ gì, ghi lại gì, và **vì sao làm như vậy**.

<a href="/help/images/thiet-ke/quy-trinh-tong-the.svg" target="_blank" title="Mở hình cỡ lớn"><img src="/images/thiet-ke/quy-trinh-tong-the.svg" alt="Sơ đồ quy trình tổng thể"></a>
<p class="img-caption">Hình 1: Bảy khâu, chia ba phần — danh mục từ khóa, bài viết và số liệu, góc nhìn đặt cạnh. Bấm vào hình để xem cỡ lớn.</p>

## Nguyên tắc: việc nào ra việc đó

- **Mỗi khâu một trách nhiệm, một công cụ, một nhật ký, một khoản chi phí.** Nhìn vào là biết khâu nào đang nghẽn, khâu nào tốn tiền.
- **Thay được từng khâu.** Công cụ bên ngoài có thể hỏng hoặc đổi giá; khi đó chỉ thay khâu đó, các khâu khác giữ nguyên.
- **Lọc trước, đo sau.** Chỉ đo tiếp những bài liên quan — vừa đúng, vừa tiết kiệm (trong mô phỏng, chi phí đo giảm khoảng 30%).
- **Người quyết định ở những điểm quan trọng:** duyệt từ khóa, kết luận bài nghi vấn, danh sách chuyển tuyến.

## Bảy khâu

| Khâu | Ai / công cụ | Làm gì | Ghi lại | Vì sao làm thế |
|---|---|---|---|---|
| **1. Trinh sát từ khóa** | Cộng tác viên · Apify (key cá nhân) · trang Quét thử | Thử từ khóa, tìm từ lóng, hashtag mới | Phiếu đề xuất; nhật ký quét thử (không lưu bài) | Thị trường đổi từ ngữ liên tục; người ở địa phương nghe thấy trước |
| **2. Duyệt từ khóa** | Nghiên cứu viên | Xem bài minh chứng và **tỷ lệ bài liên quan** của mẫu, duyệt hoặc từ chối, xếp vào 1 trong 4 nhóm cố định | Danh mục từ khóa | Từ khóa nhiễu làm sai mọi số liệu phía sau; nhóm cố định giữ so sánh được 18 tháng |
| **3. Phát hiện bài** | Hệ thống · **Apify** · hằng ngày | Quét theo từ khóa đã duyệt, tìm bài mới | Bài viết + **lần đo đầu tiên** · lần chạy loại **DISCOVERY** | Apify mạnh ở tìm bài theo hashtag; nỗ lực quét giữ ổn định để số bài mới so sánh được |
| **4. Sàng lọc** | Quy tắc → AI → nghiên cứu viên · trong 24 giờ | Kết luận bài có thật sự về thuốc lá điện tử không | Trạng thái sàng lọc của bài; lịch sử nhãn AI và người | Nhiều bài đúng hashtag nhưng không liên quan; AI làm phần nặng, người kiểm soát |
| **5. Đo biến động** | Hệ thống · **Social Fetch** · theo lịch | Đo lại like, bình luận, chia sẻ, lượt xem, lượt lưu của bài **liên quan** theo link | Một dòng số liệu mỗi lần đo · lần chạy loại **MEASURE**; ngày bài biến mất | Dịch vụ chuyên đo theo link: đơn giản, rẻ, gọi là có ngay; không phải quét lại hashtag |
| **6. Nhiệt kế từ khóa** | Hệ thống · **Social Fetch** · hằng tuần (TikTok) | Đo mức nóng của từng từ khóa ở Việt Nam | Bảng nhiệt kế · lần chạy loại **TREND** | Góc nhìn **độc lập** với mẫu bài, đặt cạnh để đối chiếu |
| **7. Tổng hợp** | Dashboard · dữ liệu phẳng · nghiên cứu viên | Biểu đồ 6 câu hỏi; xuất dữ liệu cho nhóm phân tích; danh sách chuyển tuyến | — | Dashboard để theo dõi; phân tích sâu làm ở hệ thống khác |

## Ba loại lần chạy của hệ thống

Mỗi lần hệ thống gọi công cụ bên ngoài được ghi thành một **lần chạy**, có loại rõ ràng, thời gian, số lượng và **chi phí thật**:

| Loại | Khâu | Công cụ | Tần suất |
|---|---|---|---|
| **DISCOVERY** — Phát hiện | 3 | Apify | Hằng ngày, mỗi từ khóa một lần |
| **MEASURE** — Đo biến động | 5 | Social Fetch (dự phòng: Bright Data, rồi actor Apify) | Hằng ngày, gom các bài đến hạn đo |
| **TREND** — Nhiệt kế | 6 | Social Fetch | Hằng tuần |

**Quét thử** của cộng tác viên (khâu 1) **không** là lần chạy của hệ thống: dùng key cá nhân, không lưu bài, chỉ ghi nhật ký hoạt động.

## Đời của một bài viết (ví dụ)

1. **Ngày 0, 2 giờ sáng:** lần chạy DISCOVERY quét một từ khóa đã duyệt, gặp bài mới → lưu bài và lần đo đầu (số like lúc đó).
2. **Trong 24 giờ:** AI đọc nội dung (đã che số điện thoại, link, tên tài khoản), kết luận *liên quan* / *không liên quan* / *chưa rõ*. Bài *chưa rõ* vào hàng đợi của nghiên cứu viên.
3. **Bài không liên quan:** giữ lại để kiểm chứng, **không đo tiếp**, không tính khi phân tích.
4. **Ngày 3, 7, 14, 30:** lần chạy MEASURE đo lại bài liên quan theo link → thêm dòng số liệu mới (không ghi đè).
5. **Sau 30 ngày:** bài còn tăng → đo hằng tháng; bài đã nguội → chỉ đo trước các đợt phân tích và sau mốc chính sách.
6. **Nếu bài biến mất:** hai lần đo liền không thấy → ghi ngày biến mất, ngừng đo.
7. **Nếu bài tăng mạnh bất thường:** vào danh sách đề xuất chuyển tuyến → **nghiên cứu viên xem 100%** trước khi chuyển.

## Chi phí theo khâu (ước tính, ~800 bài mới/tháng)

| Khâu | Ước tính |
|---|---|
| Phát hiện (Apify) | phụ thuộc số từ khóa và số bài mỗi lần quét — đang đo khi chạy thử |
| Sàng lọc (AI) | dưới 1 USD/tháng |
| Đo biến động (Social Fetch) | khoảng 12–15 USD/tháng |
| Nhiệt kế (Social Fetch) | dưới 2 USD/tháng |

Mỗi lần chạy ghi chi phí thật, nên chi phí từng khâu sẽ được theo dõi trên dashboard quản trị thay cho con số ước tính.

## Đọc chi tiết từng khâu

- Khâu 1–2: [Quét thử](../cong-tac-vien/quet-thu), [Gửi phiếu đề xuất](../cong-tac-vien/de-xuat-hashtag), [Duyệt phiếu](../quan-tri/duyet-de-xuat)
- Khâu 3, 5: [Hai luồng quét](./hai-luong-quet), [Chọn công cụ quét](./chon-cong-cu-quet)
- Khâu 4: [Sàng lọc bài: AI và người](./sang-loc-ai)
- Khâu 6: [Nhiệt kế từ khóa](./chon-cong-cu-quet) (mục "Nhiệt kế")
- Khâu 7: [Câu hỏi nghiên cứu và biểu đồ](./cau-hoi-nghien-cuu), [Dữ liệu phẳng](./du-lieu-phang)
- Giới hạn của toàn bộ quy trình: [Hạn chế của hệ thống](./han-che)
