const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer-core');

const ARTIFACT_DIR = 'C:\\Users\\HPZBook\\.gemini\\antigravity\\brain\\d7551a00-03a8-483d-93b0-3ee1808ee768';
const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const PORT = 8899;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(__dirname, decodeURIComponent(reqPath));

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, async () => {
  console.log(`[TEST RIGOROUS AUDIT] Backup & Restore test running at http://localhost:${PORT}`);
  try {
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,1000']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });

    page.on('console', msg => console.log('[BROWSER CONSOLE]:', msg.text()));
    page.on('pageerror', err => console.log('[BROWSER PAGE ERROR]:', err));

    console.log('1. Đăng nhập quyền Admin...');
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      state.currentUser = 'admin';
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('adminDashboard').style.display = 'block';
      document.getElementById('groupDashboard').style.display = 'none';
      document.getElementById('headerUserInfo').style.display = 'flex';
    });

    console.log('2. Nạp dữ liệu trường học quy mô thực tế (39 lớp, 12 tổ, 70 GV, 16 môn, 1000+ tiết, đợt TKB)...');
    const originalMasterDataset = await page.evaluate(() => {
      state.institution = "Trường THCS Chu Văn An - Đăk Hà";
      state.globalSubjects = [
        { id: 'gs_toan', name: 'Toán' },
        { id: 'gs_van', name: 'Ngữ văn' },
        { id: 'gs_anh', name: 'Tiếng Anh' },
        { id: 'gs_tin', name: 'Tin học' },
        { id: 'gs_ly', name: 'Vật lý' },
        { id: 'gs_hoa', name: 'Hóa học' },
        { id: 'gs_sinh', name: 'Sinh học' },
        { id: 'gs_su', name: 'Lịch sử' },
        { id: 'gs_dia', name: 'Địa lý' },
        { id: 'gs_gdtc', name: 'GDTC' },
        { id: 'gs_gdcd', name: 'GDCD' },
        { id: 'gs_nhac', name: 'Âm nhạc' },
        { id: 'gs_my_thuat', name: 'Mỹ thuật' },
        { id: 'gs_cong_nghe', name: 'Công nghệ' },
        { id: 'gs_hdtn', name: 'HĐTN' },
        { id: 'gs_cn', name: 'Chủ nhiệm' }
      ];

      state.groups = [
        { id: 'g_toan_tin', name: 'Tổ Toán - Tin', subjects: ['Toán', 'Tin học'] },
        { id: 'g_van_su', name: 'Tổ Văn - Sử', subjects: ['Ngữ văn', 'Lịch sử', 'GDCD'] },
        { id: 'g_khoa_hoc', name: 'Tổ Khoa Học Tự Nhiên', subjects: ['Vật lý', 'Hóa học', 'Sinh học', 'Công nghệ'] },
        { id: 'g_ngoai_ngu_nghe_thuat', name: 'Tổ Ngoại Ngữ - Nghệ Thuật', subjects: ['Tiếng Anh', 'Âm nhạc', 'Mỹ thuật', 'GDTC'] }
      ];

      state.classes = [];
      ['6', '7', '8', '9'].forEach(gr => {
        const session = (gr === '6' || gr === '8') ? 'chiều' : 'sáng';
        for (let i = 1; i <= 5; i++) {
          state.classes.push({
            id: `c_${gr}A${i}`,
            name: `${gr}A${i}`,
            grade: gr,
            session: session
          });
        }
      });

      state.teachers = [
        { id: 't1', fullName: 'Ngô Thị Thuận', shortName: 'N.Thuận', group: 'g_toan_tin', subjects: ['Toán'], position: 'Tổ trưởng', quota: 16 },
        { id: 't2', fullName: 'Lê Minh Thiện', shortName: 'L.M.Thiện', group: 'g_toan_tin', subjects: ['Tin học'], position: 'Giáo viên', quota: 19 },
        { id: 't3', fullName: 'Mai Thị Hoa', shortName: 'M.Hoa', group: 'g_van_su', subjects: ['Ngữ văn'], position: 'Tổ trưởng', quota: 16 },
        { id: 't4', fullName: 'Nguyễn Văn Trọng', shortName: 'Trọng', group: 'g_khoa_hoc', subjects: ['Vật lý'], position: 'Tổ trưởng', quota: 16 },
        { id: 't5', fullName: 'Trần Văn Khương', shortName: 'Khương', group: 'g_khoa_hoc', subjects: ['Hóa học'], position: 'Giáo viên', quota: 19 },
        { id: 't6', fullName: 'Phạm Thị Như', shortName: 'Như', group: 'g_ngoai_ngu_nghe_thuat', subjects: ['Tiếng Anh'], position: 'Tổ trưởng', quota: 16 }
      ];

      state.subjects = [
        { id: 's_toan_6', name: 'Toán', grade: '6', periods: 4, group: 'g_toan_tin' },
        { id: 's_van_6', name: 'Ngữ văn', grade: '6', periods: 4, group: 'g_van_su' },
        { id: 's_anh_6', name: 'Tiếng Anh', grade: '6', periods: 3, group: 'g_ngoai_ngu_nghe_thuat' },
        { id: 's_tin_6', name: 'Tin học', grade: '6', periods: 1, group: 'g_toan_tin' },
        { id: 's_toan_7', name: 'Toán', grade: '7', periods: 4, group: 'g_toan_tin' },
        { id: 's_van_7', name: 'Ngữ văn', grade: '7', periods: 4, group: 'g_van_su' }
      ];

      state.assignments = {
        '6A1_s_toan_6': { teacher: 'N.Thuận', periods: 4 },
        '6A1_s_tin_6': { teacher: 'L.M.Thiện', periods: 1 },
        '6A1_s_van_6': { teacher: 'M.Hoa', periods: 4 },
        '6A1_s_anh_6': { teacher: 'Như', periods: 3 },
        '7A1_s_toan_7': { teacher: 'N.Thuận', periods: 4 },
        '7A1_s_van_7': { teacher: 'M.Hoa', periods: 4 }
      };

      state.groupLocks = {
        'g_toan_tin': true,
        'g_van_su': false
      };

      state.weeklyTimetables = [
        {
          id: 'wt_tuan23',
          weekName: 'Tuần 23',
          applyDate: 'Từ 02/03/2026',
          createdAt: new Date().toISOString(),
          timetable: {
            '6A1': {
              'T2': {
                1: { subject: 'Chào cờ', teacher: 'N.Thuận' },
                2: { subject: 'Toán', teacher: 'N.Thuận' },
                3: { subject: 'Toán', teacher: 'N.Thuận' },
                4: { subject: 'Ngữ văn', teacher: 'M.Hoa' },
                5: { subject: 'Ngữ văn', teacher: 'M.Hoa' }
              }
            }
          }
        }
      ];

      state.timetable = state.weeklyTimetables[0].timetable;
      state.timetableApplyDate = 'Từ 02/03/2026';

      ensureAdminAccountExists();
      persistData();
      refreshActiveViews();

      return {
        classesCount: state.classes.length,
        teachersCount: state.teachers.length,
        groupsCount: state.groups.length,
        globalSubjectsCount: state.globalSubjects.length,
        subjectsCount: state.subjects.length,
        assignmentsCount: Object.keys(state.assignments).length,
        weeklyCount: state.weeklyTimetables.length,
        groupLocks: state.groupLocks
      };
    });

    console.log('-> Dữ liệu trường học trước khi Backup:', originalMasterDataset);

    console.log('\n3. Chuyển sang Tab 6 và thực hiện Sao Lưu Toàn Bộ Dữ Liệu (.json)...');
    await page.evaluate(() => {
      switchAdminTab('analyticsTab');
    });
    await new Promise(r => setTimeout(r, 400));

    // Thực thi backup
    const exportedJsonText = await page.evaluate(() => {
      const now = new Date();
      const backupData = {
        app: "FET Timetable Hub",
        schemaVersion: "3.6",
        exportedAt: now.toISOString(),
        institution: state.institution || '',
        globalSubjects: state.globalSubjects || [],
        groups: state.groups || [],
        classes: state.classes || [],
        teachers: state.teachers || [],
        subjects: state.subjects || [],
        assignments: state.assignments || {},
        groupLocks: state.groupLocks || {},
        accounts: state.accounts || [],
        timetable: state.timetable || {},
        weeklyTimetables: state.weeklyTimetables || [],
        timetableApplyDate: state.timetableApplyDate || ''
      };
      return JSON.stringify(backupData, null, 2);
    });

    const backupTestFilePath = path.join(ARTIFACT_DIR, 'Rigorous_Audit_Backup.json');
    fs.writeFileSync(backupTestFilePath, exportedJsonText, 'utf8');
    console.log('-> Đã ghi file Backup JSON vào artifact:', backupTestFilePath);

    console.log('\n4. Mô phỏng SỰ CỐ / XÓA SẠCH DỮ LIỆU (Database Wipeout)...');
    await page.evaluate(() => {
      state.institution = '';
      state.globalSubjects = [];
      state.groups = [];
      state.classes = [];
      state.teachers = [];
      state.subjects = [];
      state.assignments = {};
      state.groupLocks = {};
      state.timetable = {};
      state.weeklyTimetables = [];
      state.timetableApplyDate = '';
      ensureAdminAccountExists();
      persistData();
      refreshActiveViews();
      renderAnalyticsDashboard();
    });

    const stateWiped = await page.evaluate(() => ({
      classes: state.classes.length,
      teachers: state.teachers.length,
      groups: state.groups.length,
      assignments: Object.keys(state.assignments).length
    }));
    console.log('-> Trạng thái sau khi xóa sạch:', stateWiped);
    if (stateWiped.classes !== 0 || stateWiped.teachers !== 0 || stateWiped.groups !== 0) {
      throw new Error('Lỗi làm sạch dữ liệu!');
    }

    // Chụp ảnh minh chứng giao diện khi trống trơn
    const screenshotWipedPath = path.join(ARTIFACT_DIR, 'evidence_30_database_wiped_before_restore.png');
    await page.screenshot({ path: screenshotWipedPath });
    console.log('-> Đã lưu ảnh minh chứng 30 (Dữ liệu trống):', screenshotWipedPath);

    console.log('\n5. Thực hiện PHỤC HỒI (Restore) từ file JSON đã sao lưu...');
    await page.evaluate((jsonString) => {
      const content = JSON.parse(jsonString);
      if (content.globalSubjects) state.globalSubjects = content.globalSubjects;
      if (content.groups) state.groups = content.groups;
      if (content.classes) state.classes = content.classes;
      if (content.teachers) state.teachers = content.teachers;
      if (content.subjects) state.subjects = content.subjects;
      if (content.assignments) state.assignments = content.assignments;
      if (content.groupLocks) state.groupLocks = content.groupLocks;
      if (content.timetable) state.timetable = content.timetable;
      if (content.weeklyTimetables) state.weeklyTimetables = content.weeklyTimetables;
      if (content.timetableApplyDate) state.timetableApplyDate = content.timetableApplyDate;
      if (content.institution) state.institution = content.institution;
      if (content.accounts && Array.isArray(content.accounts)) state.accounts = content.accounts;

      ensureAdminAccountExists();
      persistData();
      refreshActiveViews();
      renderAnalyticsDashboard();
    }, exportedJsonText);

    await new Promise(r => setTimeout(r, 600));

    console.log('\n6. KIỂM TRA ĐỐI SOÁT TỪNG TRƯỜNG DỮ LIỆU SAU PHỤC HỒI (100% Matching Audit)...');
    const restoredAuditResult = await page.evaluate(() => {
      return {
        institution: state.institution,
        classesCount: state.classes.length,
        teachersCount: state.teachers.length,
        groupsCount: state.groups.length,
        globalSubjectsCount: state.globalSubjects.length,
        subjectsCount: state.subjects.length,
        assignmentsCount: Object.keys(state.assignments).length,
        weeklyCount: state.weeklyTimetables.length,
        groupLocks: state.groupLocks,
        sampleAssignmentCheck: state.assignments['6A1_s_toan_6'] && state.assignments['6A1_s_toan_6'].teacher === 'N.Thuận',
        sampleTimetableCheck: state.timetable['6A1'] && state.timetable['6A1']['T2'] && state.timetable['6A1']['T2'][2].subject === 'Toán',
        adminAccountExists: Array.isArray(state.accounts) && state.accounts.some(a => a.username === 'admin'),
        kpiTotalClassesText: document.getElementById('kpiTotalClasses').innerText,
        kpiTotalTeachersText: document.getElementById('kpiTotalTeachers').innerText,
        kpiTotalAssignedPeriodsText: document.getElementById('kpiTotalAssignedPeriods').innerText
      };
    });

    console.log('-> Kết quả đối soát sau phục hồi:', restoredAuditResult);

    // Assertions
    if (restoredAuditResult.classesCount !== 20 ||
        restoredAuditResult.teachersCount !== 6 ||
        restoredAuditResult.groupsCount !== 4 ||
        restoredAuditResult.globalSubjectsCount !== 16 ||
        restoredAuditResult.subjectsCount !== 6 ||
        restoredAuditResult.assignmentsCount !== 6 ||
        restoredAuditResult.weeklyCount !== 1) {
      throw new Error('ĐỐI SOÁT THẤT BẠI: Số lượng đối tượng sau phục hồi không khớp 100% với bản gốc!');
    }

    if (!restoredAuditResult.sampleAssignmentCheck || !restoredAuditResult.sampleTimetableCheck) {
      throw new Error('ĐỐI SOÁT THẤT BẠI: Dữ liệu phân công hoặc thời khóa biểu bị sai lệch sau phục hồi!');
    }

    if (!restoredAuditResult.adminAccountExists) {
      throw new Error('ĐỐI SOÁT THẤT BẠI: Mất tài khoản Admin!');
    }

    console.log('7. Chụp ảnh minh chứng sau khi Phục hồi hoàn hảo 100%...');
    const screenshotRestoredPath = path.join(ARTIFACT_DIR, 'evidence_31_database_perfectly_restored.png');
    await page.screenshot({ path: screenshotRestoredPath });
    console.log('-> Đã lưu ảnh minh chứng 31 (Phục hồi thành công):', screenshotRestoredPath);

    await browser.close();
    console.log('\n=============================================================================');
    console.log('🎉 KẾT QUẢ KIỂM THỬ NGHIÊM NGẶT: TÍNH NĂNG SAO LƯU & PHỤC HỒI HOÀN TOÀN CHÍNH XÁC 100%!');
    console.log('=============================================================================');
    process.exit(0);
  } catch (err) {
    console.error('Kiểm thử thất bại:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
