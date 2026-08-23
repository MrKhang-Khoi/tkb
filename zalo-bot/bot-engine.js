/**
 * Module Khởi Chạy và Kết Nối Zalo Personal Bot Engine (bot-engine.js)
 * Tích hợp lắng nghe tin nhắn cá nhân / nhóm, tự động kết nối và xử lý lỗi chuyên nghiệp.
 */

const fs = require('fs');
const path = require('path');
const { handleZaloQuery } = require('./timetable-service');

const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (e) {
        console.warn("⚠️ Không thể đọc config.json, sử dụng cấu hình mặc định.");
    }
    return {
        botName: "Trợ Lý Thời Khóa Biểu",
        autoReplyDirect: true,
        autoReplyGroup: true,
        replyDelayMs: 600
    };
}

function showCredentialsGuide() {
    console.log("================================================================================");
    console.log("             🔑 HƯỚNG DẪN CẤU HÌNH ĐĂNG NHẬP ZALO (CHỈ 1 PHÚT)                 ");
    console.log("================================================================================\n");
    console.log("Để Bot Zalo có thể hoạt động ổn định và không bị Zalo chặn, bạn cần lấy Cookie");
    console.log("từ tài khoản Zalo Web theo 3 bước cực kỳ đơn giản sau:\n");
    console.log("👉 Bước 1: Mở trình duyệt (Chrome, Cốc Cốc hoặc Edge) và đăng nhập vào: https://chat.zalo.me");
    console.log("👉 Bước 2: Bấm phím F12 (hoặc bấm chuột phải -> chọn 'Kiểm tra' / 'Inspect')");
    console.log("           Sau đó bấm chọn tab 'Console'.");
    console.log("👉 Bước 3: Dán đoạn mã dưới đây vào Console và bấm Enter:\n");
    console.log("--------------------------------------------------------------------------------");
    console.log(`copy(JSON.stringify({ cookie: document.cookie, imei: localStorage.getItem('z_uuid') || localStorage.getItem('imei') || 'bot-zalo', userAgent: navigator.userAgent }, null, 2)); console.log('%cĐÃ COPY THÀNH CÔNG! Hãy mở file credentials.json và dán (Ctrl+V) vào đó.', 'color: green; font-size: 14px; font-weight: bold;');`);
    console.log("--------------------------------------------------------------------------------\n");
    console.log("👉 Bước 4: Mở file 'credentials.json' trong thư mục zalo-bot, dán (Ctrl+V) rồi Lưu lại.");
    console.log("👉 Bước 5: Chạy lại file Chay_Bot_Zalo.bat là Bot sẽ hoạt động ngay lập tức!\n");
    console.log("================================================================================\n");
}

/**
 * Khởi động Bot Zalo
 */
async function startZaloBot() {
    const config = loadConfig();

    console.log("================================================================================");
    console.log(`             🤖 ${config.botName.toUpperCase()}                     `);
    console.log("================================================================================\n");

    let credentials = null;
    if (fs.existsSync(CREDENTIALS_FILE)) {
        try {
            credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
        } catch (err) {
            console.warn("⚠️ Tệp credentials.json bị lỗi định dạng.");
        }
    }

    if (!credentials || !credentials.cookie || !credentials.imei || !credentials.userAgent || credentials.cookie.trim() === '') {
        showCredentialsGuide();
        
        // Tạo file mẫu nếu chưa có
        if (!fs.existsSync(CREDENTIALS_FILE)) {
            fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify({
                cookie: "",
                imei: "",
                userAgent: ""
            }, null, 2), 'utf8');
        }
        return;
    }

    let ZaloAPI = null;
    try {
        ZaloAPI = require('zca-js');
    } catch (e) {
        console.error("❌ Không tìm thấy thư viện zca-js. Vui lòng chạy 'npm install' trong thư mục zalo-bot.");
        return;
    }

    try {
        console.log("🔄 Đang kết nối tới máy chủ Zalo...");
        const zalo = new ZaloAPI.Zalo(credentials, {
            selfListen: false,
            checkUpdate: false
        });

        const api = await zalo.login();
        console.log("\n================================================================================");
        console.log("✅ [ZaloBot] ĐĂNG NHẬP ZALO THÀNH CÔNG!");
        console.log(`👤 Tên Bot: ${config.botName}`);
        console.log("📡 Đang trực 24/7 và lắng nghe tin nhắn tra cứu TKB từ giáo viên & học sinh...");
        console.log("================================================================================\n");

        // Lắng nghe sự kiện tin nhắn đến
        api.listener.on('message', async (msg) => {
            try {
                const messageText = msg.data ? msg.data.content : '';
                const senderId = msg.data ? msg.data.uidFrom : '';
                const threadId = msg.threadId || senderId;
                const isGroup = !!(msg.data && msg.data.idTo && msg.data.idTo !== senderId);

                if (!messageText) return;

                // Kiểm tra cấu hình bật/tắt phản hồi nhóm hoặc cá nhân
                if (isGroup && config.autoReplyGroup === false) return;
                if (!isGroup && config.autoReplyDirect === false) return;

                console.log(`📩 [Nhận tin nhắn] Từ: ${senderId} | Nội dung: "${messageText}"`);

                // Phân tích và tìm kết quả TKB
                const replyText = await handleZaloQuery(messageText);

                if (replyText) {
                    const delay = config.replyDelayMs || 600;
                    await new Promise(r => setTimeout(r, delay));

                    await api.sendMessage({
                        msg: replyText,
                        quote: msg
                    }, threadId);

                    console.log(`📤 [Đã phản hồi TKB] Đến: ${threadId}\n`);
                }
            } catch (err) {
                console.error("❌ [Lỗi phản hồi tin nhắn]:", err.message);
            }
        });

        api.listener.start();

    } catch (err) {
        console.error("\n❌ Đăng nhập Zalo không thành công:", err.message);
        console.log("💡 Có thể Cookie đã hết hạn. Bạn hãy làm theo hướng dẫn bên dưới để lấy Cookie mới:\n");
        showCredentialsGuide();
    }
}

module.exports = {
    startZaloBot
};
