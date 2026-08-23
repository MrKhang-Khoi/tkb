/**
 * Điểm khởi chạy Zalo Timetable Bot Server
 * Lệnh chạy: node index.js
 */

const { startZaloBot } = require('./bot-engine');

startZaloBot().catch(err => {
    console.error("❌ Lỗi khi khởi động Zalo Bot:", err);
});
