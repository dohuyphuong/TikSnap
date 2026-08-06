# TikSnap – Specification cho phát triển với AI / model local

## 1. Mục đích tài liệu

Tài liệu này được viết để cả con người và AI agent/local model có thể hiểu đúng yêu cầu, triển khai đúng phạm vi MVP và làm việc hiệu quả mà không cần đoán mò.

Mục tiêu của spec này là:
- giảm ambiguity khi giao task cho model local
- giữ phạm vi MVP rõ ràng
- định nghĩa rõ điều kiện hoàn thành (acceptance criteria)
- giúp việc live coding và incremental implementation diễn ra mạch lạc

---

## 2. Tổng quan sản phẩm

TikSnap là ứng dụng di động giúp người dùng chụp hoặc chọn ảnh, đánh dấu nhanh trên ảnh, thêm ghi chú và lưu/chia sẻ ảnh kết quả.

Mô tả ngắn:
- chụp ảnh → đánh dấu → ghi chú → lưu/share

### Giá trị cốt lõi
- giảm số bước cần thiết để tạo một ảnh có chú thích sẵn
- phù hợp cho việc ghi chú nhanh, đánh dấu vị trí, chia sẻ cho người khác

---

## 3. Scope sản phẩm

### Trong phạm vi MVP
- mở app
- chụp ảnh mới hoặc chọn ảnh từ thư viện
- xem ảnh trong editor
- thêm annotation dạng:
  - điểm
  - khung chữ nhật
  - text note
- xóa annotation
- xem trước ảnh đã chỉnh
- lưu ảnh vào thư viện thiết bị
- thêm watermark
- chia sẻ ảnh

### Không nằm trong MVP
- AI nhận diện vật thể
- chỉnh sửa ảnh nâng cao
- chỉnh sửa nhiều lớp phức tạp
- đồng bộ cloud
- nhiều người cùng chỉnh sửa
- backend riêng

---

## 4. Luồng người dùng chính

### Flow 1: Chụp ảnh mới
1. Mở app
2. Chọn “Chụp ảnh”
3. Chụp ảnh
4. Vào editor
5. Chọn công cụ đánh dấu
6. Thêm note
7. Xem trước ảnh
8. Lưu ảnh
9. Chia sẻ

### Flow 2: Chọn ảnh có sẵn
1. Mở app
2. Chọn “Chọn ảnh”
3. Chọn ảnh từ thư viện
4. Vào editor
5. Thêm note
6. Xem trước ảnh
7. Lưu ảnh

### Flow 3: Chỉnh sửa lại ảnh đã lưu
1. Mở danh sách ảnh gần đây
2. Chọn ảnh cũ
3. Mở editor
4. Chỉnh sửa annotation
5. Lưu lại bản mới

---

## 5. Yêu cầu chức năng

### 5.1 Màn hình Home
Yêu cầu:
- hiển thị nút “Chụp ảnh”
- hiển thị nút “Chọn ảnh”
- hiển thị ảnh gần đây nếu có
- hiển thị nút “Cài đặt”

Acceptance criteria:
- app mở lên thấy màn hình chính
- người dùng có thể tap vào nút chụp ảnh
- người dùng có thể tap vào nút chọn ảnh
- màn hình không bị tràn layout trên màn hình nhỏ

---

### 5.2 Camera Capture
Yêu cầu:
- mở camera từ trong app
- chụp một ảnh mới
- cho phép quay lại nếu không hài lòng
- hỗ trợ flash và đổi camera trước/sau

Acceptance criteria:
- chụp ảnh thành công và trả về ảnh cho editor
- nếu hủy thao tác thì quay về màn hình trước

---

### 5.3 Gallery Picker
Yêu cầu:
- chọn ảnh từ thư viện thiết bị
- hỗ trợ ảnh JPG/PNG
- xử lý trường hợp người dùng hủy chọn ảnh

Acceptance criteria:
- ảnh được chọn và hiển thị đúng trên editor
- trường hợp hủy không crash app

---

### 5.4 Image Editor
Yêu cầu:
- hiển thị ảnh đầy đủ và rõ ràng
- hỗ trợ zoom và pan
- cho phép tạo annotation mới
- cho phép xóa annotation
- cho phép chỉnh sửa text note

Các chế độ annotation:
- Point: tạo dấu chấm tại vị trí được chạm
- Rectangle: kéo khung trên ảnh
- Text: nhập nội dung và đặt note lên ảnh

Acceptance criteria:
- người dùng có thể tạo ít nhất 1 annotation
- annotation hiện đúng vị trí trên ảnh
- xóa annotation hoạt động

---

### 5.5 Save / Export
Yêu cầu:
- tạo ảnh kết quả gồm:
  - ảnh gốc
  - annotation
  - text note
  - watermark
- lưu ảnh vào thư viện thiết bị
- chia sẻ ảnh qua app khác
- hiển thị preview sau khi lưu

Acceptance criteria:
- ảnh được lưu thành công
- ảnh có watermark
- người dùng có thể chia sẻ ảnh ngay sau khi lưu

---

## 6. Yêu cầu phi chức năng

### 6.1 Hiệu năng
- app phải mở nhanh trên thiết bị thông thường
- thao tác annotation không làm giật màn hình nghiêm trọng

### 6.2 Độ ổn định
- không crash khi người dùng hủy chọn ảnh/camera
- xử lý lỗi ảnh và bộ nhớ hợp lý

### 6.3 Khả năng truy cập
- nút bấm đủ lớn
- màu sắc đủ tương phản
- hỗ trợ màn hình nhỏ

### 6.4 Bảo mật và quyền riêng tư
- ảnh chỉ lưu cục bộ nếu chưa có yêu cầu cloud
- không thu thập dữ liệu không cần thiết

---

## 7. Yêu cầu UI/UX

### Nguyên tắc thiết kế
- tối giản
- thao tác 1 tay
- bố cục rõ ràng
- phù hợp cho người dùng mới

### Gợi ý màu sắc
- nền trắng / xám nhạt
- accent xanh dương hoặc xanh teal
- annotation màu đỏ / vàng
- watermark màu xám mờ

### Layout đề xuất
- Home: 2 nút chính lớn ở giữa
- Editor: ảnh chiếm phần lớn màn hình, toolbar ở dưới
- Preview/Save: preview ảnh và 2 nút chính Save/Share

---

## 8. Yêu cầu kỹ thuật

### Stack đề xuất
- Flutter
- Dart
- Riverpod hoặc Bloc
- camera
- image_picker
- image
- path_provider
- share_plus

### Kiến trúc đề xuất
- Presentation layer: màn hình và widget
- Domain layer: use case cho chụp ảnh, note, save, share
- Data layer: repository cho ảnh và annotation

### Cấu trúc thư mục đề xuất
```text
lib/
  core/
    theme/
    constants/
    utils/
  features/
    home/
    camera/
    editor/
    preview/
    history/
  shared/
    widgets/
    models/
    services/
```

---

## 9. Mô hình dữ liệu

### ImageItem
- id
- localPath
- createdAt
- watermarkEnabled
- thumbnailPath (nếu có)

### Annotation
- id
- imageId
- type
- x
- y
- width
- height
- text
- color
- createdAt

### AppSettings
- themeMode
- watermarkEnabled
- defaultAnnotationColor

---

## 10. Quy tắc làm việc hiệu quả với AI / model local

Đây là phần quan trọng nhất để làm việc tốt với local model.

### 10.1 Nguyên tắc khi viết task cho AI
Mỗi task phải có:
- mục tiêu rõ ràng
- input/output rõ ràng
- file hoặc module cần sửa
- điều kiện hoàn thành cụ thể
- cách kiểm tra kết quả

### 10.2 Không nên để model đoán những thứ sau
- không nên để model tự quyết định phạm vi feature mà không có giới hạn
- không nên để model giả định backend, state management hay thư viện mới nếu chưa được chốt
- không nên dùng task quá rộng như “build toàn bộ app”

### 10.3 Task nên nhỏ và có thể kiểm thử
Mỗi task nên tối đa cover 1 màn hình hoặc 1 luồng chức năng rõ ràng.

Ví dụ task tốt:
```text
Task: Tạo màn hình Home cơ bản
Mục tiêu: Hiển thị màn hình Home với 2 nút chính.
Input: Không cần dữ liệu đầu vào.
Output: Một màn hình Flutter có tiêu đề TikSnap, 2 nút Chụp ảnh và Chọn ảnh.
Files cần sửa: lib/features/home/presentation/home_screen.dart
Acceptance criteria:
- màn hình mở được
- có đúng 2 nút chính
- không lỗi compile
- có thể điều hướng sang màn hình tiếp theo
```

### 10.4 Template task chuẩn cho local model
```text
Task: [Tên task]
Mục tiêu: [Mục tiêu ngắn gọn]
Context:
- app đang dùng Flutter
- mục tiêu MVP là [feature cụ thể]
Yêu cầu:
- [item 1]
- [item 2]
- [item 3]
Files cần chạm tới:
- [file 1]
- [file 2]
Constraints:
- không thêm backend
- giữ giao diện tối giản
- không phá vỡ flow hiện tại
Kết quả mong đợi:
- [output 1]
- [output 2]
Acceptance criteria:
- [test case 1]
- [test case 2]
```

---

## 11. Prompt mẫu cho AI coding

### Prompt 1 – Tạo màn hình Home
```text
Tạo màn hình Flutter cho app TikSnap với tiêu đề “TikSnap”. Màn hình có 2 nút lớn: “Chụp ảnh” và “Chọn ảnh”. Khi người dùng bấm vào nút, mở màn hình tiếp theo tương ứng. Thiết kế tối giản, dùng Material 3, màu xanh dương. Chỉ tạo UI cơ bản trước, không cần backend.
```

### Prompt 2 – Tạo editor ảnh cơ bản
```text
Tạo màn hình editor cho TikSnap. Hiển thị ảnh được truyền vào. Thêm toolbar ở dưới với 3 nút: điểm, khung, note. Khi chọn điểm, người dùng có thể tap trên ảnh để tạo marker. Khi chọn khung, cho phép kéo khung. Khi chọn note, cho phép nhập text và đặt lên ảnh. Không cần lưu ảnh ngay, chỉ cần hiển thị annotation trên màn hình.
```

### Prompt 3 – Tạo save và watermark
```text
Thêm chức năng lưu ảnh sau khi người dùng đánh dấu và ghi chú. Tạo ảnh kết quả bằng cách render ảnh gốc + annotation + watermark. Watermark nên đặt góc ảnh, màu xám mờ. Sau khi lưu, hiển thị màn hình preview với nút Share.
```

### Prompt 4 – Tạo task cho model local
```text
Hãy triển khai feature “chọn ảnh từ thư viện” trong app Flutter TikSnap. Chỉ làm phần UI + tích hợp picker cơ bản, không thêm backend. Cần có nút chọn ảnh, xử lý hủy chọn, và chuyển ảnh vào editor. Sau khi hoàn thành, chạy app và kiểm tra flow chính.
```

---

## 12. Kế hoạch triển khai theo sprint

### Sprint 0 – Setup nền tảng
Tasks:
- tạo project Flutter
- cấu hình package cơ bản
- tạo thư mục theo kiến trúc
- tạo theme cơ bản

Done criteria:
- app chạy được trên emulator/device

---

### Sprint 1 – Home + Camera + Gallery
Tasks:
- tạo HomeScreen
- tạo CameraScreen
- tích hợp image picker
- lấy ảnh và chuyển vào preview/editor

Done criteria:
- người dùng có thể chụp ảnh hoặc chọn ảnh

---

### Sprint 2 – Editor cơ bản
Tasks:
- tạo EditorScreen
- hiển thị ảnh
- thêm point annotation
- thêm rectangle annotation

Done criteria:
- người dùng có thể đánh dấu trên ảnh

---

### Sprint 3 – Note và chỉnh sửa
Tasks:
- thêm text note
- sửa note
- xóa note
- chỉnh sửa annotation

Done criteria:
- người dùng có thể ghi chú và xóa lại

---

### Sprint 4 – Save + Watermark + Share
Tasks:
- render ảnh cuối cùng
- chèn watermark
- lưu ảnh vào thư viện
- chia sẻ ảnh

Done criteria:
- flow hoàn chỉnh từ chụp ảnh đến lưu/share

---

### Sprint 5 – Polish và test
Tasks:
- fix bug
- tối ưu UI
- test trên thiết bị thật
- sửa trải nghiệm người dùng

Done criteria:
- bản beta có thể dùng thử

---

## 13. Checklist khi làm việc với AI / local model

### Khi tạo màn hình mới
- [ ] xác định tên file
- [ ] xác định widget chính
- [ ] viết UI cơ bản
- [ ] nối navigation
- [ ] chạy và kiểm tra

### Khi thêm feature mới
- [ ] định nghĩa model/data
- [ ] tạo state management
- [ ] nối vào UI
- [ ] viết test case cơ bản
- [ ] kiểm tra flow chính

### Khi sửa lỗi
- [ ] mô tả bug rõ ràng
- [ ] xác định nguyên nhân
- [ ] sửa tối thiểu
- [ ] thử lại flow chính

### Khi giao task cho model local
- [ ] task đủ nhỏ
- [ ] có acceptance criteria
- [ ] có file cần sửa
- [ ] có constraint rõ ràng
- [ ] có cách kiểm tra

---

## 14. Câu hỏi / assumption cần làm rõ trước khi triển khai

- có cần hỗ trợ nhiều loại annotation hơn không?
- có cần lưu lịch sử ảnh gần đây không?
- có cần hỗ trợ resize/rotate ảnh không?
- watermark sẽ dùng text hay logo?
- có cần lưu annotation theo format riêng không?

---

## 15. Definition of Done cho MVP

MVP được coi là hoàn thành khi:
- người dùng có thể chụp hoặc chọn ảnh
- người dùng có thể thêm điểm/khung/text note
- người dùng có thể lưu ảnh và chia sẻ
- app chạy ổn trên emulator/device gần nhất
- không có lỗi crash nghiêm trọng trong flow chính

---

## 16. Kết luận

Tài liệu này được thiết kế để vừa đủ chi tiết cho con người, vừa đủ rõ ràng cho AI/local model thực hiện từng phần trong vòng lặp phát triển ngắn, kiểm thử nhanh và giảm sai lệch giữa ý tưởng và implementation.
