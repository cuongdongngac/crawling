# Quét thử từ khóa

Trang **Quét thử** giúp bạn xem nhanh một từ khóa/hashtag đang có những bài nào, bài nào tương tác cao, và **hashtag nào hay đi kèm** — nguồn chính để phát hiện từ lóng mới.

::: info Dữ liệu không vào kho
Kết quả chỉ hiện trên màn hình của bạn và trong file Excel bạn xuất. Bài không được lưu vào kho dữ liệu chính thức.
:::

## 1. Nhập thông tin quét

| Ô | Cách điền |
|---|---|
| **Nền tảng / công cụ** | *TikTok – quét theo hashtag* hoặc *Facebook – tìm bài theo từ khóa/hashtag* |
| **API key Apify của bạn** | Xem [Lấy API key Apify](./api-key-apify) |
| **Từ khóa / hashtag** | Mỗi dòng một từ, hoặc cách nhau bằng dấu phẩy. Tối đa 20 từ; mỗi từ là một lần quét riêng. TikTok: viết liền không dấu cách (`vapegiare`), có hay không dấu `#` đều được. |
| **Số bài tối đa mỗi từ khóa** | Để vừa phải (vài chục) cho rẻ và nhanh. |
| **Thứ tự, Từ ngày, Đến ngày** | Chỉ có với Facebook: *Nổi bật* hoặc *Mới nhất*, lọc theo khoảng ngày. |

Bấm **Bắt đầu quét**. Dòng chữ bên cạnh cho biết **ước tính chi phí tối đa** trên tài khoản Apify của bạn.

::: tip Dùng từ tiếng Việt
Từ khóa tiếng Anh (như “vape”) trả về chủ yếu nội dung nước ngoài. Hãy dùng từ lóng, hashtag tiếng Việt mà giới trẻ đang dùng.
:::

## 2. Theo dõi tiến độ

- Mỗi từ khóa hiện trạng thái: *Đang quét*, *Đã xong*, *Đã dừng*…
- Bạn **có thể tắt màn hình hoặc chuyển ứng dụng**; mở lại là tiếp tục theo dõi.
- Muốn dừng sớm: bấm **Dừng** — bài đã lấy được vẫn giữ lại.
- Khi mọi từ khóa xong, kết quả **tự tải về** một lần.

::: details Đã chạy công cụ trực tiếp trên Apify?
Mở mục **“Đã chạy trên Apify? Dán mã lần quét để xem kết quả tại đây”**, chọn đúng công cụ ở trên, dán mã lần quét (hoặc đường dẫn `console.apify.com/.../runs/...`) rồi bấm **Thêm**.
:::

## 3. Đọc kết quả

**Số liệu tổng**: tổng số bài, số bài tiếng Việt, tổng lượt xem/tương tác…

**Bộ lọc và sắp xếp**
- Ngôn ngữ: *Chỉ tiếng Việt*, *Tiếng Việt + chưa rõ ngôn ngữ*, *Tất cả ngôn ngữ*.
- Từ khóa: xem riêng từng từ hoặc *Mọi từ khóa*.
- Sắp xếp: *Tương tác cao nhất (like + bình luận + chia sẻ)*, *Nhiều like / bình luận / chia sẻ / lượt xem nhất*, *Mới đăng nhất*.
- Ô tìm kiếm trong nội dung bài.

**Tab Hashtag đi kèm** — các hashtag xuất hiện cùng trong những bài đang lọc, kèm nhãn:
- **Mới**: chưa có trong danh mục của dự án → *ứng viên để đề xuất*.
- **Đã có trong danh mục**, **Đang quét**: dự án đã biết.

Thấy hashtag **Mới** đáng chú ý → bấm **Đề xuất** (xem [Gửi phiếu đề xuất](./de-xuat-hashtag)).

## 4. Xuất Excel

Bấm **Xuất Excel** để tải file gồm 3 trang: **Bài viết**, **Hashtag đi kèm**, **Thông tin** (bộ lọc khi xuất, thời điểm xuất). File xuất **đúng tập bài đang lọc** và **không có tên tài khoản** người đăng — chỉ có mã tác giả đã mã hoá.
