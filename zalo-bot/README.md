# 🤖 Hướng Dẫn Vận Hành Bot Zalo Tra Cứu Thời Khóa Biểu

Dự án này cho phép bạn biến một **Tài khoản Zalo cá nhân** (hoặc nick phụ của trường) thành một **Trợ Lý Tự Động** phản hồi thời khóa biểu và lịch dạy cho toàn bộ giáo viên và học sinh.

---

## 🌟 1. Tính Năng Nổi Bật

- **Tra cứu thời gian thực (Realtime)**: Kết nối trực tiếp cơ sở dữ liệu Firebase của trường. Khi quản trị viên cập nhật TKB mới hoặc có báo dạy thay, bot lập tức nắm được thông tin.
- **Xử lý ngôn ngữ thông minh**:
  - Tra cứu theo Giáo viên (Tên viết tắt hoặc Họ tên đầy đủ).
  - Tra cứu theo Lớp học (Tự động nhận diện lớp học sáng hay chiều).
  - Hỗ trợ xem: hôm nay, ngày mai, thứ cụ thể (T2 - T7), hoặc cả tuần.
- **Hoạt động linh hoạt**: Hoạt động trong cả **Tin nhắn cá nhân (1-1)** và **Nhóm chat Zalo (Group)**.
- **Hoàn toàn miễn phí 100%**, không tốn chi phí tin nhắn Zalo OA.

---

## 🚀 2. Các Bước Cài Đặt & Chạy Bot

### Bước 1: Mở thư mục Bot trong Terminal / PowerShell
Mở PowerShell tại thư mục `zalo-bot`:
```bash
cd "zalo-bot"
```

### Bước 2: Cài đặt thư viện Zalo API
```bash
npm install
```

### Bước 3: Khởi động Bot
```bash
npm start
```
*(hoặc `node index.js`)*

### Bước 4: Đăng nhập Zalo (Chỉ làm 1 lần duy nhất)
- Khi khởi động lần đầu, màn hình sẽ hiển thị **Mã QR**.
- Dùng ứng dụng Zalo trên điện thoại (tài khoản dùng làm Bot) quét mã QR để xác thực đăng nhập.
- Sau khi đăng nhập thành công, phiên đăng nhập được lưu tự động vào tệp `credentials.json`. Các lần chạy sau bot sẽ **tự động kết nối lại** mà không cần quét lại mã.

---

## 💬 3. Các Cú Pháp Tra Cứu Dành Cho Giáo Viên & Học Sinh

| Cú pháp tin nhắn | Mô tả phản hồi |
| :--- | :--- |
| `tkb [Tên GV]` *(VD: `tkb Hiển`, `tkb Trọng`)* | Xem thời khóa biểu của Giáo viên |
| `tkb [Tên Lớp]` *(VD: `tkb 6A1`, `tkb 9B2`)* | Xem thời khóa biểu của Lớp học |
| `tkb [Tên] hôm nay` *(VD: `tkb Hiển hôm nay`)* | Chỉ xem lịch dạy/học trong ngày hôm nay |
| `tkb [Tên] mai` *(VD: `tkb 6a1 mai`)* | Xem lịch ngày mai để chuẩn bị bài |
| `tkb [Tên] t2` *(hoặc `t3`, `t4`, `t5`, `t6`, `t7`)* | Xem lịch của một thứ cụ thể trong tuần |
| `help` hoặc `giup do` | Hiển thị menu hướng dẫn sử dụng bot |

---

## 🛡️ 4. Khuyến Nghị Vận Hành Ổn Định

1. **Nên dùng tài khoản Zalo riêng**: Tạo một tài khoản Zalo (SIM phụ) đặt tên là *Trợ Lý TKB Nhà Trường* để làm bot. Mời tài khoản này vào các nhóm Zalo của trường/tổ chuyên môn.
2. **Chạy liên tục 24/7**:
   - Bạn có thể chạy bot trên một máy tính để bàn mở liên tục ở văn phòng trường.
   - Hoặc triển khai lên các dịch vụ đám mây miễn phí/giá rẻ (như Render, Railway, Google Cloud Run) để bot hoạt động 24/7 mà không cần bật máy tính.
