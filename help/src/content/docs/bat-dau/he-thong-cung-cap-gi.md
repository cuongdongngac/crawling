---
title: "Hệ thống cung cấp gì — việc gì làm ngoài hệ thống"
---

**Hệ thống chỉ làm những việc có quy tắc rõ, lặp lại được và đo được. Việc cần phán đoán chuyên môn thì do con người làm ngoài hệ thống, dùng số liệu hệ thống cung cấp làm đầu vào.** Mỗi đầu ra của hệ thống là đầu vào của một hoạt động có người chịu trách nhiệm.

## Đầu ra của hệ thống và hoạt động tiếp nhận

| Hệ thống cung cấp | Hoạt động ngoài hệ thống | Ai làm | Kết quả quay về hệ thống |
|---|---|---|---|
| Danh mục hashtag, số bài và **tỷ lệ bài liên quan** của từng hashtag | Họp duyệt từ khóa; trinh sát từ lóng mới | Nghiên cứu viên, cộng tác viên | Hashtag được duyệt, hashtag bị tắt |
| Bài đã **sàng lọc**: liên quan / không liên quan / chưa rõ | Không cần — đây là vệ sinh dữ liệu, làm trong hệ thống | AI đọc sơ bộ, nghiên cứu viên chốt | — |
| **Ca nghi ngờ** (3 con mắt, từ 2/3) kèm đường dẫn và đường tăng tương tác | Bản tin cảnh báo, chuyển tuyến | Ban nghiên cứu ký duyệt; điều phối viên tỉnh chuyển | — (việc xử lý thuộc cơ quan chức năng) |
| **Mẫu bài đã che thông tin** (xuất Excel) | **Phiên hội chẩn** định kỳ: gắn nhãn chi tiết, đo đồng thuận người với người (kappa) | Ban nghiên cứu | Quy tắc mới cho bảng mã; từ lóng mới thành phiếu đề xuất |
| Đề 50 bài mô phỏng + **dòng kết quả của AI** | **Buổi hiệu chuẩn** học viên bằng tệp Excel "3 con mắt" | Giảng viên | Ngưỡng được chốt; danh sách học viên đạt chuẩn |
| **Dữ liệu phẳng** + từ điển dữ liệu ([xem](../thiet-ke/du-lieu-phang)) | Phân tích thống kê, báo cáo, bài báo | Nhóm phân tích (R, Stata…) | — |
| **Dashboard tổng quan** | Giao ban, báo cáo nhà tài trợ, hội thảo | Lãnh đạo dự án | — |
| **Nhật ký hoạt động** cộng tác viên | Xét phụ cấp theo chất lượng đề xuất | Điều phối viên tỉnh, Ban nghiên cứu | — |

## Vì sao chia như vậy

1. **Công nghệ không làm thay phán đoán.** "Bài này có nói về thuốc lá điện tử không" có quy tắc rõ. "Bài này nhắm tới giới trẻ không", "sắc thái thế nào" thì còn mập mờ, cần người có chuyên môn bàn với nhau. Việc mập mờ mà giao cho máy thì máy sẽ trả lời rất tự tin, và con số trông chính xác hơn thực tế.
2. **Công cụ đo phải độc lập với thứ bị đo.** Học viên và AI cùng được chấm bằng tệp Excel của giảng viên, không phải bằng hệ thống tự chấm mình. Ai cũng mở công thức ra kiểm được.
3. **Hội chẩn là việc của con người.** Như hội chẩn một ca bệnh: nhiều người cùng xem, kết luận độc lập, đo mức thống nhất bằng kappa, bàn ca vênh, rồi rút ra quy tắc. Hệ thống chỉ chuẩn bị "bệnh án" (mẫu bài đã che thông tin) và lưu kết luận cuối.
4. **Mở rộng bằng dữ liệu, không bằng tính năng.** Muốn thêm một phân tích, một tỉnh hay một đối tác thì chỉ cần thêm một đầu ra hoặc một bảng xuất. Phần lõi của hệ thống không phải xây thêm.

## Trong khâu gắn nhãn: phần nào trong, phần nào ngoài

| Trong hệ thống (quyết định "đo bài nào", "báo bài nào") | Ngoài hệ thống (phiên hội chẩn) |
|---|---|
| Liên quan / không liên quan / chưa rõ | Mục đích chi tiết, loại chủ thể |
| 3 con mắt: hình, chữ, giao dịch → ca nghi ngờ | Sắc thái, nhắm tới giới trẻ |
| Nhóm hành vi 1–4 (mua bán, tàng trữ, vận chuyển, sản xuất – Lab), ngoại lệ Lab báo ngay | Chiến thuật lách, từ lóng mới |
| | Đo đồng thuận người với người |

## Trước khi đưa một việc mới vào hệ thống

Hỏi ba câu:

1. Quy tắc đã rõ đến mức hai người làm độc lập ra cùng kết quả chưa?
2. Kết quả có đo được độ đúng không?
3. Việc đó có cần cho một quyết định thường xuyên không?

Chưa đủ ba câu "có" thì làm ngoài hệ thống bằng dữ liệu xuất ra. Khi việc đã chín — quy tắc rõ, đo được, dùng thường xuyên — mới đưa vào hệ thống.
