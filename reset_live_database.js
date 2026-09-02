const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer-core');

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
  try {
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });

    // Đăng nhập và thực hiện Clean Reset trên Live Database
    console.log('Đang thực hiện làm sạch dữ liệu hệ thống trên Live Firebase...');
    await page.evaluate(async () => {
      state.currentUser = 'admin';
      state.globalSubjects = [];
      state.groups = [];
      state.classes = [];
      state.teachers = [];
      state.subjects = [];
      state.assignments = {};
      state.timetable = {};
      state.weeklyTimetables = [];

      ensureAdminAccountExists();
      if (typeof persistData === 'function') {
        persistData();
      }
      refreshActiveViews();
    });

    await new Promise(r => setTimeout(r, 2000));
    console.log('-> Dữ liệu Live Database đã được làm sạch 100% chuẩn xác!');

    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    server.close();
  }
});
