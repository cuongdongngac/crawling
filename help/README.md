# Trang trợ giúp (VitePress)

- Mục `thiet-ke/` là **kênh trao đổi thiết kế tạm thời** (ý tưởng, trạng thái, hạn chế) — rút gọn/xóa khi hệ thống ổn định: xóa thư mục + nhóm "4. Thiết kế…" trong sidebar + mục nav "Thiết kế (tạm thời)" + link trong `quan-tri/quet-chinh-thuc.md`.
- Viết bài: thêm file `.md` vào `bat-dau/`, `cong-tac-vien/`, `quan-tri/`, rồi thêm một dòng vào `sidebar` trong `.vitepress/config.mts`.
- Xem thử khi viết: `npm run help:dev` → http://localhost:5173/help/
- Build: `npm run help:build` (xuất ra `public/help`, đã nằm trong `npm run build` nên Vercel tự build).
- Ảnh chụp màn hình: đặt trong `help/public/images/`, chèn `![Mô tả](/images/ten-anh.png)`.
- Liên kết từ ứng dụng: dùng component `HelpLink` (`src/components/HelpLink.tsx`) với đường dẫn bài, ví dụ `cong-tac-vien/quet-thu`.
- Trang trợ giúp công khai (không cần đăng nhập): không đưa danh mục từ khóa, khóa API hay dữ liệu bài vào đây.

## Ảnh minh hoạ

### Thư mục
Ảnh chung đặt trong `help/public/images/`, chia thư mục con **trùng tên nhóm bài**:

```
help/public/images/
├── bat-dau/         ảnh cho các bài trong help/bat-dau/
├── cong-tac-vien/   ảnh cho các bài trong help/cong-tac-vien/
└── quan-tri/        ảnh cho các bài trong help/quan-tri/
```

### Đặt tên
`<tên-bài>-<số thứ tự 2 chữ số>-<mô-tả-ngắn>[-mobile].png`

- `<tên-bài>` = tên file .md của bài (bỏ `.md`) → nhìn tên ảnh là biết thuộc bài nào.
- Số thứ tự = thứ tự xuất hiện trong bài (01, 02…) → chèn thêm ảnh giữa chừng thì dùng 02a, không cần đổi tên ảnh khác.
- Mô tả: chữ thường, không dấu, nối bằng gạch ngang.
- Thêm `-mobile` nếu chụp khung điện thoại (rộng ~390px); không có = chụp máy tính (rộng ~1280px).
- Định dạng `.png` (ảnh màn hình). Mỗi ảnh nên dưới 300 KB.

Ví dụ: `cong-tac-vien/quet-thu-05-tab-hashtag-di-kem-mobile.png` → bài *Quét thử*, ảnh thứ 5, chụp trên điện thoại.

### Chèn vào bài
```md
![Tab Hashtag đi kèm](/images/cong-tac-vien/quet-thu-05-tab-hashtag-di-kem-mobile.png)
<p class="img-caption">Hình 5: Hashtag “Mới” là ứng viên để đề xuất</p>
```
(Đường dẫn bắt đầu bằng `/images/…`; VitePress tự thêm `/help/`.)

### An toàn khi chụp
- Chỉ chụp với **dữ liệu mẫu**; che tên tài khoản, ảnh đại diện, nội dung bài thật.
- **Không để lộ API key** (ô key phải để trống hoặc đã che).
- Không chụp danh mục từ khoá đang quét — trang trợ giúp là công khai.

### Danh sách ảnh cần chụp
| Bài | Tên ảnh (trong `images/<nhóm>/`) | Nội dung |
|---|---|---|
| bat-dau/cai-ung-dung | `cai-ung-dung-01-android-nut-cai-mobile.png` | Nút “Cài ứng dụng” trên thanh đầu trang |
| | `cai-ung-dung-02-android-hop-thoai-mobile.png` | Hộp thoại cài của Android |
| | `cai-ung-dung-03-iphone-nut-chia-se-mobile.png` | Nút Chia sẻ trong Safari |
| | `cai-ung-dung-04-iphone-them-vao-mh-chinh-mobile.png` | Mục “Thêm vào MH chính” |
| | `cai-ung-dung-05-bieu-tuong-mobile.png` | Biểu tượng VPHA Quét trên màn hình chính |
| cong-tac-vien/api-key-apify | `api-key-apify-01-trang-integrations.png` | Apify Console → API & Integrations (che key) |
| cong-tac-vien/quet-thu | `quet-thu-01-form-nhap-mobile.png` | Form: công cụ, key (trống), từ khoá, số bài |
| | `quet-thu-02-tien-do-mobile.png` | Tiến độ từng từ khoá, nút Dừng |
| | `quet-thu-03-so-lieu-tong-mobile.png` | Ô số liệu tổng |
| | `quet-thu-04-bo-loc-sap-xep-mobile.png` | Bộ lọc ngôn ngữ, từ khoá, sắp xếp |
| | `quet-thu-05-tab-hashtag-di-kem-mobile.png` | Tab Hashtag đi kèm với nhãn Mới / Đã có |
| | `quet-thu-06-xuat-excel.png` | File Excel 3 trang sau khi xuất |
| cong-tac-vien/de-xuat-hashtag | `de-xuat-hashtag-01-nut-de-xuat-mobile.png` | Nút Đề xuất cạnh hashtag Mới |
| | `de-xuat-hashtag-02-phieu-mobile.png` | Phiếu: bài minh chứng, ba tiêu chí, nghĩa |
| | `de-xuat-hashtag-03-trang-thai-mobile.png` | Danh sách phiếu và trạng thái |
| quan-tri/cau-hinh | `cau-hinh-01-khoa-apify.png` | Khối Apify + kết quả Kiểm tra |
| | `cau-hinh-02-khoa-openrouter.png` | Khối OpenRouter + hạn mức |
| | `cau-hinh-03-chon-model.png` | Danh sách chọn model |
| | `cau-hinh-04-chinh-sach-ai.png` | Tự gắn nhãn + trần chi phí |
| quan-tri/duyet-de-xuat | `duyet-de-xuat-01-danh-sach.png` | Danh sách phiếu cần duyệt |
| | `duyet-de-xuat-02-quyet-dinh.png` | Ô lý do + các nút quyết định |
