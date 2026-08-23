# 🚀 Hướng Dẫn Thiết Lập Google Apps Script (Zalo TKB Cloud Server 24/7)

Đây là giải pháp chạy Bot tra cứu TKB hoàn toàn trên **Google Cloud (Miễn phí 100%)**, không cần cài đặt Node.js hay mở máy tính.

---

## 🌟 1. Cách Thiết Lập Trên Google Drive (Chỉ 2 Phút)

1. Mở trình duyệt và truy cập: **[https://script.google.com](https://script.google.com)** (Đăng nhập bằng tài khoản Google bất kỳ của bạn).
2. Bấm vào nút **[+ Dự án mới / New project]**.
3. Xóa hết code mặc định trong file `Code.gs` và **Dán toàn bộ nội dung từ file `google-apps-script/Code.gs`** vào đó.
4. Bấm biểu tượng **💾 Lưu dự án (Save)**.
5. Bấm nút **[Triển khai / Deploy]** ở góc trên bên phải $\rightarrow$ Chọn **[Tùy chọn triển khai mới / New deployment]**:
   - Chọn loại: **Ứng dụng web (Web app)**.
   - Mô tả: `Zalo TKB Bot`.
   - Thực thi dưới dạng (Execute as): **Tôi (Me)**.
   - Ai có quyền truy cập (Who has access): **Bất kỳ ai (Anyone)**.
6. Bấm **[Triển khai / Deploy]** $\rightarrow$ Cấp quyền truy cập Google nếu được hỏi.
7. Bạn sẽ nhận được một đường link **URL của ứng dụng web** có dạng:
   👉 `https://script.google.com/macros/s/AKfycb.../exec`

---

## 💬 2. Cách Sử Dụng & Kiểm Tra

- **Kiểm tra trực tiếp trên trình duyệt**:
  Mở đường link: `URL_CUA_BAN?query=tkb Trọng` hoặc `URL_CUA_BAN?query=tkb 6a1` $\rightarrow$ Trình duyệt sẽ hiển thị ngay kết quả tra cứu TKB!
- **Tích hợp vào Zalo OA / Chatbot platform (Fchat, Ahachat...)**:
  Dán link `URL_CUA_BAN` vào mục Webhook của nền tảng Chatbot $\rightarrow$ Mỗi khi có người nhắn tin trên Zalo, hệ thống sẽ tự động trả lời 24/7!
