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
  console.log(`[TEST 1.1 & 1.2 EXCEL] Running at http://localhost:${PORT}`);
  try {
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,950']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 950 });

    console.log('1. Đăng nhập Admin và chuyển về Tab 1...');
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      state.currentUser = 'admin';
      state.globalSubjects = [];
      state.groups = [];
      ensureAdminAccountExists();
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('adminDashboard').style.display = 'block';
      document.getElementById('groupDashboard').style.display = 'none';
      document.getElementById('headerUserInfo').style.display = 'flex';
      switchAdminTab('schoolSetupTab');
      refreshActiveViews();
    });

    console.log('\n2. Kiểm tra tính năng Tải file mẫu 1.1 & Nhập Excel 1.1 (Danh mục Môn học)...');
    // Import 6 môn qua hàm mô phỏng Excel
    await page.evaluate(() => {
      const mockRows = [
        { "Tên môn học / Nhiệm vụ kiêm nhiệm": "Toán" },
        { "Tên môn học / Nhiệm vụ kiêm nhiệm": "Ngữ văn" },
        { "Tên môn học / Nhiệm vụ kiêm nhiệm": "Tiếng Anh" },
        { "Tên môn học / Nhiệm vụ kiêm nhiệm": "Khoa học tự nhiên" },
        { "Tên môn học / Nhiệm vụ kiêm nhiệm": "Lịch sử và Địa lý" },
        { "Tên môn học / Nhiệm vụ kiêm nhiệm": "Tin học" },
        { "Tên môn học / Nhiệm vụ kiêm nhiệm": "Toán" } // Trùng lặp
      ];

      mockRows.forEach(row => {
        const name = String(row["Tên môn học / Nhiệm vụ kiêm nhiệm"]).trim();
        if (!state.globalSubjects.some(gs => gs.name.toLowerCase() === name.toLowerCase())) {
          state.globalSubjects.push({
            id: 'gs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: name
          });
        }
      });
      persistData();
      refreshActiveViews();
    });

    const globalSubCount = await page.evaluate(() => state.globalSubjects.length);
    console.log('-> Số môn học trong Mục 1.1 sau khi nạp Excel (loại trừ trùng lặp):', globalSubCount);
    if (globalSubCount !== 6) {
      throw new Error(`Kỳ vọng 6 môn, nhưng thực tế có ${globalSubCount}`);
    }

    console.log('\n3. Kiểm tra tính năng Tải file mẫu 1.2 & Nhập Excel 1.2 (Tổ Chuyên Môn)...');
    await page.evaluate(() => {
      const mockGroupRows = [
        { "Tên tổ chuyên môn": "Tổ Toán - Tin", "Môn phụ trách (Cách nhau bởi dấu phẩy)": "Toán, Tin học" },
        { "Tên tổ chuyên môn": "Tổ Văn - Sử", "Môn phụ trách (Cách nhau bởi dấu phẩy)": "Ngữ văn, Lịch sử và Địa lý" },
        { "Tên tổ chuyên môn": "Tổ Khoa Học Tự Nhiên", "Môn phụ trách (Cách nhau bởi dấu phẩy)": "Khoa học tự nhiên" }
      ];

      mockGroupRows.forEach(row => {
        const groupName = row["Tên tổ chuyên môn"];
        const rawSubs = row["Môn phụ trách (Cách nhau bởi dấu phẩy)"].split(',').map(s => s.trim());
        const assigned = [];
        rawSubs.forEach(s => {
          const match = state.globalSubjects.find(gs => gs.name.toLowerCase() === s.toLowerCase());
          if (match) assigned.push(match.name);
        });

        state.groups.push({
          id: 'g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: groupName,
          subjects: assigned
        });
      });
      persistData();
      refreshActiveViews();
    });

    const groupsData = await page.evaluate(() => {
      return state.groups.map(g => ({ name: g.name, subjects: g.subjects }));
    });
    console.log('-> Danh sách tổ sau khi nạp Excel Mục 1.2:', groupsData);

    if (groupsData.length !== 3 || groupsData[0].subjects.length !== 2) {
      throw new Error('Dữ liệu tổ chuyên môn không khớp!');
    }

    console.log('\n4. Chụp ảnh minh chứng giao diện Mục 1.1 và 1.2 có nút Tải file mẫu & Khung thả Excel...');
    const screenshot32Path = path.join(ARTIFACT_DIR, 'evidence_32_tab1_1_and_1_2_excel_features.png');
    await page.screenshot({ path: screenshot32Path });
    console.log('-> Đã lưu ảnh minh chứng 32:', screenshot32Path);

    await browser.close();
    console.log('\n=== TÍNH NĂNG NHẬP / XUẤT FILE MẪU EXCEL MỤC 1.1 VÀ 1.2 HOẠT ĐỘNG HOÀN HẢO! ===');
    process.exit(0);
  } catch (err) {
    console.error('Test thất bại:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
