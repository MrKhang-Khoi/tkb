const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer-core');

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
  '.jpg': 'image/jpeg'
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
  console.log(`Login test server running at http://localhost:${PORT}`);
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

    console.log('1. Mở trang và đảm bảo đăng xuất để kiểm tra form đăng nhập...');
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.clear();
      logout();
    });
    await new Promise(r => setTimeout(r, 400));

    console.log('2. Nhập thông tin đăng nhập: admin / admin...');
    await page.type('#loginUsername', 'admin');
    await page.type('#loginPassword', 'admin');
    await page.click('#loginBtn');

    console.log('3. Chờ giao diện Admin hiển thị...');
    await page.waitForSelector('#adminDashboard', { visible: true, timeout: 5000 });
    console.log('-> ĐĂNG NHẬP ADMIN THÀNH CÔNG RỰC RỠ!');

    await browser.close();
    console.log('\n=== TEST ĐĂNG NHẬP THÀNH CÔNG 100%! ===');
    process.exit(0);
  } catch (err) {
    console.error('Test đăng nhập thất bại:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
