/**
 * ================================================================================
 *   🤖 GOOGLE APPS SCRIPT: ZALO TKB BOT & GOOGLE SHEETS SYNC SERVER (MIỄN PHÍ 24/7)
 * ================================================================================
 * Tác giả: Hệ thống Xếp Thời Khóa Biểu FET
 * Nền tảng: Google Apps Script (Chạy trực tiếp trên Google Drive, không cần máy tính)
 */

const FIREBASE_DATABASE_URL = "https://tkb-fet-default-rtdb.asia-southeast1.firebasedatabase.app/school_data.json";

// Cấu hình Zalo OA (Nếu dùng Zalo Official Account)
const ZALO_OA_ACCESS_TOKEN = "";

/**
 * 1. Xử lý yêu cầu GET (Dùng để test trên trình duyệt hoặc tích hợp chatbot)
 * Ví dụ: URL_WEBAPP?query=tkb Trọng
 */
function doGet(e) {
  const query = (e && e.parameter && e.parameter.query) ? e.parameter.query : (e && e.parameter && e.parameter.text ? e.parameter.text : "");
  
  if (!query) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Zalo TKB Cloud Server đang hoạt động 24/7!",
      guide: "Thêm ?query=tkb [Tên GV hoặc Lớp] vào URL để tra cứu."
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const responseText = processTimetableQuery(query);
  return ContentService.createTextOutput(responseText).setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 2. Xử lý yêu cầu POST:
 * - Nhận lệnh đồng bộ TKB từ Admin Web (action = "sync_timetable") -> Tự động ghi vào Google Sheets!
 * - Nhận Webhook tin nhắn từ Zalo OA / Chatbot platform (Fchat, Ahachat...)
 */
function doPost(e) {
  try {
    let postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {
        postData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      postData = e.parameter;
    }
    
    // A. Xử lý lệnh đồng bộ TKB từ Admin Web lên Google Sheets
    if (postData.action === "sync_timetable") {
      const result = syncDataToGoogleSheets(postData);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    // B. Xử lý tin nhắn từ Zalo OA Webhook / Chatbot
    let userMessage = "";
    let senderId = "";
    
    if (postData.event_name === "user_send_text") {
      userMessage = postData.message ? postData.message.text : "";
      senderId = postData.sender ? postData.sender.id : "";
    } else if (postData.text || postData.message) {
      userMessage = postData.text || postData.message;
      senderId = postData.sender_id || postData.user_id || "";
    } else if (postData.query) {
      userMessage = postData.query;
      senderId = postData.sender || "";
    }
    
    if (userMessage) {
      const replyText = processTimetableQuery(userMessage);
      
      // Nếu có Access Token Zalo OA, gửi tin phản hồi qua Zalo OpenAPI
      if (ZALO_OA_ACCESS_TOKEN && senderId) {
        sendZaloOAMessage(senderId, replyText);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        recipient: { user_id: senderId },
        message: { text: replyText }
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "ignored" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 3. Tự động ghi dữ liệu Thời Khóa Biểu vào Google Sheets với định dạng chuẩn
 */
function syncDataToGoogleSheets(payload) {
  let ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}
  
  if (!ss) {
    // Tìm file đã tồn tại hoặc tạo mới
    const files = DriveApp.getFilesByName("Thời Khóa Biểu - Dữ Liệu Tra Cứu Zalo");
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create("Thời Khóa Biểu - Dữ Liệu Tra Cứu Zalo");
    }
  }
  
  const teachers = payload.teachers || [];
  const classes = payload.classes || [];
  const timetable = payload.timetable || {};
  const applyDate = payload.timetableApplyDate || "";
  const weekName = payload.weekName || "Đợt chính thức";
  
  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7"];
  const weekLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  
  // -------------------------------------------------------------
  // Sheet 1: TKB Buổi Sáng (31 Cột chuẩn)
  // -------------------------------------------------------------
  let sheetMorning = ss.getSheetByName("TKB_Buoi_Sang");
  if (!sheetMorning) sheetMorning = ss.insertSheet("TKB_Buoi_Sang");
  sheetMorning.clear();
  
  const morningClasses = classes.filter(c => c && (c.session || "sáng").toLowerCase() === "sáng");
  
  // Tạo hàng tiêu đề đúng 31 phần tử
  const morningTitleRow = new Array(31).fill("");
  morningTitleRow[0] = "BẢNG THỜI KHÓA BIỂU BUỔI SÁNG - " + weekName.toUpperCase() + (applyDate ? " (" + applyDate + ")" : "");
  
  const morningHeaderDay = ["Lớp"];
  weekLabels.forEach(lbl => {
    morningHeaderDay.push(lbl, "", "", "", "");
  });
  
  const morningHeaderPeriod = [""];
  for (let d = 0; d < 6; d++) {
    morningHeaderPeriod.push("T1", "T2", "T3", "T4", "T5");
  }
  
  const morningRows = [morningTitleRow, morningHeaderDay, morningHeaderPeriod];
  
  morningClasses.forEach(c => {
    const row = [c.name];
    weekdays.forEach(day => {
      for (let p = 1; p <= 5; p++) {
        if (timetable[c.name] && timetable[c.name][day] && timetable[c.name][day][p]) {
          const act = timetable[c.name][day][p];
          row.push(act.subject + (act.teacher ? "\n(" + act.teacher + ")" : ""));
        } else {
          row.push("");
        }
      }
    });
    morningRows.push(row);
  });
  
  if (morningRows.length > 0) {
    const mRange = sheetMorning.getRange(1, 1, morningRows.length, 31);
    mRange.setValues(morningRows);
    mRange.setWrap(true);
    mRange.setVerticalAlignment("middle");
    mRange.setFontFamily("Roboto");
    
    // Gộp ô tiêu đề
    sheetMorning.getRange(1, 1, 1, 31).merge()
      .setFontWeight("bold")
      .setFontSize(13)
      .setHorizontalAlignment("center")
      .setBackground("#dbeafe")
      .setFontColor("#1e3a8a");
      
    // Gộp ô thứ
    for (let i = 0; i < 6; i++) {
      const colStart = 2 + (i * 5);
      sheetMorning.getRange(2, colStart, 1, 5).merge()
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setBackground("#f1f5f9");
    }
    
    sheetMorning.getRange(3, 1, 1, 31)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setBackground("#e2e8f0");
      
    sheetMorning.getRange(4, 1, morningClasses.length, 1)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setBackground("#f8fafc");
      
    mRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
    sheetMorning.autoResizeColumns(1, 31);
  }
  
  // -------------------------------------------------------------
  // Sheet 2: TKB Buổi Chiều (31 Cột chuẩn)
  // -------------------------------------------------------------
  let sheetAfternoon = ss.getSheetByName("TKB_Buoi_Chieu");
  if (!sheetAfternoon) sheetAfternoon = ss.insertSheet("TKB_Buoi_Chieu");
  sheetAfternoon.clear();
  
  const afternoonClasses = classes.filter(c => c && (c.session || "sáng").toLowerCase() === "chiều");
  
  const afternoonTitleRow = new Array(31).fill("");
  afternoonTitleRow[0] = "BẢNG THỜI KHÓA BIỂU BUỔI CHIỀU - " + weekName.toUpperCase() + (applyDate ? " (" + applyDate + ")" : "");
  
  const afternoonRows = [afternoonTitleRow, morningHeaderDay, morningHeaderPeriod];
  
  afternoonClasses.forEach(c => {
    const row = [c.name];
    weekdays.forEach(day => {
      for (let p = 1; p <= 5; p++) {
        if (timetable[c.name] && timetable[c.name][day] && timetable[c.name][day][p]) {
          const act = timetable[c.name][day][p];
          row.push(act.subject + (act.teacher ? "\n(" + act.teacher + ")" : ""));
        } else {
          row.push("");
        }
      }
    });
    afternoonRows.push(row);
  });
  
  if (afternoonRows.length > 0) {
    const aRange = sheetAfternoon.getRange(1, 1, afternoonRows.length, 31);
    aRange.setValues(afternoonRows);
    aRange.setWrap(true);
    aRange.setVerticalAlignment("middle");
    aRange.setFontFamily("Roboto");
    
    // Gộp ô tiêu đề
    sheetAfternoon.getRange(1, 1, 1, 31).merge()
      .setFontWeight("bold")
      .setFontSize(13)
      .setHorizontalAlignment("center")
      .setBackground("#fef3c7")
      .setFontColor("#92400e");
      
    // Gộp ô thứ
    for (let i = 0; i < 6; i++) {
      const colStart = 2 + (i * 5);
      sheetAfternoon.getRange(2, colStart, 1, 5).merge()
        .setFontWeight("bold")
        .setHorizontalAlignment("center")
        .setBackground("#f1f5f9");
    }
    
    sheetAfternoon.getRange(3, 1, 1, 31)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setBackground("#e2e8f0");
      
    sheetAfternoon.getRange(4, 1, afternoonClasses.length, 1)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setBackground("#f8fafc");
      
    aRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
    sheetAfternoon.autoResizeColumns(1, 31);
  }
  
  // -------------------------------------------------------------
  // Sheet 3: Danh sách Giáo viên & Lịch dạy (10 Cột chuẩn)
  // -------------------------------------------------------------
  let sheetTeachers = ss.getSheetByName("TKB_Giao_Vien");
  if (!sheetTeachers) sheetTeachers = ss.insertSheet("TKB_Giao_Vien");
  sheetTeachers.clear();
  
  const teacherTitleRow = new Array(10).fill("");
  teacherTitleRow[0] = "DANH SÁCH THỜI KHÓA BIỂU GIÁO VIÊN - " + weekName.toUpperCase() + (applyDate ? " (" + applyDate + ")" : "");
  
  const teacherHeader = ["STT", "Họ và tên", "Tên viết tắt", "Tổ chuyên môn", "Lịch dạy Thứ 2", "Lịch dạy Thứ 3", "Lịch dạy Thứ 4", "Lịch dạy Thứ 5", "Lịch dạy Thứ 6", "Lịch dạy Thứ 7"];
  const teacherRows = [teacherTitleRow, teacherHeader];
  
  const validTeachers = teachers.filter(t => t && t.fullName && t.fullName.trim() !== "");
  validTeachers.forEach((t, idx) => {
    const row = [idx + 1, t.fullName, t.shortName, t.group || ""];
    weekdays.forEach(day => {
      const slots = [];
      classes.forEach(c => {
        if (timetable[c.name] && timetable[c.name][day]) {
          for (let p = 1; p <= 5; p++) {
            if (timetable[c.name][day][p] && timetable[c.name][day][p].teacher === t.shortName) {
              slots.push(`T${p}(${c.name})`);
            }
          }
        }
      });
      row.push(slots.join(", ") || "-");
    });
    teacherRows.push(row);
  });
  
  if (teacherRows.length > 0) {
    const tRange = sheetTeachers.getRange(1, 1, teacherRows.length, 10);
    tRange.setValues(teacherRows);
    tRange.setWrap(true);
    tRange.setVerticalAlignment("middle");
    tRange.setFontFamily("Roboto");
    
    // Gộp tiêu đề
    sheetTeachers.getRange(1, 1, 1, 10).merge()
      .setFontWeight("bold")
      .setFontSize(13)
      .setHorizontalAlignment("center")
      .setBackground("#dcfce7")
      .setFontColor("#166534");
      
    sheetTeachers.getRange(2, 1, 1, 10)
      .setFontWeight("bold")
      .setHorizontalAlignment("center")
      .setBackground("#f1f5f9");
      
    tRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
    sheetTeachers.autoResizeColumns(1, 10);
  }
  
  return {
    status: "success",
    message: "Đã đồng bộ thành công lên Google Sheets!",
    spreadsheetUrl: ss.getUrl(),
    teachersCount: validTeachers.length,
    classesCount: classes.length,
    updatedAt: (new Date()).toLocaleString("vi-VN")
  };
}

/**
 * 4. Bộ xử lý tra cứu TKB từ Firebase Realtime Database
 */
function processTimetableQuery(messageText) {
  const text = (messageText || "").trim();
  const clean = removeVietnameseTones(text);
  
  if (clean === "help" || clean === "giup do" || clean === "huong dan" || clean === "?") {
    return "╔══════════════════════════╗\n" +
           "   🤖 TRỢ LÝ TRA CỨU TKB\n" +
           "╚══════════════════════════╝\n" +
           "📌 CÁC CÚ PHÁP TRA CỨU:\n" +
           "• tkb [Tên GV] -> Lịch dạy cả tuần (VD: tkb Trọng)\n" +
           "• tkb [Tên Lớp] -> Lịch học cả tuần (VD: tkb 6a1)\n" +
           "• tkb [Tên] hôm nay (hoặc mai, t2, t3, t4, t5, t6, t7)\n" +
           "────────────────────────────\n" +
           "✨ Dữ liệu đồng bộ trực tiếp từ Nhà trường.";
  }
  
  if (!clean.startsWith("tkb") && !clean.startsWith("thoi khoa bieu") && !clean.startsWith("lich day") && !clean.startsWith("lich hoc")) {
    return null;
  }
  
  let queryPart = text;
  if (clean.startsWith("thoi khoa bieu")) queryPart = text.substring(14).trim();
  else if (clean.startsWith("lich day")) queryPart = text.substring(8).trim();
  else if (clean.startsWith("lich hoc")) queryPart = text.substring(8).trim();
  else if (clean.startsWith("tkb")) queryPart = text.substring(3).trim();
  
  if (!queryPart) {
    return "⚠️ Vui lòng nhập thêm Tên Giáo viên hoặc Lớp!\nVí dụ: 'tkb Trọng' hoặc 'tkb 6A1'.";
  }
  
  // Tải dữ liệu từ Firebase
  const response = UrlFetchApp.fetch(FIREBASE_DATABASE_URL, { muteHttpExceptions: true });
  const data = JSON.parse(response.getContentText());
  if (!data) return "❌ Không thể kết nối cơ sở dữ liệu trường học.";
  
  const teachers = data.teachers || [];
  const classes = data.classes || [];
  let timetable = data.timetable || {};
  let weekName = "";
  let applyDate = data.timetableApplyDate || "";
  
  if (data.currentWeekId && data.weeklyTimetables) {
    const wt = data.weeklyTimetables.find(w => w && w.id === data.currentWeekId);
    if (wt && wt.timetable) {
      timetable = wt.timetable;
      weekName = wt.weekName || "";
      applyDate = wt.applyDate || applyDate;
    }
  }
  
  const parts = queryPart.split(/\s+/);
  const targetKeyword = parts[0];
  const timeKeyword = parts.slice(1).join(" ");
  const dayFilter = parseDayFilter(timeKeyword);
  
  const targetClean = removeVietnameseTones(targetKeyword);
  const weekdays = dayFilter ? [dayFilter] : ["T2", "T3", "T4", "T5", "T6", "T7"];
  const weekDayLabels = { "T2": "Thứ 2", "T3": "Thứ 3", "T4": "Thứ 4", "T5": "Thứ 5", "T6": "Thứ 6", "T7": "Thứ 7" };
  
  // A. Tìm theo Lớp học
  const matchedClass = classes.find(c => c && removeVietnameseTones(c.name) === targetClean);
  if (matchedClass) {
    const clsSchedule = timetable[matchedClass.name] || {};
    let out = "╔══════════════════════════╗\n" +
              "   🏫 THỜI KHÓA BIỂU LỚP " + matchedClass.name + "\n" +
              "╚══════════════════════════╝\n" +
              (weekName ? ("📌 " + weekName + (applyDate ? " (từ " + applyDate + ")\n" : "\n")) : "") +
              "────────────────────────────\n";
    let hasSlots = false;
    weekdays.forEach(day => {
      const slots = [];
      for (let p = 1; p <= 5; p++) {
        if (clsSchedule[day] && clsSchedule[day][p]) {
          slots.push({ p: p, sub: clsSchedule[day][p].subject, tea: clsSchedule[day][p].teacher });
        }
      }
      if (slots.length > 0) {
        hasSlots = true;
        out += "\n🗓️ 【 " + (weekDayLabels[day] || day).toUpperCase() + " 】\n";
        slots.forEach(s => {
          out += "  • Tiết " + s.p + ": " + s.sub + (s.tea ? " (GV: " + s.tea + ")" : "") + "\n";
        });
      }
    });
    if (!hasSlots) out += "\n🌴 Không có tiết học trong thời gian này.\n";
    return out;
  }
  
  // B. Tìm theo Giáo viên
  let matchedTeacher = teachers.find(t => t && t.shortName && removeVietnameseTones(t.shortName) === targetClean);
  if (!matchedTeacher) {
    matchedTeacher = teachers.find(t => t && t.fullName && removeVietnameseTones(t.fullName).includes(targetClean));
  }
  
  if (matchedTeacher) {
    let out = "╔══════════════════════════╗\n" +
              "   📅 THỜI KHÓA BIỂU GIÁO VIÊN\n" +
              "╚══════════════════════════╝\n" +
              "👤 " + matchedTeacher.fullName + " (" + matchedTeacher.shortName + ")\n" +
              (weekName ? ("📌 " + weekName + (applyDate ? " (từ " + applyDate + ")\n" : "\n")) : "") +
              "────────────────────────────\n";
              
    let hasSlots = false;
    weekdays.forEach(day => {
      const morning = [];
      const afternoon = [];
      classes.forEach(c => {
        const session = (c.session || "sáng").toLowerCase();
        const clsTkb = timetable[c.name];
        if (clsTkb && clsTkb[day]) {
          for (let p = 1; p <= 5; p++) {
            if (clsTkb[day][p] && clsTkb[day][p].teacher === matchedTeacher.shortName) {
              if (session === "sáng") morning.push({ p: p, sub: clsTkb[day][p].subject, cls: c.name });
              else afternoon.push({ p: p, sub: clsTkb[day][p].subject, cls: c.name });
            }
          }
        }
      });
      
      if (morning.length > 0 || afternoon.length > 0) {
        hasSlots = true;
        out += "\n🗓️ 【 " + (weekDayLabels[day] || day).toUpperCase() + " 】\n";
        if (morning.length > 0) {
          out += "  🌅 Buổi Sáng:\n";
          morning.sort((a,b) => a.p - b.p).forEach(s => out += "    • Tiết " + s.p + ": " + s.sub + " (Lớp " + s.cls + ")\n");
        }
        if (afternoon.length > 0) {
          out += "  🌇 Buổi Chiều:\n";
          afternoon.sort((a,b) => a.p - b.p).forEach(s => out += "    • Tiết " + s.p + ": " + s.sub + " (Lớp " + s.cls + ")\n");
        }
      }
    });
    
    if (!hasSlots) out += "\n🌴 Không có tiết dạy trong thời gian này.\n";
    return out;
  }
  
  return "❌ Không tìm thấy Giáo viên hoặc Lớp: '" + targetKeyword + "'\n💡 Hãy thử nhập đúng tên viết tắt (VD: tkb Trọng) hoặc tên lớp (VD: tkb 6A1).";
}

function parseDayFilter(keyword) {
  if (!keyword) return null;
  const clean = removeVietnameseTones(keyword);
  const dayOfWeek = (new Date()).getDay();
  if (clean === "hom nay" || clean === "hn") {
    const map = { 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7" };
    return map[dayOfWeek] || "T2";
  }
  if (clean === "mai" || clean === "ngay mai") {
    const nextDay = (dayOfWeek + 1) % 7;
    const map = { 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7" };
    return map[nextDay] || "T2";
  }
  if (clean === "t2" || clean === "thu 2" || clean === "thu hai") return "T2";
  if (clean === "t3" || clean === "thu 3" || clean === "thu ba") return "T3";
  if (clean === "t4" || clean === "thu 4" || clean === "thu tu") return "T4";
  if (clean === "t5" || clean === "thu 5" || clean === "thu nam") return "T5";
  if (clean === "t6" || clean === "thu 6" || clean === "thu sau") return "T6";
  if (clean === "t7" || clean === "thu 7" || clean === "thu bay") return "T7";
  return null;
}

function removeVietnameseTones(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

function sendZaloOAMessage(userId, text) {
  if (!ZALO_OA_ACCESS_TOKEN) return;
  const url = "https://openapi.zalo.me/v3.0/oa/message/cs";
  const payload = {
    recipient: { user_id: userId },
    message: { text: text }
  };
  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { "access_token": ZALO_OA_ACCESS_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}
