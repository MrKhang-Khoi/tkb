/**
 * ====================================================================================================
 *   🤖 GOOGLE APPS SCRIPT: ZALO BOT TRỢ LÝ THỜI KHÓA BIỂU THÔNG MINH 4.0 (FULL FEATURES)
 * ====================================================================================================
 * Tác giả: Hệ thống Xếp Thời Khóa Biểu FET
 * Nền tảng: Google Apps Script + Zalo Bot Platform + Google Sheets + Firebase Realtime Database
 * 
 * CÁC TÍNH NĂNG ĐỈNH CAO:
 *  1. 📱 Menu Tương Tác Trực Quan Bằng Lệnh Nhanh & 1 Chạm.
 *  2. 🧠 Xử Lý Ngôn Ngữ Tự Nhiên AI (Hỏi đáp tự nhiên: "mai tôi có tiết không", "chiều thứ 5 7a1 học gì"...).
 *  3. 👥 Tìm Giáo Viên Trống Tiết Dạy Thay Thông Minh ("tim gv trong toan t3", "ai ranh van tiet 2 thu 4"...).
 *  4. 🔄 Tra Cứu Lịch Dạy Thay & Học Thay Của Toàn Trường Trong Tuần.
 *  5. 📢 Thông Báo Công Bố Đợt TKB Mới & Ngày Áp Dụng.
 *  6. 📄 Xuất Link Tải PDF / Excel & Xem TKB Cá Nhân 1 Chạm Trên Mobile.
 *  7. ⏰ Tự Động Gửi Lời Nhắc Lịch Dạy Sáng Sớm (Daily Morning Brief 6h30).
 *  8. 📊 Đồng Bộ 1 Chạm Toàn Bộ Ma Trận TKB Lên Google Sheets (Sáng, Chiều, Giáo Viên).
 * ====================================================================================================
 */

// 🌟 1. CẤU HÌNH BOT TOKEN & HỆ THỐNG
const ZALO_BOT_TOKEN = "2294655560219778902:jzfmNEYGuXlSvmyKEYeCrbSWIKGrmumxQhoSsFXkgNBXsnOaWWDwTjSYqjoAdaqp"; 
const GOOGLE_SPREADSHEET_URL = ""; 
const FIREBASE_DATABASE_URL = "https://tkb-fet-default-rtdb.asia-southeast1.firebasedatabase.app/school_data.json";
const PUBLIC_WEB_PORTAL = "https://mrkhang-khoi.github.io/tkb/";
const MORNING_BRIEF_CHAT_ID = ""; // Điền Chat ID của nhóm trường nếu muốn gửi tự động vào nhóm mỗi sáng

/**
 * 2. Hàm đăng ký Webhook cho Zalo Bot (Chạy 1 lần trong Apps Script để kích hoạt Bot)
 */
function setZaloBotWebhook() {
  if (!ZALO_BOT_TOKEN) {
    Logger.log("❌ Vui lòng điền ZALO_BOT_TOKEN trước khi chạy!");
    return;
  }
  
  const webAppUrl = ScriptApp.getService().getUrl();
  if (!webAppUrl) {
    Logger.log("❌ Hãy Triển khai (Deploy) dự án thành Web App trước!");
    return;
  }
  
  const apiUrl = "https://bot-api.zaloplatforms.com/bot" + ZALO_BOT_TOKEN + "/setWebhook";
  const payload = {
    url: webAppUrl,
    secret_token: "ZaloBotTkb2026Secret"
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    Logger.log("✅ Kết quả đăng ký Webhook: " + response.getContentText());
  } catch (err) {
    Logger.log("❌ Lỗi khi đăng ký Webhook: " + err.toString());
  }
}

/**
 * 3. Xử lý yêu cầu GET (Kiểm tra trên trình duyệt hoặc API ngoài)
 */
function doGet(e) {
  const query = (e && e.parameter && e.parameter.query) ? e.parameter.query : (e && e.parameter && e.parameter.text ? e.parameter.text : "");
  
  if (!query) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      bot: "Bot Tra Cuu TKB 4.0",
      guide: "Thêm ?query=tkb [Tên GV hoặc Lớp] vào URL để tra cứu."
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const responseText = processSmartTimetableQuery(query);
  return ContentService.createTextOutput(responseText).setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 4. Xử lý Webhook POST từ Zalo Bot hoặc Admin Web
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
    
    // A. Lệnh đồng bộ dữ liệu từ Admin Web lên Google Sheets
    if (postData.action === "sync_timetable") {
      const result = syncDataToGoogleSheets(postData);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    // B. Tin nhắn nhận được từ Zalo Bot
    let userMessage = "";
    let chatId = "";
    
    if (postData.message) {
      userMessage = postData.message.text || "";
      if (postData.message.chat) {
        chatId = postData.message.chat.id;
      } else if (postData.message.from) {
        chatId = postData.message.from.id;
      }
    } else if (postData.text) {
      userMessage = postData.text;
      chatId = postData.chat_id || postData.sender_id || postData.user_id;
    } else if (postData.event_name === "user_send_text") {
      userMessage = postData.message ? postData.message.text : "";
      chatId = postData.sender ? postData.sender.id : "";
    }
    
    if (!chatId && postData.chat_id) chatId = postData.chat_id;
    
    if (userMessage) {
      const replyText = processSmartTimetableQuery(userMessage);
      
      if (replyText && chatId) {
        sendZaloBotReply(chatId, replyText);
        
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          chat_id: chatId,
          text: replyText
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "ignored" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 5. Gửi tin nhắn trả lời qua Zalo Bot API
 */
function sendZaloBotReply(chatId, text) {
  if (!ZALO_BOT_TOKEN || !chatId) return;
  const apiUrl = "https://bot-api.zaloplatforms.com/bot" + ZALO_BOT_TOKEN + "/sendMessage";
  const payload = {
    chat_id: String(chatId),
    text: text
  };
  
  try {
    UrlFetchApp.fetch(apiUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    console.error("Lỗi gửi tin qua Zalo Bot API:", e);
  }
}

/**
 * 6. Tự động gửi tin nhắn nhắc lịch dạy sáng sớm (Cài đặt Trigger chạy 6h30 sáng hàng ngày)
 */
function sendDailyMorningBrief() {
  if (!ZALO_BOT_TOKEN || !MORNING_BRIEF_CHAT_ID) {
    Logger.log("Chưa cấu hình MORNING_BRIEF_CHAT_ID để gửi tin tự động.");
    return;
  }
  
  const todayDay = parseDayFilter("hom nay") || "T2";
  const dayNames = { "T2": "Thứ Hai", "T3": "Thứ Ba", "T4": "Thứ Tư", "T5": "Thứ Năm", "T6": "Thứ Sáu", "T7": "Thứ Bảy" };
  
  const schoolData = fetchSchoolData();
  if (!schoolData) return;
  
  const dateStr = (new Date()).toLocaleDateString("vi-VN");
  let message = "╔══════════════════════════════╗\n" +
                "  🌅 LỊCH GIẢNG DẠY HÔM NAY (" + dayNames[todayDay] + " - " + dateStr + ")\n" +
                "╚══════════════════════════════╝\n" +
                "✨ Chúc quý Thầy/Cô một ngày làm việc tràn đầy năng lượng!\n\n" +
                "📌 Để tra cứu chi tiết lịch dạy của mình, Thầy/Cô vui lòng gõ:\n" +
                "👉 tkb [Tên của Thầy/Cô] (Ví dụ: tkb Trọng)\n\n" +
                "🌐 Hoặc xem bảng trực tuyến 1 chạm tại:\n" +
                PUBLIC_WEB_PORTAL + "?tra-cuu";
                
  sendZaloBotReply(MORNING_BRIEF_CHAT_ID, message);
}

/**
 * 7. BỘ NÃO XỬ LÝ NGÔN NGỮ TỰ NHIÊN & TRA CỨU TKB THÔNG MINH 4.0
 */
function processSmartTimetableQuery(rawMessage) {
  const text = (rawMessage || "").trim();
  const clean = removeVietnameseTones(text);
  
  if (!text) return null;
  
  // 1. Lệnh Trợ giúp / Menu chính
  if (clean === "menu" || clean === "help" || clean === "start" || clean === "/start" || clean === "tro giup" || clean === "huong dan" || clean === "?") {
    return getHelpMenuText();
  }
  
  // 2. Tra cứu Lịch Dạy Thay / Đổi Tiết
  if (clean.includes("day thay") || clean.includes("hoc thay") || clean.includes("doi tiet") || clean.includes("lich thay")) {
    return handleSubstitutionQuery(text);
  }
  
  // 3. Tìm Giáo Viên Đang Trống Tiết Dạy Thay (Smart Free Teacher Finder)
  if (clean.startsWith("tim gv") || clean.startsWith("gv trong") || clean.startsWith("ai ranh") || clean.includes("trong tiet") || clean.includes("ranh tiet")) {
    return handleFindFreeTeacherQuery(text);
  }
  
  // 4. Tra cứu thông báo Đợt TKB Mới
  if (clean === "tkb moi" || clean === "dot tkb" || clean === "thong bao" || clean === "thong bao tkb") {
    return handleNewTimetableAnnouncement();
  }
  
  // 5. Yêu cầu tải / in file PDF / Excel TKB
  if (clean.startsWith("in tkb") || clean.startsWith("pdf") || clean.startsWith("tai excel") || clean.startsWith("excel")) {
    return handleExportLinkQuery(text);
  }
  
  // 6. Xử lý các câu hỏi TKB theo ngôn ngữ tự nhiên
  return handleNaturalTimetableQuery(text, clean);
}

/**
 * Menu trợ giúp trực quan & hướng dẫn cú pháp
 */
function getHelpMenuText() {
  return "╔══════════════════════════════╗\n" +
         "  🤖 TRỢ LÝ THỜI KHÓA BIỂU 4.0\n" +
         "╚══════════════════════════════╝\n" +
         "Chào Thầy/Cô! Dưới đây là các lệnh tra cứu nhanh:\n\n" +
         "📅 1. TRA CỨU THỜI KHÓA BIỂU:\n" +
         "• tkb [Tên GV] -> Lịch dạy cả tuần (VD: tkb Trọng)\n" +
         "• tkb [Lớp] -> Lịch học cả tuần (VD: tkb 6a1)\n" +
         "• tkb [Tên/Lớp] hôm nay (hoặc mai, t2, t3, t4...)\n\n" +
         "👥 2. TÌM GV TRỐNG TIẾT DẠY THAY:\n" +
         "• tim gv toan t3 -> Tìm GV Toán trống tiết Thứ 3\n" +
         "• ai ranh van tiet 2 thu 4\n\n" +
         "🔄 3. LỊCH DẠY THAY TOÀN TRƯỜNG:\n" +
         "• day thay -> Xem danh sách các ca dạy thay tuần này\n\n" +
         "📄 4. TẢI FILE PDF / EXCEL:\n" +
         "• in tkb [Tên GV] (VD: in tkb Trọng)\n\n" +
         "🌐 5. CỔNG TRA CỨU WEB 1 CHẠM:\n" +
         PUBLIC_WEB_PORTAL + "?tra-cuu";
}

/**
 * Xử lý tra cứu Lịch Dạy Thay
 */
function handleSubstitutionQuery(text) {
  const schoolData = fetchSchoolData();
  if (!schoolData) return "❌ Không thể kết nối cơ sở dữ liệu trường.";
  
  const subs = schoolData.substitutions || [];
  if (subs.length === 0) {
    return "╔══════════════════════════════╗\n" +
           "  🔄 LỊCH DẠY THAY & HỌC THAY\n" +
           "╚══════════════════════════════╝\n" +
           "✨ Hiện tại không có ca dạy thay / học thay nào trong tuần này.";
  }
  
  let out = "╔══════════════════════════════╗\n" +
            "  🔄 LỊCH DẠY THAY & HỌC THAY\n" +
            "╚══════════════════════════════╝\n" +
            "📌 Cập nhật danh sách phân công dạy thay:\n\n";
            
  subs.forEach((s, idx) => {
    out += `${idx + 1}. Ngày ${s.date || s.day || "Trong tuần"} - Tiết ${s.period || ""}\n`;
    out += `   • Lớp: ${s.className || ""} | Môn: ${s.subject || ""}\n`;
    out += `   • GV nghỉ: ${s.originalTeacher || "N/A"}\n`;
    out += `   • 👉 GV DẠY THAY: ${s.substituteTeacher || "Chưa phân công"}\n`;
    if (s.note) out += `   • Ghi chú: ${s.note}\n`;
    out += "   ────────────────────────\n";
  });
  
  return out;
}

/**
 * Xử lý tìm giáo viên đang trống tiết (Smart Free Teacher Finder)
 */
function handleFindFreeTeacherQuery(text) {
  const schoolData = fetchSchoolData();
  if (!schoolData) return "❌ Không thể kết nối cơ sở dữ liệu trường.";
  
  const clean = removeVietnameseTones(text);
  const teachers = schoolData.teachers || [];
  const classes = schoolData.classes || [];
  const timetable = getActiveTimetable(schoolData).timetable;
  
  // Xác định ngày
  let day = parseDayFilter(clean) || "T2";
  
  // Xác định tiết (1 -> 5)
  let period = 1;
  const pMatch = clean.match(/tiet\s*(\d)|t(\d)/);
  if (pMatch) {
    period = parseInt(pMatch[1] || pMatch[2]);
  }
  
  // Xác định môn học / tổ
  let matchedGroup = null;
  const groups = schoolData.groups || [];
  groups.forEach(g => {
    if (g && g.name && clean.includes(removeVietnameseTones(g.name))) matchedGroup = g;
    if (g && g.subjects) {
      g.subjects.forEach(sub => {
        if (clean.includes(removeVietnameseTones(sub))) matchedGroup = g;
      });
    }
  });
  
  // Lọc danh sách GV thuộc môn/tổ đó (hoặc toàn bộ GV nếu không chỉ định môn)
  let candidateTeachers = teachers.filter(t => t && t.fullName && t.shortName);
  if (matchedGroup) {
    candidateTeachers = candidateTeachers.filter(t => t.group === matchedGroup.name || (t.groupId && t.groupId === matchedGroup.id));
  }
  
  // Kiểm tra ai đang TRỐNG tiết đó
  const freeTeachers = [];
  candidateTeachers.forEach(t => {
    let isBusy = false;
    classes.forEach(c => {
      if (timetable[c.name] && timetable[c.name][day] && timetable[c.name][day][period]) {
        if (timetable[c.name][day][period].teacher === t.shortName) {
          isBusy = true;
        }
      }
    });
    if (!isBusy) {
      freeTeachers.push(t);
    }
  });
  
  const dayNames = { "T2": "Thứ Hai", "T3": "Thứ Ba", "T4": "Thứ Tư", "T5": "Thứ Năm", "T6": "Thứ Sáu", "T7": "Thứ Bảy" };
  let out = "╔══════════════════════════════╗\n" +
            "  👥 GIÁO VIÊN TRỐNG TIẾT DẠY THAY\n" +
            "╚══════════════════════════════╝\n" +
            `🗓️ Thời gian: ${dayNames[day] || day} - Tiết ${period}\n` +
            (matchedGroup ? `📚 Bộ môn / Tổ: ${matchedGroup.name}\n` : "") +
            "────────────────────────────\n";
            
  if (freeTeachers.length === 0) {
    out += `⚠️ Rất tiếc, không có giáo viên nào đang trống ở Tiết ${period} ${dayNames[day] || day}.`;
  } else {
    out += `✅ Tìm thấy ${freeTeachers.length} Giáo viên đang TRỐNG TIẾT có thể phân công dạy thay:\n\n`;
    freeTeachers.forEach((t, i) => {
      out += `  ${i + 1}. 👤 ${t.fullName} (${t.shortName}) - Tổ: ${t.group || "N/A"}\n`;
    });
  }
  
  return out;
}

/**
 * Xử lý thông báo đợt TKB mới
 */
function handleNewTimetableAnnouncement() {
  const schoolData = fetchSchoolData();
  if (!schoolData) return "❌ Không thể kết nối cơ sở dữ liệu trường.";
  
  const active = getActiveTimetable(schoolData);
  return "╔══════════════════════════════╗\n" +
         "  📢 THÔNG BÁO THỜI KHÓA BIỂU\n" +
         "╚══════════════════════════════╝\n" +
         `📌 Đợt TKB hiện hành: ${active.weekName || "Thời khóa biểu chính thức"}\n` +
         `🗓️ Thời gian áp dụng: ${active.applyDate || "Đang áp dụng toàn trường"}\n` +
         "────────────────────────────\n" +
         "Thầy/Cô và các em học sinh có thể tra cứu nhanh bằng cách gõ:\n" +
         "👉 tkb [Tên GV hoặc Lớp]\n\n" +
         "🌐 Hoặc xem chi tiết tại Cổng trực tuyến:\n" +
         PUBLIC_WEB_PORTAL + "?tra-cuu";
}

/**
 * Xử lý gửi link tải PDF / Excel cá nhân
 */
function handleExportLinkQuery(text) {
  const parts = text.split(/\s+/);
  const keyword = parts[parts.length - 1];
  
  return "╔══════════════════════════════╗\n" +
         "  📄 TẢI FILE THỜI KHÓA BIỂU\n" +
         "╚══════════════════════════════╝\n" +
         `Dành cho đối tượng: ${keyword.toUpperCase()}\n\n` +
         "👉 Xem trực quan & In PDF / Xuất Excel 1 chạm tại:\n" +
         `${PUBLIC_WEB_PORTAL}?gv=${encodeURIComponent(keyword)}\n\n` +
         "💡 (Trang web đã tối ưu sẵn khổ in A4 ngang chuẩn Bộ GD&ĐT).";
}

/**
 * Xử lý tra cứu ngôn ngữ tự nhiên linh hoạt (AI NLP Timetable Resolver)
 */
function handleNaturalTimetableQuery(text, clean) {
  let queryTarget = "";
  
  // Bóc tách đối tượng từ câu hỏi tự nhiên
  if (clean.startsWith("tkb")) queryTarget = text.substring(3).trim();
  else if (clean.startsWith("thoi khoa bieu")) queryTarget = text.substring(14).trim();
  else if (clean.startsWith("lich day")) queryTarget = text.substring(8).trim();
  else if (clean.startsWith("lich hoc")) queryTarget = text.substring(8).trim();
  else queryTarget = text;
  
  const schoolData = fetchSchoolData();
  if (!schoolData) return "❌ Không thể kết nối cơ sở dữ liệu trường.";
  
  const teachers = schoolData.teachers || [];
  const classes = schoolData.classes || [];
  const activeTkb = getActiveTimetable(schoolData);
  const timetable = activeTkb.timetable;
  
  // Xác định ngày lọc
  const dayFilter = parseDayFilter(clean);
  const weekdays = dayFilter ? [dayFilter] : ["T2", "T3", "T4", "T5", "T6", "T7"];
  const weekDayLabels = { "T2": "Thứ 2", "T3": "Thứ 3", "T4": "Thứ 4", "T5": "Thứ 5", "T6": "Thứ 6", "T7": "Thứ 7" };
  
  // 1. Kiểm tra xem có khớp với Tên Lớp không
  const matchedClass = classes.find(c => c && clean.includes(removeVietnameseTones(c.name)));
  if (matchedClass) {
    const clsSchedule = timetable[matchedClass.name] || {};
    let out = "╔══════════════════════════════╗\n" +
              "  🏫 THỜI KHÓA BIỂU LỚP " + matchedClass.name + "\n" +
              "╚══════════════════════════════╝\n" +
              (activeTkb.weekName ? (`📌 ${activeTkb.weekName}` + (activeTkb.applyDate ? ` (${activeTkb.applyDate})\n` : "\n")) : "") +
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
        out += `\n🗓️ 【 ${(weekDayLabels[day] || day).toUpperCase()} 】\n`;
        slots.forEach(s => {
          out += `  • Tiết ${s.p}: ${s.sub}` + (s.tea ? ` (GV: ${s.tea})` : "") + "\n";
        });
      }
    });
    if (!hasSlots) out += "\n🌴 Lớp không có tiết học trong thời gian này.\n";
    out += `\n🌐 Xem bảng đầy đủ: ${PUBLIC_WEB_PORTAL}?lop=${encodeURIComponent(matchedClass.name)}`;
    return out;
  }
  
  // 2. Kiểm tra xem có khớp với Tên Giáo Viên không
  let matchedTeacher = teachers.find(t => t && t.shortName && clean.includes(removeVietnameseTones(t.shortName)));
  if (!matchedTeacher) {
    matchedTeacher = teachers.find(t => t && t.fullName && clean.includes(removeVietnameseTones(t.fullName)));
  }
  
  if (matchedTeacher) {
    let out = "╔══════════════════════════════╗\n" +
              "  📅 LỊCH GIẢNG DẠY GIÁO VIÊN\n" +
              "╚══════════════════════════════╝\n" +
              `👤 ${matchedTeacher.fullName} (${matchedTeacher.shortName})\n` +
              (activeTkb.weekName ? (`📌 ${activeTkb.weekName}` + (activeTkb.applyDate ? ` (${activeTkb.applyDate})\n` : "\n")) : "") +
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
        out += `\n🗓️ 【 ${(weekDayLabels[day] || day).toUpperCase()} 】\n`;
        if (morning.length > 0) {
          out += "  🌅 Buổi Sáng:\n";
          morning.sort((a,b) => a.p - b.p).forEach(s => out += `    • Tiết ${s.p}: ${s.sub} (Lớp ${s.cls})\n`);
        }
        if (afternoon.length > 0) {
          out += "  🌇 Buổi Chiều:\n";
          afternoon.sort((a,b) => a.p - b.p).forEach(s => out += `    • Tiết ${s.p}: ${s.sub} (Lớp ${s.cls})\n`);
        }
      }
    });
    
    if (!hasSlots) out += "\n🌴 Thầy/Cô không có tiết dạy trong thời gian này.\n";
    out += `\n🌐 Xem bảng chi tiết & In PDF: ${PUBLIC_WEB_PORTAL}?gv=${encodeURIComponent(matchedTeacher.shortName)}`;
    return out;
  }
  
  return "❌ Bot chưa nhận diện được Giáo viên hoặc Lớp trong câu hỏi của bạn.\n" +
         "💡 Gợi ý: Hãy gõ 'tkb [Tên]' (VD: 'tkb Trọng') hoặc 'help' để xem hướng dẫn.";
}

/**
 * Hàm lấy TKB đợt hiện hành
 */
function getActiveTimetable(schoolData) {
  let timetable = schoolData.timetable || {};
  let weekName = "Đợt hiện hành";
  let applyDate = schoolData.timetableApplyDate || "";
  
  if (schoolData.currentWeekId && schoolData.weeklyTimetables) {
    const wt = schoolData.weeklyTimetables.find(w => w && w.id === schoolData.currentWeekId);
    if (wt && wt.timetable) {
      timetable = wt.timetable;
      weekName = wt.weekName || weekName;
      applyDate = wt.applyDate || applyDate;
    }
  }
  return { timetable: timetable, weekName: weekName, applyDate: applyDate };
}

/**
 * Tải dữ liệu trường từ Firebase
 */
function fetchSchoolData() {
  try {
    const response = UrlFetchApp.fetch(FIREBASE_DATABASE_URL, { muteHttpExceptions: true });
    return JSON.parse(response.getContentText());
  } catch(e) {
    console.error("Lỗi fetch Firebase:", e);
    return null;
  }
}

/**
 * Đồng bộ dữ liệu lên Google Sheets
 */
function syncDataToGoogleSheets(payload) {
  let ss = null;
  const targetSheet = payload.spreadsheetUrl || payload.spreadsheetId || GOOGLE_SPREADSHEET_URL;
  if (targetSheet && targetSheet.trim() !== "") {
    try {
      if (targetSheet.startsWith("http")) ss = SpreadsheetApp.openByUrl(targetSheet.trim());
      else ss = SpreadsheetApp.openById(targetSheet.trim());
    } catch (e) {}
  }
  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
  }
  if (!ss) {
    ss = SpreadsheetApp.create("Thời Khóa Biểu - Dữ Liệu Tra Cứu Zalo");
  }
  
  const teachers = payload.teachers || [];
  const classes = payload.classes || [];
  const timetable = payload.timetable || {};
  const applyDate = payload.timetableApplyDate || "";
  const weekName = payload.weekName || "Đợt chính thức";
  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7"];
  const weekLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  
  // 1. Sheet Sáng
  let sheetMorning = ss.getSheetByName("TKB_Buoi_Sang");
  if (!sheetMorning) sheetMorning = ss.insertSheet("TKB_Buoi_Sang");
  sheetMorning.clear();
  const morningClasses = classes.filter(c => c && (c.session || "sáng").toLowerCase() === "sáng");
  const morningTitleRow = new Array(31).fill("");
  morningTitleRow[0] = "BẢNG THỜI KHÓA BIỂU BUỔI SÁNG - " + weekName.toUpperCase() + (applyDate ? " (" + applyDate + ")" : "");
  const morningHeaderDay = ["Lớp"];
  weekLabels.forEach(lbl => morningHeaderDay.push(lbl, "", "", "", ""));
  const morningHeaderPeriod = [""];
  for (let d = 0; d < 6; d++) morningHeaderPeriod.push("T1", "T2", "T3", "T4", "T5");
  const morningRows = [morningTitleRow, morningHeaderDay, morningHeaderPeriod];
  morningClasses.forEach(c => {
    const row = [c.name];
    weekdays.forEach(day => {
      for (let p = 1; p <= 5; p++) {
        if (timetable[c.name] && timetable[c.name][day] && timetable[c.name][day][p]) {
          const act = timetable[c.name][day][p];
          row.push(act.subject + (act.teacher ? "\n(" + act.teacher + ")" : ""));
        } else { row.push(""); }
      }
    });
    morningRows.push(row);
  });
  if (morningRows.length > 0) {
    const mRange = sheetMorning.getRange(1, 1, morningRows.length, 31);
    mRange.setValues(morningRows);
    mRange.setWrap(true);
    mRange.setVerticalAlignment("middle");
    sheetMorning.getRange(1, 1, 1, 31).merge().setFontWeight("bold").setFontSize(13).setHorizontalAlignment("center").setBackground("#dbeafe").setFontColor("#1e3a8a");
    for (let i = 0; i < 6; i++) sheetMorning.getRange(2, 2 + (i * 5), 1, 5).merge().setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f1f5f9");
    sheetMorning.getRange(3, 1, 1, 31).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#e2e8f0");
    if (morningClasses.length > 0) sheetMorning.getRange(4, 1, morningClasses.length, 1).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f8fafc");
    mRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
    sheetMorning.autoResizeColumns(1, 31);
  }
  
  // 2. Sheet Chiều
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
        } else { row.push(""); }
      }
    });
    afternoonRows.push(row);
  });
  if (afternoonRows.length > 0) {
    const aRange = sheetAfternoon.getRange(1, 1, afternoonRows.length, 31);
    aRange.setValues(afternoonRows);
    aRange.setWrap(true);
    aRange.setVerticalAlignment("middle");
    sheetAfternoon.getRange(1, 1, 1, 31).merge().setFontWeight("bold").setFontSize(13).setHorizontalAlignment("center").setBackground("#fef3c7").setFontColor("#92400e");
    for (let i = 0; i < 6; i++) sheetAfternoon.getRange(2, 2 + (i * 5), 1, 5).merge().setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f1f5f9");
    sheetAfternoon.getRange(3, 1, 1, 31).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#e2e8f0");
    if (afternoonClasses.length > 0) sheetAfternoon.getRange(4, 1, afternoonClasses.length, 1).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f8fafc");
    aRange.setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
    sheetAfternoon.autoResizeColumns(1, 31);
  }
  
  // 3. Sheet Giáo Viên
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
    sheetTeachers.getRange(1, 1, 1, 10).merge().setFontWeight("bold").setFontSize(13).setHorizontalAlignment("center").setBackground("#dcfce7").setFontColor("#166534");
    sheetTeachers.getRange(2, 1, 1, 10).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#f1f5f9");
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

function parseDayFilter(keyword) {
  if (!keyword) return null;
  const clean = removeVietnameseTones(keyword);
  const dayOfWeek = (new Date()).getDay();
  if (clean.includes("hom nay") || clean.includes("hn")) {
    const map = { 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7" };
    return map[dayOfWeek] || "T2";
  }
  if (clean.includes("mai") || clean.includes("ngay mai")) {
    const nextDay = (dayOfWeek + 1) % 7;
    const map = { 1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7" };
    return map[nextDay] || "T2";
  }
  if (clean.includes("t2") || clean.includes("thu 2") || clean.includes("thu hai")) return "T2";
  if (clean.includes("t3") || clean.includes("thu 3") || clean.includes("thu ba")) return "T3";
  if (clean.includes("t4") || clean.includes("thu 4") || clean.includes("thu tu")) return "T4";
  if (clean.includes("t5") || clean.includes("thu 5") || clean.includes("thu nam")) return "T5";
  if (clean.includes("t6") || clean.includes("thu 6") || clean.includes("thu sau")) return "T6";
  if (clean.includes("t7") || clean.includes("thu 7") || clean.includes("thu bay")) return "T7";
  return null;
}

function removeVietnameseTones(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}
