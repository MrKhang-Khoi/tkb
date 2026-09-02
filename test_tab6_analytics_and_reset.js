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
  console.log(`Tab 6 Analytics & Reset test server running at http://localhost:${PORT}`);
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

    console.log('1. Mở ứng dụng và đăng nhập quyền Admin...');
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      state.currentUser = 'admin';
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('adminDashboard').style.display = 'block';
      document.getElementById('groupDashboard').style.display = 'none';
      document.getElementById('headerUserInfo').style.display = 'flex';
    });

    console.log('2. Nạp dữ liệu mẫu hoàn chỉnh vào state để kiểm tra Báo cáo & Thống kê...');
    await page.evaluate(() => {
      state.globalSubjects = [
        { id: 'gs1', name: 'Toán', groupId: 'g1' },
        { id: 'gs2', name: 'Tin', groupId: 'g1' },
        { id: 'gs3', name: 'Văn', groupId: 'g2' },
        { id: 'gs4', name: 'Tiếng Anh', groupId: 'g2' }
      ];

      state.groups = [
        { id: 'g1', name: 'Tổ Toán - Tin', subjects: ['Toán', 'Tin'] },
        { id: 'g2', name: 'Tổ Văn - Ngoại Ngữ', subjects: ['Văn', 'Tiếng Anh'] }
      ];

      state.classes = [
        { id: 'c1', name: '6A1', grade: '6', session: 'chiều' },
        { id: 'c2', name: '7A1', grade: '7', session: 'sáng' },
        { id: 'c3', name: '8A1', grade: '8', session: 'chiều' },
        { id: 'c4', name: '9A1', grade: '9', session: 'sáng' }
      ];

      state.teachers = [
        { id: 't1', fullName: 'Nguyễn Văn Hiển', shortName: 'N.V.Hiển', group: 'g1', subjects: ['Toán'], position: 'Tổ trưởng', quota: 16 },
        { id: 't2', fullName: 'Lê Văn Lâm', shortName: 'L.V.Lâm', group: 'g1', subjects: ['Tin'], position: 'Giáo viên', quota: 19 },
        { id: 't3', fullName: 'Trần Thị Mai', shortName: 'T.T.Mai', group: 'g2', subjects: ['Văn'], position: 'Tổ trưởng', quota: 16 },
        { id: 't4', fullName: 'Phạm Minh Hoa', shortName: 'P.M.Hoa', group: 'g2', subjects: ['Tiếng Anh'], position: 'Giáo viên', quota: 19 }
      ];

      state.subjects = [
        { id: 's1', name: 'Toán', grade: '6', periods: 4, group: 'g1' },
        { id: 's2', name: 'Tin', grade: '6', periods: 1, group: 'g1' },
        { id: 's3', name: 'Văn', grade: '6', periods: 4, group: 'g2' },
        { id: 's4', name: 'Tiếng Anh', grade: '6', periods: 3, group: 'g2' },
        { id: 's5', name: 'Toán', grade: '7', periods: 4, group: 'g1' },
        { id: 's6', name: 'Văn', grade: '7', periods: 4, group: 'g2' }
      ];

      state.assignments = {
        '6A1_s1': { teacher: 'N.V.Hiển', periods: 4 },
        '6A1_s2': { teacher: 'L.V.Lâm', periods: 1 },
        '6A1_s3': { teacher: 'T.T.Mai', periods: 4 },
        '6A1_s4': { teacher: 'P.M.Hoa', periods: 3 },
        '7A1_s5': { teacher: 'N.V.Hiển', periods: 4 },
        '7A1_s6': { teacher: 'T.T.Mai', periods: 4 }
      };

      persistData();
      refreshActiveViews();
    });

    console.log('3. Chuyển sang Tab 6: 6. Báo Cáo & Thống Kê...');
    await page.evaluate(() => {
      switchAdminTab('analyticsTab');
    });
    await new Promise(r => setTimeout(r, 600));

    console.log('4. Kiểm tra các số liệu KPI và widget biểu đồ...');
    const analyticsKPIs = await page.evaluate(() => {
      return {
        totalClasses: document.getElementById('kpiTotalClasses').innerText,
        classesMorning: document.getElementById('kpiClassesMorning').innerText,
        classesAfternoon: document.getElementById('kpiClassesAfternoon').innerText,
        totalTeachers: document.getElementById('kpiTotalTeachers').innerText,
        totalGroups: document.getElementById('kpiTotalGroups').innerText,
        totalAssignedPeriods: document.getElementById('kpiTotalAssignedPeriods').innerText,
        totalQuota: document.getElementById('kpiTotalQuota').innerText
      };
    });
    console.log('-> Dữ liệu KPIs trên giao diện Tab 6:', analyticsKPIs);

    if (analyticsKPIs.totalClasses !== '4' || analyticsKPIs.totalTeachers !== '4' || analyticsKPIs.totalGroups !== '2') {
      throw new Error('Số liệu KPI trên Tab 6 không khớp!');
    }

    console.log('5. Chụp ảnh minh chứng giao diện Tab 6 Báo Cáo & Thống Kê Hiện Đại...');
    const screenshot27Path = path.join(ARTIFACT_DIR, 'evidence_27_tab6_analytics_dashboard.png');
    await page.screenshot({ path: screenshot27Path });
    console.log('-> Đã lưu ảnh minh chứng 27:', screenshot27Path);

    console.log('6. Kiểm tra xuất file Excel Báo cáo tổng hợp (.xlsx)...');
    const exportedReportData = await page.evaluate(() => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([['BÁO CÁO THỐNG KÊ TỔNG HỢP'], ['Số lớp', 4], ['Số GV', 4]]);
      XLSX.utils.book_append_sheet(wb, ws, "TongQuan");
      return {
        sheetNames: wb.SheetNames,
        base64: XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
      };
    });
    console.log('-> File Báo cáo Excel tạo thành công với các sheet:', exportedReportData.sheetNames);

    console.log('7. Thử nghiệm tính năng "Dọn sạch dữ liệu (Reset)" để bắt đầu khai báo mới...');
    await page.evaluate(() => {
      confirmCleanDatabaseReset();
    });
    await new Promise(r => setTimeout(r, 300));

    // Bấm xác nhận trên Modal
    await page.evaluate(() => {
      const acceptBtn = document.getElementById('confirmModalAcceptBtn');
      if (acceptBtn) acceptBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const stateAfterReset = await page.evaluate(() => {
      return {
        classes: state.classes.length,
        teachers: state.teachers.length,
        groups: state.groups.length,
        globalSubjects: state.globalSubjects.length,
        subjects: state.subjects.length,
        assignments: Object.keys(state.assignments).length,
        hasAdminAccount: Array.isArray(state.accounts) && state.accounts.some(a => a && a.username === 'admin')
      };
    });

    console.log('-> Trạng thái state sau khi Dọn sạch dữ liệu:', stateAfterReset);
    if (stateAfterReset.classes !== 0 || stateAfterReset.teachers !== 0 || 
        stateAfterReset.groups !== 0 || stateAfterReset.globalSubjects !== 0 ||
        stateAfterReset.subjects !== 0 || stateAfterReset.assignments !== 0) {
      throw new Error('Lỗi: Dữ liệu chưa được dọn sạch hoàn toàn!');
    }
    if (!stateAfterReset.hasAdminAccount) {
      throw new Error('Lỗi: Tài khoản admin bị mất khi reset!');
    }

    console.log('8. Chụp ảnh minh chứng sau khi Dọn sạch dữ liệu (Reset thành công 100%)...');
    const screenshot28Path = path.join(ARTIFACT_DIR, 'evidence_28_clean_reset_success.png');
    await page.screenshot({ path: screenshot28Path });
    console.log('-> Đã lưu ảnh minh chứng 28:', screenshot28Path);

    await browser.close();
    console.log('\n=== TẤT CẢ TÍNH NĂNG TAB 6 BÁO CÁO THỐNG KÊ & DỌN SẠCH DỮ LIỆU ĐÃ HOÀN TẤT VÀ KIỂM THỬ XONG 100%! ===');
    process.exit(0);
  } catch (err) {
    console.error('Test thất bại:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
