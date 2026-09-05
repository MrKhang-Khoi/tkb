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

function normToken(str) {
    return removeVietnameseTones(str).replace(/[^a-z0-9]/g, '');
}

/**
 * Thuật toán tìm Lớp học chuẩn xác, chống va chạm 6A10 -> 6A1
 */
function findMatchingClass(query, classes) {
    if (!query || !classes || classes.length === 0) return null;
    const raw = query.trim();
    const clean = removeVietnameseTones(raw);

    let target = raw;
    let cleanTarget = clean;
    const prefixes = ['thoi khoa bieu', 'lich day', 'lich hoc', 'xem tkb', 'in tkb', 'tkb', 'lop'];
    let matchedPrefix = true;
    while (matchedPrefix) {
        matchedPrefix = false;
        for (let i = 0; i < prefixes.length; i++) {
            const p = prefixes[i];
            if (cleanTarget === p) {
                target = '';
                cleanTarget = '';
                matchedPrefix = true;
                break;
            } else if (cleanTarget.startsWith(p + ' ')) {
                target = target.substring(p.length).trim();
                cleanTarget = cleanTarget.substring(p.length).trim();
                matchedPrefix = true;
                break;
            }
        }
    }

    cleanTarget = cleanTarget.replace(/(?:^|[^a-z0-9])(hom nay|hn|today|ngay mai|mai|tomorrow|thu \d|t\d|thu hai|thu ba|thu tu|thu nam|thu sau|thu bay)(?:[^a-z0-9]|$)/g, ' ').trim();
    const targetToken = normToken(cleanTarget);
    const sortedClasses = classes.slice().sort((a, b) => (b.name || '').length - (a.name || '').length);

    // 1. Khớp chính xác hoàn toàn token
    if (targetToken) {
        for (let i = 0; i < sortedClasses.length; i++) {
            const c = sortedClasses[i];
            if (c && normToken(c.name) === targetToken) {
                return c;
            }
        }
    }

    // 2. Khớp token trong câu
    const queryTokens = clean.split(/[^a-z0-9]+/).filter(Boolean);
    for (let i = 0; i < sortedClasses.length; i++) {
        const c = sortedClasses[i];
        if (c && queryTokens.indexOf(removeVietnameseTones(c.name)) !== -1) {
            return c;
        }
    }

    // 3. Khớp regex có ranh giới từ (chống 6a10 dính 6a1)
    for (let i = 0; i < sortedClasses.length; i++) {
        const c = sortedClasses[i];
        if (c && c.name) {
            const cClean = removeVietnameseTones(c.name);
            const regex = new RegExp('(?:^|[^a-z0-9])' + cClean + '(?:[^a-z0-9]|$)', 'i');
            if (regex.test(clean)) {
                return c;
            }
        }
    }

    return null;
}

/**
 * Thuật toán tìm Giáo viên chuẩn xác, chống va chạm P.Thúy -> Thu
 */
function findMatchingTeacher(rawQuery, teachers) {
    if (!rawQuery || !teachers || teachers.length === 0) return null;
    const text = rawQuery.trim();
    const clean = removeVietnameseTones(text);
    
    let target = text;
    let cleanTarget = clean;
    const prefixes = ['thoi khoa bieu', 'lich day', 'lich hoc', 'xem tkb', 'in tkb', 'tkb', 'thay', 'co', 'gv'];
    let matchedPrefixT = true;
    while (matchedPrefixT) {
        matchedPrefixT = false;
        for (let i = 0; i < prefixes.length; i++) {
            const p = prefixes[i];
            if (cleanTarget === p) {
                target = '';
                cleanTarget = '';
                matchedPrefixT = true;
                break;
            } else if (cleanTarget.startsWith(p + ' ')) {
                target = target.substring(p.length).trim();
                cleanTarget = cleanTarget.substring(p.length).trim();
                matchedPrefixT = true;
                break;
            }
        }
    }

    cleanTarget = cleanTarget.replace(/(?:^|[^a-z0-9])(hom nay|hn|today|ngay mai|mai|tomorrow|thu \d|t\d|thu hai|thu ba|thu tu|thu nam|thu sau|thu bay)(?:[^a-z0-9]|$)/g, ' ').trim();
    const targetToken = normToken(cleanTarget);

    // 1. Khớp chính xác shortName giữ nguyên dấu
    for (let i = 0; i < teachers.length; i++) {
        const t = teachers[i];
        if (t && t.shortName && t.shortName.toLowerCase() === target.toLowerCase()) {
            return t;
        }
    }

    // 2. Khớp chính xác fullName giữ nguyên dấu
    for (let i = 0; i < teachers.length; i++) {
        const t = teachers[i];
        if (t && t.fullName && t.fullName.toLowerCase() === target.toLowerCase()) {
            return t;
        }
    }

    // 3. Khớp token chuẩn hóa (p.thuy -> pthuy, thu -> thu, t.thuy -> tthuy)
    if (targetToken) {
        const shortMatches = teachers.filter(t => t && t.shortName && normToken(t.shortName) === targetToken);
        if (shortMatches.length === 1) return shortMatches[0];
        if (shortMatches.length > 1) {
            const exactAcc = shortMatches.find(t => t.shortName.toLowerCase() === target.toLowerCase());
            if (exactAcc) return exactAcc;
            return shortMatches[0];
        }

        const fullMatches = teachers.filter(t => t && t.fullName && normToken(t.fullName) === targetToken);
        if (fullMatches.length === 1) return fullMatches[0];
        if (fullMatches.length > 1) {
            const exactAcc = fullMatches.find(t => t.fullName.toLowerCase() === target.toLowerCase());
            if (exactAcc) return exactAcc;
            return fullMatches[0];
        }
    }

    // 4. Khớp shortName với ranh giới từ trong câu (Sắp xếp độ dài shortName giảm dần)
    const sortedByShort = teachers.slice().sort((a, b) => (b.shortName || '').length - (a.shortName || '').length);
    for (let i = 0; i < sortedByShort.length; i++) {
        const t = sortedByShort[i];
        if (!t || !t.shortName) continue;
        const sClean = removeVietnameseTones(t.shortName);
        const sPattern = sClean.replace(/\./g, '[._\\s]?');
        const regex = new RegExp('(?:^|[^a-z0-9])' + sPattern + '(?:[^a-z0-9]|$)', 'i');
        if (regex.test(clean)) {
            return t;
        }
    }

    // 5. Khớp fullName với ranh giới từ
    const sortedByFull = teachers.slice().sort((a, b) => (b.fullName || '').length - (a.fullName || '').length);
    for (let i = 0; i < sortedByFull.length; i++) {
        const t = sortedByFull[i];
        if (!t || !t.fullName) continue;
        const fClean = removeVietnameseTones(t.fullName);
        if (fClean.length >= 4) {
            const regex = new RegExp('(?:^|[^a-z0-9])' + fClean.replace(/\s+/g, '\\s+') + '(?:[^a-z0-9]|$)', 'i');
            if (regex.test(clean)) {
                return t;
            }
        }
    }

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

    // Kiểm tra xem có khớp với Lớp học hoặc Giáo viên không (hỗ trợ cả gõ trực tiếp tên lớp 6A10 hoặc P.Thúy)
    const matchedClass = findMatchingClass(text, cachedData.classes);
    const matchedTeacher = findMatchingTeacher(text, cachedData.teachers);

    // 2. Tra cứu Thời khóa biểu (Bắt đầu bằng tkb, thoi khoa bieu, lich day, lich hoc hoặc trực tiếp Lớp/GV)
    const isTkbCommand = cleanText.startsWith('tkb') || cleanText.startsWith('thoi khoa bieu') || cleanText.startsWith('lich day') || cleanText.startsWith('lich hoc');
    
    if (!isTkbCommand && !matchedClass && !matchedTeacher) {
        return null; // Không phải lệnh tra cứu và không khớp đối tượng nào
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

    const dayFilter = parseDayFilter(cleanText);

    // A. Thử xử lý theo Lớp học trước (chính xác 100%, 6A10 không ra 6A1)
    if (matchedClass) {
        const classSchedule = activeTimetable[matchedClass.name] || {};
        return formatClassTimetable(matchedClass, classSchedule, {
            dayKey: dayFilter,
            weekName: weekName,
            applyDate: applyDate,
            substitutions: cachedData.substitutions
        });
    }

    // B. Thử xử lý theo Giáo viên (chính xác 100%, P.Thúy không ra Thu)
    if (matchedTeacher) {
        const teacherSchedule = { 'sáng': {}, 'chiều': {} };
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
    return `❌ Không tìm thấy Giáo viên hoặc Lớp học phù hợp.\n💡 Mẹo: Bạn hãy nhập đúng Tên viết tắt (VD: "P.Thúy", "Thu", "Trọng") hoặc Tên lớp (VD: "6A10", "6A1", "9B2").`;
}

module.exports = {
    fetchFirebaseData,
    handleZaloQuery,
    removeVietnameseTones,
    parseDayFilter
};
