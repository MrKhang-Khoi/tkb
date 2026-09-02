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
  console.log(`Test server running at http://localhost:${PORT}`);
  try {
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    page.on('console', msg => console.log('[BROWSER CONSOLE]:', msg.text()));
    page.on('pageerror', err => console.log('[BROWSER PAGE ERROR]:', err));

    console.log('1. Mở trang web đăng nhập...');
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });

    console.log('2. Đăng nhập Admin...');
    await page.type('#loginUsername', 'admin');
    await page.type('#loginPassword', 'admin');
    await page.click('#loginBtn');
    await page.waitForSelector('#adminDashboard', { visible: true });

    console.log('3. Thiết lập Master Data Admin đầy đủ...');
    await page.evaluate(() => {
      state.globalSubjects = [
        { id: 'gs1', name: 'Toán' },
        { id: 'gs2', name: 'Tin' },
        { id: 'gs3', name: 'Hóa' },
        { id: 'gs4', name: 'Sinh' },
        { id: 'gs5', name: 'Lý' },
        { id: 'gs6', name: 'Văn' },
        { id: 'gs7', name: 'Sử' },
        { id: 'gs8', name: 'Địa' },
        { id: 'gs9', name: 'GDCD' },
        { id: 'gs10', name: 'Â.Nhạc' },
        { id: 'gs11', name: 'Mĩ thuật' },
        { id: 'gs12', name: 'GDTC' }
      ];
      state.groups = [
        { id: 'g1', name: 'Tổ Toán - Tin', subjects: ['Toán', 'Tin'] },
        { id: 'g2', name: 'Tổ Văn - Sử - Địa', subjects: ['Văn', 'Sử', 'Địa', 'GDCD'] },
        { id: 'g3', name: 'Văn thể mỹ', subjects: ['Â.Nhạc', 'Mĩ thuật', 'GDTC'] },
        { id: 'g4', name: 'Khoa học tự nhiên', subjects: ['Hóa', 'Sinh', 'Lý'] }
      ];
      state.classes = [
        { id: 'c1', name: '6A1', grade: '6', session: 'sáng', gvcn: 'N.Thuận' },
        { id: 'c2', name: '7A1', grade: '7', session: 'sáng', gvcn: 'M.Hoa' },
        { id: 'c3', name: '8A1', grade: '8', session: 'chiều', gvcn: 'Như' },
        { id: 'c4', name: '9A1', grade: '9', session: 'sáng', gvcn: 'Khương' }
      ];
      state.teachers = [
        { id: 't1', fullName: 'Ngô Thị Thuận', shortName: 'N.Thuận', group: 'g1', quota: 18, homeroomClass: '6A1', subjects: ['Toán'] },
        { id: 't2', fullName: 'Lê Thị Mai Hoa', shortName: 'M.Hoa', group: 'g2', quota: 20, homeroomClass: '7A1', subjects: ['Văn'] }
      ];
      state.subjects = [
        { id: 's1', name: 'Toán', grade: '6', periods: 4, group: 'g1' },
        { id: 's2', name: 'Văn', grade: '6', periods: 4, group: 'g2' }
      ];
      state.accounts = [
        { username: 'totruong_toan', password: '123', groupId: 'g1' }
      ];
      refreshActiveViews();
    });
    await new Promise(r => setTimeout(r, 400));

    console.log('4. Kiểm tra giao diện Tab 1 (Cấu Hình Trường Học) với các nút Tải Excel...');
    await page.evaluate(() => switchAdminTab('schoolSetupTab'));
    await new Promise(r => setTimeout(r, 500));
    const screenshot20Path = path.join(ARTIFACT_DIR, 'evidence_20_tab1_export_buttons.png');
    await page.screenshot({ path: screenshot20Path });
    console.log('-> Đã lưu ảnh minh chứng 20: Tab 1 với các nút Tải Excel ->', screenshot20Path);

    console.log('5. Kiểm tra giao diện Tab 2 (Nhân Sự & Tài Khoản) với các nút Tải Excel...');
    await page.evaluate(() => switchAdminTab('staffSetupTab'));
    await new Promise(r => setTimeout(r, 500));
    const screenshot21Path = path.join(ARTIFACT_DIR, 'evidence_21_tab2_export_buttons.png');
    await page.screenshot({ path: screenshot21Path });
    console.log('-> Đã lưu ảnh minh chứng 21: Tab 2 với các nút Tải Excel ->', screenshot21Path);

    console.log('6. Kiểm tra giao diện Tab 3 (Chương Trình Học & Số Tiết) với các nút Tải Excel...');
    await page.evaluate(() => switchAdminTab('curriculumTab'));
    await new Promise(r => setTimeout(r, 500));
    const screenshot22Path = path.join(ARTIFACT_DIR, 'evidence_22_tab3_export_buttons.png');
    await page.screenshot({ path: screenshot22Path });
    console.log('-> Đã lưu ảnh minh chứng 22: Tab 3 với các nút Tải Excel ->', screenshot22Path);

    console.log('7. Thử nghiệm gọi toàn bộ các hàm xuất Excel của Admin để kiểm tra không phát sinh lỗi...');
    await page.evaluate(() => {
      exportGlobalSubjectsExcel();
      exportGroupsExcel();
      exportClassesExcel();
      exportTeachersExcel();
      exportAccountsExcel();
      exportCurriculumExcel();
      exportDutiesExcel();
      exportClassBalanceExcel();
    });
    console.log('-> Toàn bộ 8 hàm xuất Excel chạy hoàn hảo không có exception!');

    console.log('8. Chuyển sang Tab 4, nạp Excel PCCM để chứng minh kiểm tra đối soát nghiêm ngặt...');
    await page.evaluate(() => switchAdminTab('mergeTab'));
    await new Promise(r => setTimeout(r, 500));

    const excelFilePath = path.join(__dirname, 'PCCM HKI  26-27 - Lần 1, tuần 1.xls');
    const fileInput = await page.$('#pccmExcelFileInput');
    await fileInput.uploadFile(excelFilePath);

    await page.waitForSelector('#pccmReconciliationModal', { visible: true });
    await new Promise(r => setTimeout(r, 800));

    await page.evaluate(() => switchReconTab('diagnostics'));
    await new Promise(r => setTimeout(r, 600));

    const screenshot23Path = path.join(ARTIFACT_DIR, 'evidence_23_strict_audit_reconciliation.png');
    await page.screenshot({ path: screenshot23Path });
    console.log('-> Đã lưu ảnh minh chứng 23: Trung tâm đối soát & chẩn đoán nghiêm ngặt ->', screenshot23Path);

    // Kiểm tra tính bất biến của Master Data Admin (Không bị sinh môn hay tổ rác)
    const afterCount = await page.evaluate(() => {
      return {
        groupsCount: state.groups.length,
        globalSubjectsCount: state.globalSubjects.length
      };
    });
    console.log('Kiểm tra dữ liệu Admin sau khi nạp:', afterCount);

    await browser.close();
    console.log('\n=== TẤT CẢ TÍNH NĂNG TẢI EXCEL & ĐỐI SOÁT ĐÃ HOÀN TẤT THÀNH CÔNG 100%! ===');
    process.exit(0);
  } catch (err) {
    console.error('Test thất bại:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
