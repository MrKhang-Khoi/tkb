/**
 * TOOL KIỂM ĐỊNH RÀNG BUỘC THỜI KHÓA BIỂU FET & XUẤT BÁO CÁO NGÀY NGHỈ
 * Trường THCS - Hệ Thống Xếp Thời Khóa Biểu
 * 
 * Cách dùng:
 *   node tool_kiem_tra_fet.js [duong_dan_file.fet]
 *   (Mặc định: file THCS_TKB_FET_Project_V13_data_and_timetable.fet)
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('./lib/xlsx.full.min.js');

// 1. Xác định tệp đầu vào
const args = process.argv.slice(2);
let targetFetFile = args[0];

if (!targetFetFile) {
  const candidates = [
    'THCS_TKB_FET_Project_V13_data_and_timetable.fet',
    'THCS_TKB_FET_Project_V12_data_and_timetable.fet',
    'THCS_TKB_FET_Project_V13.fet',
    'THCS_TKB_FET_Project_V12.fet'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      targetFetFile = c;
      break;
    }
  }
}

if (!targetFetFile || !fs.existsSync(targetFetFile)) {
  console.error('❌ Không tìm thấy tệp FET để kiểm tra! Vui lòng chỉ định đường dẫn: node tool_kiem_tra_fet.js [file.fet]');
  process.exit(1);
}

console.log('========================================================================');
console.log('🔍 BẮT ĐẦU KIỂM ĐỊNH THỜI KHÓA BIỂU FET:', targetFetFile);
console.log('========================================================================\n');

const fetContent = fs.readFileSync(targetFetFile, 'utf8');

// 2. Phân tích cấu hình Phòng & Điểm trường
const roomsMatch = fetContent.match(/<Rooms_List>([\s\S]*?)<\/Rooms_List>/);
const roomToBuilding = {};
if (roomsMatch) {
  (roomsMatch[1].match(/<Room>[\s\S]*?<\/Room>/g) || []).forEach(r => {
    const n = (r.match(/<Name>(.*?)<\/Name>/) || [])[1];
    const b = (r.match(/<Building>(.*?)<\/Building>/) || [])[1];
    if (n && b) roomToBuilding[n] = b;
  });
}

// Gán lớp với Điểm trường thông qua HomeRoom
const homeRooms = fetContent.match(/<ConstraintStudentsSetHomeRoom>[\s\S]*?<\/ConstraintStudentsSetHomeRoom>/g) || [];
const classToBuilding = {};
homeRooms.forEach(hr => {
  const cls = (hr.match(/<Students>(.*?)<\/Students>/) || [])[1];
  const room = (hr.match(/<Room>(.*?)<\/Room>/) || [])[1];
  if (cls && room) classToBuilding[cls] = roomToBuilding[room] || 'Điểm trường 3';
});

// 3. Phân tích danh sách Hoạt động (Activities)
const actDef = {};
(fetContent.match(/<Activity>[\s\S]*?<\/Activity>/g) || []).forEach(a => {
  const id = (a.match(/<Id>(\d+)<\/Id>/) || [])[1];
  const t = (a.match(/<Teacher>(.*?)<\/Teacher>/) || [])[1] || '';
  const subj = (a.match(/<Subject>(.*?)<\/Subject>/) || [])[1] || '';
  const st = (a.match(/<Students>(.*?)<\/Students>/) || [])[1] || '';
  const dur = parseInt((a.match(/<Duration>(\d+)<\/Duration>/) || [])[1] || '1', 10);
  if (id) {
    actDef[id] = { id, teacher: t, subject: subj, students: st, duration: dur, campus: classToBuilding[st] || 'Điểm trường 3' };
  }
});

// 4. Phân tích vị trí tiết đã xếp (Placements)
const placed = {};
const starts = [...fetContent.matchAll(/<ConstraintActivityPreferredStartingTime>[\s\S]*?<Activity_Id>(\d+)<\/Activity_Id>[\s\S]*?<Preferred_Day>(.*?)<\/Preferred_Day>[\s\S]*?<Preferred_Hour>(.*?)<\/Preferred_Hour>[\s\S]*?<\/ConstraintActivityPreferredStartingTime>/g)];
starts.forEach(m => {
  placed[m[1]] = { day: m[2], hour: m[3] };
});

const rooms = [...fetContent.matchAll(/<ConstraintActivityPreferredRoom>[\s\S]*?<Activity_Id>(\d+)<\/Activity_Id>[\s\S]*?<Room>(.*?)<\/Room>[\s\S]*?<\/ConstraintActivityPreferredRoom>/g)];
rooms.forEach(m => {
  if (placed[m[1]]) placed[m[1]].room = m[2];
});

const totalActivities = Object.keys(actDef).length;
const totalPlaced = Object.keys(placed).length;

console.log('📊 Tổng số hoạt động: ' + totalActivities + ' | Đã xếp vị trí: ' + totalPlaced);
if (totalPlaced === 0) {
  console.warn('⚠️ Tệp FET này chưa có dữ liệu lịch đã xếp (ConstraintActivityPreferredStartingTime).');
  console.warn('   Vui lòng chọn tệp kết quả từ FET: *_data_and_timetable.fet để kiểm định đầy đủ!');
}

const hoursOrder = ['Tiết 1', 'Tiết 2', 'Tiết 3', 'Tiết 4', 'Tiết 5'];
const dayList = ['S.T2', 'C.T2', 'S.T3', 'C.T3', 'S.T4', 'C.T4', 'S.T5', 'C.T5', 'S.T6', 'C.T6', 'S.T7', 'C.T7'];

// =========================================================================
// KIỂM ĐỊNH 1: KHÔNG QUÁ 2 TIẾT CÙNG MỘT MÔN TRONG 1 NGÀY CHO TỪNG LỚP
// =========================================================================
const max2Errors = [];
const classDaySubj = {};
Object.entries(placed).forEach(([id, p]) => {
  const act = actDef[id];
  if (!act) return;
  const realDay = p.day.split('.')[1];
  const c = act.students;
  const s = act.subject;
  if (!classDaySubj[c]) classDaySubj[c] = {};
  if (!classDaySubj[c][realDay]) classDaySubj[c][realDay] = {};
  classDaySubj[c][realDay][s] = (classDaySubj[c][realDay][s] || 0) + act.duration;
});

Object.entries(classDaySubj).forEach(([c, days]) => {
  Object.entries(days).forEach(([d, subjs]) => {
    Object.entries(subjs).forEach(([s, count]) => {
      if (count > 2) {
        max2Errors.push({ class: c, day: d.replace('T', 'Thứ '), subject: s, periods: count });
      }
    });
  });
});

// =========================================================================
// KIỂM ĐỊNH 2: TRÙNG PHÒNG HỌC CHỨC NĂNG (TIN HỌC & ÂM NHẠC TẠI CÁC ĐIỂM TRƯỜNG)
// =========================================================================
const roomErrors = [];
const roomSlotUsage = {};
Object.entries(placed).forEach(([id, p]) => {
  if (!p.room) return;
  const slot = p.day + ' ' + p.hour;
  const key = slot + '__' + p.room;
  if (!roomSlotUsage[key]) roomSlotUsage[key] = [];
  roomSlotUsage[key].push({ id, act: actDef[id] });
});

Object.entries(roomSlotUsage).forEach(([key, list]) => {
  if (list.length > 1) {
    const parts = key.split('__');
    const slot = parts[0];
    const room = parts[1];
    roomErrors.push({
      slot,
      room,
      count: list.length,
      details: list.map(x => (x.act ? (x.act.students + ' [' + x.act.teacher + ' - ' + x.act.subject + ']') : 'Unknown')).join(' TRÙNG VỚI ')
    });
  }
});

// =========================================================================
// KIỂM ĐỊNH 3: DI CHUYỂN ĐIỂM TRƯỜNG CỦA GIÁO VIÊN (NGHỈ ÍT NHẤT 1 TIẾT)
// =========================================================================
const buildingErrors = [];
const allTeachers = [...new Set(Object.values(actDef).map(x => x.teacher))].filter(Boolean);
allTeachers.forEach(t => {
  dayList.forEach(d => {
    const periodsInSession = [];
    Object.entries(placed).forEach(([id, p]) => {
      const act = actDef[id];
      if (act && act.teacher === t && p.day === d) {
        const hIdx = hoursOrder.indexOf(p.hour);
        const campus = (p.room && roomToBuilding[p.room]) ? roomToBuilding[p.room] : act.campus;
        for (let k = 0; k < act.duration; k++) {
          periodsInSession.push({
            hourIdx: hIdx + k,
            hour: hoursOrder[hIdx + k] || p.hour,
            campus,
            class: act.students,
            subject: act.subject
          });
        }
      }
    });
    periodsInSession.sort((a, b) => a.hourIdx - b.hourIdx);
    for (let i = 0; i < periodsInSession.length - 1; i++) {
      const cur = periodsInSession[i];
      const next = periodsInSession[i + 1];
      if (cur.campus !== next.campus) {
        const gap = next.hourIdx - cur.hourIdx - 1;
        if (gap < 1) {
          buildingErrors.push({
            teacher: t,
            session: d,
            from: cur.hour + ' (' + cur.campus + ' - ' + cur.class + ')',
            to: next.hour + ' (' + next.campus + ' - ' + next.class + ')',
            gap
          });
        }
      }
    }
  });
});

// =========================================================================
// KIỂM ĐỊNH 4: KHÓA CỨNG TIẾT 5 THỨ 7 (KHÔNG LỚP NÀO HỌC TIẾT 5 THỨ 7)
// =========================================================================
const satP5Errors = [];
Object.entries(placed).forEach(([id, p]) => {
  const act = actDef[id];
  if (act && !act.students.startsWith('PĐ') && p.day.endsWith('.T7') && p.hour === 'Tiết 5') {
    satP5Errors.push({ class: act.students, teacher: act.teacher, subject: act.subject });
  }
});

// =========================================================================
// KIỂM ĐỊNH 5: ƯU TIÊN 5 TỔ TRƯỞNG CHUYÊN MÔN NGHỈ THỨ 7
// =========================================================================
const leaders = ['Lợi', 'M.Hằng', 'T.Thúy', 'Tình', 'Tú'];
const leaderStatus = [];
leaders.forEach(l => {
  let satPeriods = 0;
  const schedule = [];
  Object.entries(placed).forEach(([id, p]) => {
    const act = actDef[id];
    if (act && act.teacher === l && p.day.endsWith('.T7')) {
      satPeriods += act.duration;
      schedule.push(p.day + ' ' + p.hour + ': ' + act.subject + ' (' + act.students + ')');
    }
  });
  leaderStatus.push({
    teacher: l,
    satPeriods,
    isOff: satPeriods === 0,
    details: schedule.join(', ')
  });
});

// =========================================================================
// IN BÁO CÁO KẾT QUẢ KIỂM ĐỊNH RA MÀN HÌNH CONSOLE
// =========================================================================
console.log('\n--- 1. KIỂM TRA MÔN HỌC KHÔNG QUÁ 2 TIẾT/NGÀY ---');
if (max2Errors.length === 0) {
  console.log('✅ ĐẠT 100%: Toàn bộ các lớp không có môn nào học quá 2 tiết trong một ngày.');
} else {
  console.log('❌ PHÁT HIỆN ' + max2Errors.length + ' VI PHẠM (QUÁ 2 TIẾT/NGÀY):');
  max2Errors.forEach(e => console.log('   - Lớp ' + e.class + ' ngày ' + e.day + ': Môn ' + e.subject + ' học dồn ' + e.periods + ' tiết!'));
}

console.log('\n--- 2. KIỂM TRA XUNG ĐỘT PHÒNG CHỨC NĂNG (TIN HỌC, ÂM NHẠC) ---');
if (roomErrors.length === 0) {
  console.log('✅ ĐẠT 100%: Tuyệt đối không trùng phòng học chức năng nào tại cả 3 điểm trường.');
} else {
  console.log('❌ PHÁT HIỆN ' + roomErrors.length + ' XUNG ĐỘT PHÒNG HỌC:');
  roomErrors.forEach(e => console.log('   - Phòng ' + e.room + ' lúc ' + e.slot + ': ' + e.details));
}

console.log('\n--- 3. KIỂM TRA NGHỈ ÍT NHẤT 1 TIẾT KHI ĐỔI ĐIỂM TRƯỜNG ---');
if (buildingErrors.length === 0) {
  console.log('✅ ĐẠT 100%: Toàn bộ các lần chuyển điểm trường của giáo viên đều có ít nhất 1 tiết nghỉ để di chuyển.');
} else {
  console.log('❌ PHÁT HIỆN ' + buildingErrors.length + ' VI PHẠM DI CHUYỂN:');
  buildingErrors.forEach(e => console.log('   - GV ' + e.teacher + ' (' + e.session + '): từ ' + e.from + ' sang ' + e.to + ' (Khoảng cách: ' + e.gap + ' tiết nghỉ)'));
}

console.log('\n--- 4. KIỂM TRA KHÓA TIẾT 5 THỨ 7 (TOÀN TRƯỜNG TAN SỚM) ---');
if (satP5Errors.length === 0) {
  console.log('✅ ĐẠT 100%: 100% các lớp đều khóa cứng Tiết 5 Thứ 7 (Học sinh và GV tan trường từ Tiết 4).');
} else {
  console.log('❌ PHÁT HIỆN ' + satP5Errors.length + ' TIẾT CHƯA KHÓA VÀO TIẾT 5 THỨ 7:');
  satP5Errors.forEach(e => console.log('   - Lớp ' + e.class + ': Môn ' + e.subject + ' (GV: ' + e.teacher + ')'));
}

console.log('\n--- 5. KIỂM TRA 5 TỔ TRƯỞNG CHUYÊN MÔN NGHỈ THỨ 7 ---');
leaderStatus.forEach(l => {
  const icon = l.isOff ? '✅' : '❌';
  console.log('   ' + icon + ' Tổ trưởng ' + l.teacher.padEnd(8) + ': ' + (l.isOff ? 'NGHỈ TRỌN VẸN THỨ 7' : ('DẠY ' + l.satPeriods + ' TIẾT (' + l.details + ')')));
});

// =========================================================================
// TỔNG HỢP VÀ XUẤT FILE EXCEL NGÀY NGHỈ GIÁO VIÊN
// =========================================================================
console.log('\n========================================================================');
console.log('📊 TỔNG HỢP THỐNG KÊ NGÀY NGHỈ CỦA TOÀN BỘ GIÁO VIÊN VÀ XUẤT EXCEL...');
console.log('========================================================================');

const teachersList = [...fetContent.matchAll(/<Teacher>[\s\S]*?<Name>(.*?)<\/Name>[\s\S]*?<\/Teacher>/g)].map(m => m[1]).filter(t => !t.includes("Điểm") && t.trim() !== "");

const teacherSchedule = {};
teachersList.forEach(t => {
  teacherSchedule[t] = { T2: 0, T3: 0, T4: 0, T5: 0, T6: 0, T7: 0, total: 0 };
});

Object.entries(placed).forEach(([id, p]) => {
  const act = actDef[id];
  if (!act) return;
  const t = act.teacher;
  const dayName = p.day.split('.')[1];
  if (teacherSchedule[t] && teacherSchedule[t][dayName] !== undefined) {
    teacherSchedule[t][dayName] += act.duration;
    teacherSchedule[t].total += act.duration;
  }
});

const excelRows = [];
teachersList.forEach((t, idx) => {
  const s = teacherSchedule[t];
  const daysOff = [];
  ['T2', 'T3', 'T4', 'T5', 'T6', 'T7'].forEach(d => {
    if (s[d] === 0) daysOff.push(d.replace('T', 'Thứ '));
  });

  const isLeader = leaders.includes(t);
  let note = 'Giáo viên bộ môn';
  if (isLeader) note = 'Tổ trưởng chuyên môn (Ưu tiên nghỉ T7)';
  if (t === 'T.Trang') note = 'GV Toán (Nghỉ điều trị T2,T4,T6)';

  excelRows.push({
    'STT': idx + 1,
    'Tên Giáo Viên': t,
    'Chức Vụ / Ghi Chú': note,
    'Tổng Tiết': s.total,
    'Thứ 2': s.T2 > 0 ? (s.T2 + ' tiết') : 'NGHỈ',
    'Thứ 3': s.T3 > 0 ? (s.T3 + ' tiết') : 'NGHỈ',
    'Thứ 4': s.T4 > 0 ? (s.T4 + ' tiết') : 'NGHỈ',
    'Thứ 5': s.T5 > 0 ? (s.T5 + ' tiết') : 'NGHỈ',
    'Thứ 6': s.T6 > 0 ? (s.T6 + ' tiết') : 'NGHỈ',
    'Thứ 7': s.T7 > 0 ? (s.T7 + ' tiết') : 'NGHỈ',
    'Số Ngày NghỈ': daysOff.length,
    'Chi Tiết Ngày Nghỉ': daysOff.join(', ')
  });
});

// Thống kê phân bổ ngày nghỉ
const dayOffSummary = { 'Thứ 2': 0, 'Thứ 3': 0, 'Thứ 4': 0, 'Thứ 5': 0, 'Thứ 6': 0, 'Thứ 7': 0 };
teachersList.forEach(t => {
  const s = teacherSchedule[t];
  if (s.T2 === 0) dayOffSummary['Thứ 2']++;
  if (s.T3 === 0) dayOffSummary['Thứ 3']++;
  if (s.T4 === 0) dayOffSummary['Thứ 4']++;
  if (s.T5 === 0) dayOffSummary['Thứ 5']++;
  if (s.T6 === 0) dayOffSummary['Thứ 6']++;
  if (s.T7 === 0) dayOffSummary['Thứ 7']++;
});

const summaryRows = [
  { 'Hạng Mục Kiểm Định': 'Không quá 2 tiết/môn/ngày', 'Kết Quả': max2Errors.length === 0 ? 'ĐẠT 100%' : ('LỖI (' + max2Errors.length + ' vi phạm)') },
  { 'Hạng Mục Kiểm Định': 'Không trùng phòng chức năng (Tin, Nhạc)', 'Kết Quả': roomErrors.length === 0 ? 'ĐẠT 100%' : ('LỖI (' + roomErrors.length + ' xung đột)') },
  { 'Hạng Mục Kiểm Định': 'Nghỉ ít nhất 1 tiết khi đổi điểm trường', 'Kết Quả': buildingErrors.length === 0 ? 'ĐẠT 100%' : ('LỖI (' + buildingErrors.length + ' vi phạm)') },
  { 'Hạng Mục Kiểm Định': 'Khóa cứng Tiết 5 Thứ 7', 'Kết Quả': satP5Errors.length === 0 ? 'ĐẠT 100%' : ('LỖI (' + satP5Errors.length + ' chưa khóa)') },
  { 'Hạng Mục Kiểm Định': '5 Tổ trưởng chuyên môn nghỉ Thứ 7', 'Kết Quả': leaderStatus.every(l => l.isOff) ? 'ĐẠT 100% (5/5 Tổ trưởng nghỉ T7)' : 'CÓ VI PHẠM' },
  { 'Hạng Mục Kiểm Định': '', 'Kết Quả': '' },
  { 'Hạng Mục Kiểm Định': 'THỐNG KÊ PHÂN BỔ NGÀY NGHỈ', 'Kết Quả': 'SỐ GIÁO VIÊN ĐƯỢC NGHỈ' },
  { 'Hạng Mục Kiểm Định': 'Thứ 2', 'Kết Quả': dayOffSummary['Thứ 2'] + ' giáo viên' },
  { 'Hạng Mục Kiểm Định': 'Thứ 3', 'Kết Quả': dayOffSummary['Thứ 3'] + ' giáo viên' },
  { 'Hạng Mục Kiểm Định': 'Thứ 4', 'Kết Quả': dayOffSummary['Thứ 4'] + ' giáo viên' },
  { 'Hạng Mục Kiểm Định': 'Thứ 5', 'Kết Quả': dayOffSummary['Thứ 5'] + ' giáo viên' },
  { 'Hạng Mục Kiểm Định': 'Thứ 6', 'Kết Quả': dayOffSummary['Thứ 6'] + ' giáo viên' },
  { 'Hạng Mục Kiểm Định': 'Thứ 7', 'Kết Quả': dayOffSummary['Thứ 7'] + ' giáo viên' }
];

const wb = xlsx.utils.book_new();
const ws1 = xlsx.utils.json_to_sheet(excelRows);
const ws2 = xlsx.utils.json_to_sheet(summaryRows);

xlsx.utils.book_append_sheet(wb, ws1, 'Ngay_Nghi_Giao_Vien');
xlsx.utils.book_append_sheet(wb, ws2, 'Ket_Qua_Kiem_Dinh');

const baseName = path.basename(targetFetFile, path.extname(targetFetFile));
const outputExcelPath = 'Bao_Cao_Kiem_Dinh_' + baseName + '.xlsx';
const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

fs.writeFileSync(outputExcelPath, buffer);
console.log('\n🎉 ĐÃ XUẤT THÀNH CÔNG BÁO CÁO EXCEL: ' + outputExcelPath);
console.log('========================================================================\n');
