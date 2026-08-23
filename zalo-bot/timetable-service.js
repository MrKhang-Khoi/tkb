/**
 * Module Dịch Vụ Dữ Liệu Thời Khóa Biểu (Timetable Service)
 * Kết nối Firebase Realtime Database và thực hiện tìm kiếm thông minh
 */

const https = require('https');
const { formatTeacherTimetable, formatClassTimetable, formatHelpMessage } = require('./message-formatter');

const FIREBASE_DATABASE_URL = 'https://tkb-fet-default-rtdb.asia-southeast1.firebasedatabase.app/school_data.json';

// Cache dữ liệu để bot phản hồi tức thì
let cachedData = {
    teachers: [],
    classes: [],
    subjects: [],
    timetable: {},
    weeklyTimetables: [],
    substitutions: [],
    timetableApplyDate: '',
    currentWeekId: '',
    lastUpdated: 0
};

/**
 * Tải toàn bộ dữ liệu thời khóa biểu từ Firebase REST API
 */
async function fetchFirebaseData() {
    return new Promise((resolve, reject) => {
        const url = FIREBASE_DATABASE_URL;
        https.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data) {
                        cachedData = {
                            teachers: data.teachers || [],
                            classes: data.classes || [],
                            subjects: data.subjects || [],
                            timetable: data.timetable || {},
                            weeklyTimetables: data.weeklyTimetables || [],
                            substitutions: data.substitutions || [],
                            timetableApplyDate: data.timetableApplyDate || '',
                            currentWeekId: data.currentWeekId || '',
                            lastUpdated: Date.now()
                        };
                    }
                    resolve(cachedData);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Đảm bảo dữ liệu cache mới nhất (tối đa 30 giây làm mới một lần)
 */
async function ensureFreshData() {
    if (Date.now() - cachedData.lastUpdated > 30000) {
        try {
            await fetchFirebaseData();
        } catch (e) {
            console.warn('[TimetableService] Không thể kết nối Firebase, dùng cache hiện tại:', e.message);
        }
    }
}

/**
 * Loại bỏ dấu tiếng Việt để tìm kiếm không dấu
 */
function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str.toLowerCase().trim();
}

/**
 * Xác định ngày / thứ theo ngữ nghĩa người dùng
 */
function parseDayFilter(keyword) {
    if (!keyword) return null;
    const clean = removeVietnameseTones(keyword);

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday

    if (clean === 'hom nay' || clean === 'hn' || clean === 'today') {
        const map = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };
        return map[dayOfWeek] || 'T2';
    }

    if (clean === 'mai' || clean === 'ngay mai' || clean === 'tomorrow') {
        const nextDay = (dayOfWeek + 1) % 7;
        const map = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };
        return map[nextDay] || 'T2';
    }

    if (clean === 't2' || clean === 'thu 2' || clean === 'thu hai') return 'T2';
    if (clean === 't3' || clean === 'thu 3' || clean === 'thu ba') return 'T3';
    if (clean === 't4' || clean === 'thu 4' || clean === 'thu tu') return 'T4';
    if (clean === 't5' || clean === 'thu 5' || clean === 'thu nam') return 'T5';
    if (clean === 't6' || clean === 'thu 6' || clean === 'thu sau') return 'T6';
    if (clean === 't7' || clean === 'thu 7' || clean === 'thu bay') return 'T7';

    return null;
}

/**
 * Xử lý tin nhắn văn bản từ Zalo và trả lời
 */
async function handleZaloQuery(messageText) {
    await ensureFreshData();

    if (!messageText || typeof messageText !== 'string') {
        return null;
    }

    const text = messageText.trim();
    const cleanText = removeVietnameseTones(text);

    // 1. Trợ giúp
    if (cleanText === 'help' || cleanText === 'giup do' || cleanText === 'huong dan' || cleanText === '?') {
        return formatHelpMessage();
    }

    // 2. Tra cứu Thời khóa biểu (Bắt đầu bằng tkb, thoi khoa bieu, lich day, lich hoc)
    const isTkbCommand = cleanText.startsWith('tkb') || cleanText.startsWith('thoi khoa bieu') || cleanText.startsWith('lich day') || cleanText.startsWith('lich hoc');
    
    if (!isTkbCommand) {
        return null; // Không phải lệnh tra cứu
    }

    // Tách các từ khóa sau tiền tố lệnh
    let queryPart = text;
    if (cleanText.startsWith('thoi khoa bieu')) queryPart = text.substring(14).trim();
    else if (cleanText.startsWith('lich day')) queryPart = text.substring(8).trim();
    else if (cleanText.startsWith('lich hoc')) queryPart = text.substring(8).trim();
    else if (cleanText.startsWith('tkb')) queryPart = text.substring(3).trim();

    if (!queryPart) {
        return `⚠️ Vui lòng nhập thêm tên Giáo viên hoặc Lớp học!\nVí dụ: "tkb Hiển" hoặc "tkb 6A1".\nGõ "help" để xem hướng dẫn.`;
    }

    // Xác định đợt TKB hiện hành
    let activeTimetable = cachedData.timetable;
    let weekName = '';
    let applyDate = cachedData.timetableApplyDate;

    if (cachedData.currentWeekId && cachedData.weeklyTimetables) {
        const wt = cachedData.weeklyTimetables.find(w => w.id === cachedData.currentWeekId);
        if (wt && wt.timetable) {
            activeTimetable = wt.timetable;
            weekName = wt.weekName || '';
            applyDate = wt.applyDate || applyDate;
        }
    }

    const parts = queryPart.split(/\s+/);
    let targetKeyword = parts[0];
    let timeKeyword = parts.slice(1).join(' ');

    // Nếu từ đầu tiên là số lớp ghép (VD: 6A1, 9B2)
    const dayFilter = parseDayFilter(timeKeyword);

    // A. Thử tìm kiếm theo Lớp học trước
    const targetClean = removeVietnameseTones(targetKeyword);
    const matchedClass = cachedData.classes.find(c => c && removeVietnameseTones(c.name) === targetClean);

    if (matchedClass) {
        const classSchedule = activeTimetable[matchedClass.name] || {};
        return formatClassTimetable(matchedClass, classSchedule, {
            dayKey: dayFilter,
            weekName: weekName,
            applyDate: applyDate,
            substitutions: cachedData.substitutions
        });
    }

    // B. Thử tìm kiếm theo Giáo viên (Tìm theo shortName hoặc fullName)
    const fullQueryClean = removeVietnameseTones(queryPart);
    let matchedTeacher = cachedData.teachers.find(t => t && t.shortName && removeVietnameseTones(t.shortName) === targetClean);

    if (!matchedTeacher) {
        // Tìm theo tên đầy đủ
        matchedTeacher = cachedData.teachers.find(t => t && t.fullName && removeVietnameseTones(t.fullName).includes(targetClean));
    }

    if (!matchedTeacher) {
        // Thử tìm theo toàn bộ cụm từ nếu không có bộ lọc ngày
        matchedTeacher = cachedData.teachers.find(t => t && t.fullName && removeVietnameseTones(t.fullName) === fullQueryClean);
    }

    if (matchedTeacher) {
        // Thu thập lịch dạy của GV này ở các lớp sáng và chiều
        const teacherSchedule = { sáng: {}, chiều: {} };
        const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

        cachedData.classes.forEach(c => {
            const session = (c.session || 'sáng').toLowerCase();
            const clsTimetable = activeTimetable[c.name];
            if (clsTimetable) {
                weekdays.forEach(d => {
                    for (let p = 1; p <= 5; p++) {
                        if (clsTimetable[d] && clsTimetable[d][p]) {
                            const slot = clsTimetable[d][p];
                            if (slot.teacher === matchedTeacher.shortName) {
                                if (!teacherSchedule[session][d]) teacherSchedule[session][d] = {};
                                teacherSchedule[session][d][p] = {
                                    subject: slot.subject,
                                    className: c.name
                                };
                            }
                        }
                    }
                });
            }
        });

        return formatTeacherTimetable(matchedTeacher, teacherSchedule, {
            dayKey: dayFilter,
            weekName: weekName,
            applyDate: applyDate,
            substitutions: cachedData.substitutions
        });
    }

    // C. Không tìm thấy đối tượng nào
    return `❌ Không tìm thấy Giáo viên hoặc Lớp học có tên: "${targetKeyword}"\n💡 Mẹo: Bạn hãy nhập đúng Tên viết tắt (VD: "Hiển", "Trọng") hoặc Tên lớp (VD: "6A1", "9B2").`;
}

module.exports = {
    fetchFirebaseData,
    handleZaloQuery,
    removeVietnameseTones,
    parseDayFilter
};
