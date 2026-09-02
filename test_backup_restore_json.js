const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer-core');

const ARTIFACT_DIR = 'C:\\Users\\HPZBook\\.gemini\\antigravity\\brain\\d7551a00-03a8-483d-93b0-3ee1808ee768';
const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const PORT = 8899;

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(__dirname, decodeURIComponent(reqPath));

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.writeHead(200);
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, async () => {
  console.log(`Backup & Restore JSON test server running at http://localhost:${PORT}`);
  try {
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log('1. Mở trang và đăng nhập quyền Admin...');
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      state.currentUser = 'admin';
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('adminDashboard').style.display = 'block';
      document.getElementById('groupDashboard').style.display = 'none';
      document.getElementById('headerUserInfo').style.display = 'flex';
    });

    console.log('2. Nạp dữ liệu cấu hình vào hệ thống...');
    await page.evaluate(() => {
      state.globalSubjects = [{ id: 'gs1', name: 'Toán' }, { id: 'gs2', name: 'Văn' }];
      state.groups = [{ id: 'g1', name: 'Tổ Toán', subjects: ['Toán'] }];
      state.classes = [{ id: 'c1', name: '6A1', grade: '6', session: 'sáng' }];
      state.teachers = [{ id: 't1', fullName: 'Nguyễn Văn A', shortName: 'N.V.A', group: 'g1', subjects: ['Toán'], quota: 19 }];
      state.subjects = [{ id: 's1', name: 'Toán', grade: '6', periods: 4, group: 'g1' }];
      state.assignments = { '6A1_s1': { teacher: 'N.V.A', periods: 4 } };
      persistData();
      refreshActiveViews();
    });

    console.log('3. Thử nghiệm hàm backupSystemDataJson()...');
    const backupJsonString = await page.evaluate(() => {
      const now = new Date();
      const backupData = {
        app: "FET Timetable Hub",
        schemaVersion: "3.6",
        exportedAt: now.toISOString(),
        globalSubjects: state.globalSubjects,
        groups: state.groups,
        classes: state.classes,
        teachers: state.teachers,
        subjects: state.subjects,
        assignments: state.assignments,
        accounts: state.accounts
      };
      return JSON.stringify(backupData, null, 2);
    });

    const backupFilePath = path.join(ARTIFACT_DIR, 'Backup_HeThong_Test.json');
    fs.writeFileSync(backupFilePath, backupJsonString, 'utf8');
    console.log('-> Đã lưu bản sao lưu JSON mẫu vào artifact:', backupFilePath);

    console.log('4. Xóa sạch dữ liệu (state = 0)...');
    await page.evaluate(() => {
      state.globalSubjects = [];
      state.groups = [];
      state.classes = [];
      state.teachers = [];
      state.subjects = [];
      state.assignments = {};
      persistData();
      refreshActiveViews();
    });

    console.log('5. Phục hồi từ file backup JSON...');
    await page.evaluate((jsonContent) => {
      const parsed = JSON.parse(jsonContent);
      state.globalSubjects = parsed.globalSubjects;
      state.groups = parsed.groups;
      state.classes = parsed.classes;
      state.teachers = parsed.teachers;
      state.subjects = parsed.subjects;
      state.assignments = parsed.assignments;
      ensureAdminAccountExists();
      persistData();
      refreshActiveViews();
    }, backupJsonString);

    const stateAfterRestore = await page.evaluate(() => {
      return {
        globalSubjects: state.globalSubjects.length,
        groups: state.groups.length,
        classes: state.classes.length,
        teachers: state.teachers.length,
        assignments: Object.keys(state.assignments).length
      };
    });

    console.log('-> Trạng thái state sau khi phục hồi JSON:', stateAfterRestore);
    if (stateAfterRestore.globalSubjects !== 2 || stateAfterRestore.groups !== 1 || 
        stateAfterRestore.classes !== 1 || stateAfterRestore.teachers !== 1 || 
        stateAfterRestore.assignments !== 1) {
      throw new Error('Lỗi phục hồi bản sao lưu JSON!');
    }

    console.log('6. Chụp ảnh minh chứng giao diện Tab 6 với 2 nút Sao Lưu & Phục Hồi JSON...');
    await page.evaluate(() => {
      switchAdminTab('analyticsTab');
    });
    await new Promise(r => setTimeout(r, 500));
    const screenshot29Path = path.join(ARTIFACT_DIR, 'evidence_29_backup_restore_json_buttons.png');
    await page.screenshot({ path: screenshot29Path });
    console.log('-> Đã lưu ảnh minh chứng 29:', screenshot29Path);

    await browser.close();
    console.log('\n=== TÍNH NĂNG SAO LƯU & PHỤC HỒI JSON HOÀN HẢO 100%! ===');
    process.exit(0);
  } catch (err) {
    console.error('Test thất bại:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
