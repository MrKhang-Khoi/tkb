/**
 * Module Định dạng Tin Nhắn Zalo Phản Hồi (Message Formatter)
 * Tạo văn bản phản hồi tra cứu TKB có cấu trúc rõ ràng, icon sinh động và dễ đọc trên Zalo.
 */

const WEEKDAY_NAMES = {
    'T2': 'Thứ 2',
    'T3': 'Thứ 3',
    'T4': 'Thứ 4',
    'T5': 'Thứ 5',
    'T6': 'Thứ 6',
    'T7': 'Thứ 7'
};

/**
 * Định dạng lịch dạy của Giáo viên
 */
function formatTeacherTimetable(teacherObj, scheduleData, options = {}) {
    const { dayKey, weekName, applyDate, substitutions = [] } = options;
    const weekdays = dayKey ? [dayKey] : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    let text = `╔══════════════════════════╗\n`;
    text += `   📅 THỜI KHÓA BIỂU GIÁO VIÊN\n`;
    text += `╚══════════════════════════╝\n`;
    text += `👤 Giáo viên: ${teacherObj.fullName} (${teacherObj.shortName})\n`;
    if (teacherObj.position) text += `🎖️ Chức vụ: ${teacherObj.position}\n`;
    if (weekName) text += `📌 Đợt áp dụng: ${weekName} ${applyDate ? `(từ ${applyDate})` : ''}\n`;
    text += `────────────────────────────\n`;

    let hasAnyPeriod = false;

    weekdays.forEach(day => {
        const dayLabel = WEEKDAY_NAMES[day] || day;
        const morningSlots = [];
        const afternoonSlots = [];

        // Lọc các tiết trong ngày của GV
        for (let p = 1; p <= 5; p++) {
            // Sáng
            if (scheduleData.sáng && scheduleData.sáng[day] && scheduleData.sáng[day][p]) {
                const act = scheduleData.sáng[day][p];
                morningSlots.push({ period: p, subject: act.subject, className: act.className });
            }
            // Chiều
            if (scheduleData.chiều && scheduleData.chiều[day] && scheduleData.chiều[day][p]) {
                const act = scheduleData.chiều[day][p];
                afternoonSlots.push({ period: p, subject: act.subject, className: act.className });
            }
        }

        if (morningSlots.length > 0 || afternoonSlots.length > 0) {
            hasAnyPeriod = true;
            text += `\n🗓️ 【 ${dayLabel.toUpperCase()} 】\n`;

            if (morningSlots.length > 0) {
                text += `  🌅 Buổi Sáng:\n`;
                morningSlots.forEach(s => {
                    text += `    • Tiết ${s.period}: ${s.subject} (Lớp ${s.className})\n`;
                });
            }

            if (afternoonSlots.length > 0) {
                text += `  🌇 Buổi Chiều:\n`;
                afternoonSlots.forEach(s => {
                    text += `    • Tiết ${s.period}: ${s.subject} (Lớp ${s.className})\n`;
                });
            }
        }
    });

    if (!hasAnyPeriod) {
        text += `\n🌴 Không có tiết dạy nào trong thời gian tra cứu.\n`;
    }

    text += `\n────────────────────────────\n`;
    text += `💡 Gõ "tkb [tên] [thứ/hôm nay/mai]" để xem chi tiết từng ngày.`;
    return text;
}

/**
 * Định dạng lịch học của Lớp
 */
function formatClassTimetable(classObj, scheduleData, options = {}) {
    const { dayKey, weekName, applyDate, substitutions = [] } = options;
    const weekdays = dayKey ? [dayKey] : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const session = (classObj.session || 'sáng').toLowerCase();

    let text = `╔══════════════════════════╗\n`;
    text += `   🏫 THỜI KHÓA BIỂU LỚP HỌC\n`;
    text += `╚══════════════════════════╝\n`;
    text += `📚 Lớp: ${classObj.name} (Buổi ${session === 'chiều' ? 'Chiều' : 'Sáng'})\n`;
    if (classObj.gvcn) text += `👨‍🏫 GVCN: ${classObj.gvcn}\n`;
    if (weekName) text += `📌 Đợt áp dụng: ${weekName} ${applyDate ? `(từ ${applyDate})` : ''}\n`;
    text += `────────────────────────────\n`;

    let hasAnyPeriod = false;

    weekdays.forEach(day => {
        const dayLabel = WEEKDAY_NAMES[day] || day;
        const slots = [];

        for (let p = 1; p <= 5; p++) {
            if (scheduleData[day] && scheduleData[day][p]) {
                slots.push({ period: p, ...scheduleData[day][p] });
            }
        }

        if (slots.length > 0) {
            hasAnyPeriod = true;
            text += `\n🗓️ 【 ${dayLabel.toUpperCase()} 】\n`;
            slots.forEach(s => {
                const teacherStr = s.teacher ? ` - GV: ${s.teacher}` : '';
                text += `  • Tiết ${s.period}: ${s.subject}${teacherStr}\n`;
            });
        }
    });

    if (!hasAnyPeriod) {
        text += `\n🌴 Chưa có dữ liệu thời khóa biểu cho lớp này.\n`;
    }

    text += `\n────────────────────────────\n`;
    text += `💡 Gõ "tkb ${classObj.name} [thứ/mai]" để xem ngày cụ thể.`;
    return text;
}

/**
 * Tin nhắn Hướng dẫn trợ giúp
 */
function formatHelpMessage() {
    return `╔══════════════════════════╗
   🤖 TRỢ LÝ TRA CỨU TKB TRƯỜNG
╚══════════════════════════╝
Hệ thống tự động tra cứu TKB chính thức & phân công dạy thay.

📌 CÁC CÚ PHÁP TRA CỨU NHANH:
1. Tra cứu theo Giáo viên:
   • tkb [Tên GV] -> Xem lịch cả tuần
   • tkb [Tên GV] hôm nay -> Lịch dạy hôm nay
   • tkb [Tên GV] mai -> Lịch dạy ngày mai
   • tkb [Tên GV] t2 (t3, t4, t5, t6, t7) -> Lịch thứ cụ thể
   👉 Ví dụ: "tkb Hiển", "tkb Trọng mai", "tkb Mai t3"

2. Tra cứu theo Lớp học:
   • tkb [Tên Lớp] -> Xem TKB cả tuần của lớp
   • tkb [Tên Lớp] mai -> Lịch học ngày mai của lớp
   👉 Ví dụ: "tkb 6a1", "tkb 9b2 mai", "tkb 7A1 t4"

3. Hỗ trợ khác:
   • help hoặc giup do -> Xem hướng dẫn này

────────────────────────────
✨ Dữ liệu được đồng bộ trực tiếp từ hệ thống TKB nhà trường.`;
}

module.exports = {
    formatTeacherTimetable,
    formatClassTimetable,
    formatHelpMessage
};
