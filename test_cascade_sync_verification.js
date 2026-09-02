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
  console.log(`Cascade sync test server running at http://localhost:${PORT}`);
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

    console.log('1. Thiết lập phiên làm việc Admin và nạp dữ liệu Master Data...');
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate(() => {
      state.currentUser = 'admin';
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('adminDashboard').style.display = 'block';
      document.getElementById('groupDashboard').style.display = 'none';
      document.getElementById('headerUserInfo').style.display = 'flex';
      state.globalSubjects = [
        { id: 'gs_toan', name: 'Toán' },
        { id: 'gs_tin', name: 'Tin' }
      ];
      state.groups = [
        { id: 'g_toan_tin', name: 'Tổ Toán - Tin', subjects: ['Toán', 'Tin'] }
      ];
      state.classes = [
        { id: 'c_6a1', name: '6A1', grade: '6', session: 'sáng', gvcn: 'N.Thuận' }
      ];
      state.teachers = [
        { id: 't_thuan', fullName: 'Ngô Thị Thuận', shortName: 'N.Thuận', group: 'g_toan_tin', quota: 19, homeroomClass: '6A1', subjects: ['Toán'] }
      ];
      state.subjects = [
        { id: 's_toan_6', name: 'Toán', grade: '6', periods: 4, group: 'g_toan_tin' }
      ];
      state.accounts = [
        { username: 'totruong_toan', password: '123', group: 'g_toan_tin', groupId: 'g_toan_tin' }
      ];
      state.assignments = {
        '6A1_s_toan_6': { teacher: 'N.Thuận', periods: 4 }
      };
      state.timetable = {
        '6A1': {
          'T2': { 1: { subject: 'Toán', teacher: 'N.Thuận' } }
        }
      };
      persistData();
      refreshActiveViews();
    });
    await new Promise(r => setTimeout(r, 400));

    console.log('2. [TEST CASE 1]: Đổi tên giáo viên N.Thuận -> N.T.Thuận');
    await page.evaluate(() => {
      const t = state.teachers.find(teacher => teacher.id === 't_thuan');
      t.fullName = 'Ngô Thị Thu Thuận';
      t.shortName = 'N.T.Thuận';
      renameTeacherShortNameInSystem('N.Thuận', 'N.T.Thuận');
      persistData();
      refreshActiveViews();
    });

    // Kiểm tra cascade teacher
    const teacherCascadeResult = await page.evaluate(() => {
      return {
        teacherShort: state.teachers[0].shortName,
        classGvcn: state.classes[0].gvcn,
        assignTeacher: state.assignments['6A1_s_toan_6'].teacher,
        timetableTeacher: state.timetable['6A1']['T2'][1].teacher
      };
    });
    console.log('Kết quả Cascade Teacher Rename:', teacherCascadeResult);
    if (teacherCascadeResult.classGvcn !== 'N.T.Thuận' || 
        teacherCascadeResult.assignTeacher !== 'N.T.Thuận' || 
        teacherCascadeResult.timetableTeacher !== 'N.T.Thuận') {
      throw new Error('Lỗi đồng bộ dây chuyền khi sửa tên giáo viên!');
    }

    console.log('3. [TEST CASE 2]: Đổi tên môn học Toán -> Toán Học');
    await page.evaluate(() => {
      renameSubjectNameInSystem('Toán', 'Toán Học');
      persistData();
      refreshActiveViews();
    });

    // Kiểm tra cascade subject
    const subjectCascadeResult = await page.evaluate(() => {
      return {
        globalSubName: state.globalSubjects.find(gs => gs.id === 'gs_toan').name,
        groupSubName: state.groups[0].subjects,
        subjectConfigName: state.subjects[0].name,
        teacherSubName: state.teachers[0].subjects,
        timetableSubName: state.timetable['6A1']['T2'][1].subject
      };
    });
    console.log('Kết quả Cascade Subject Rename:', subjectCascadeResult);
    if (subjectCascadeResult.globalSubName !== 'Toán Học' || 
        !subjectCascadeResult.groupSubName.includes('Toán Học') || 
        subjectCascadeResult.subjectConfigName !== 'Toán Học' || 
        subjectCascadeResult.timetableSubName !== 'Toán Học') {
      throw new Error('Lỗi đồng bộ dây chuyền khi sửa tên môn học!');
    }

    console.log('4. [TEST CASE 3]: Đổi tên lớp học 6A1 -> 6A_Chuyên');
    await page.evaluate(() => {
      const c = state.classes.find(cls => cls.id === 'c_6a1');
      c.name = '6A_Chuyên';
      renameClassInData('6A1', '6A_Chuyên');
      persistData();
      refreshActiveViews();
    });

    // Kiểm tra cascade class
    const classCascadeResult = await page.evaluate(() => {
      return {
        className: state.classes[0].name,
        hasNewAssignKey: !!state.assignments['6A_Chuyên_s_toan_6'],
        hasOldAssignKey: !!state.assignments['6A1_s_toan_6'],
        hasNewTimetableKey: !!state.timetable['6A_Chuyên'],
        hasOldTimetableKey: !!state.timetable['6A1']
      };
    });
    console.log('Kết quả Cascade Class Rename:', classCascadeResult);
    if (!classCascadeResult.hasNewAssignKey || classCascadeResult.hasOldAssignKey || !classCascadeResult.hasNewTimetableKey) {
      throw new Error('Lỗi đồng bộ dây chuyền khi sửa tên lớp học!');
    }

    console.log('5. Chuyển sang Giao Diện Tổ Trưởng (Tổ Toán - Tin)...');
    await page.evaluate(() => {
      state.currentUser = 'g_toan_tin';
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('adminDashboard').style.display = 'none';
      document.getElementById('groupDashboard').style.display = 'block';
      document.getElementById('headerUserInfo').style.display = 'flex';
      document.getElementById('userRoleBadge').innerText = 'Tổ: Tổ Toán - Tin';
      initGroupDashboard('g_toan_tin');
    });
    await new Promise(r => setTimeout(r, 600));

    // Chụp ảnh minh chứng giao diện tổ trưởng tự động cập nhật
    const screenshot24Path = path.join(ARTIFACT_DIR, 'evidence_24_group_leader_auto_updated_ui.png');
    await page.screenshot({ path: screenshot24Path });
    console.log('-> Đã lưu ảnh minh chứng 24: Giao diện Tổ Trưởng tự động cập nhật ->', screenshot24Path);

    // Kiểm tra nội dung hiển thị trên giao diện tổ trưởng
    const groupDashboardContent = await page.evaluate(() => {
      const container = document.getElementById('teacherAssignmentsContainer');
      return {
        text: container ? container.innerText : '',
        title: document.getElementById('groupTitle') ? document.getElementById('groupTitle').innerText : ''
      };
    });
    console.log('Nội dung hiển thị trên Dashboard Tổ Trưởng:');
    console.log(' - Tiêu đề tổ:', groupDashboardContent.title);
    console.log(' - Kiểm tra có chứa tên GV mới (N.T.Thuận):', groupDashboardContent.text.includes('N.T.Thuận'));
    console.log(' - Kiểm tra có chứa tên Môn mới (Toán Học):', groupDashboardContent.text.includes('Toán Học'));
    console.log(' - Kiểm tra có chứa tên Lớp mới (6A_Chuyên):', groupDashboardContent.text.includes('6A_Chuyên'));

    if (!groupDashboardContent.text.includes('N.T.Thuận') || 
        !groupDashboardContent.text.includes('Toán Học') || 
        !groupDashboardContent.text.includes('6A_Chuyên')) {
      throw new Error('Giao diện tổ trưởng chưa phản ánh đủ các thay đổi!');
    }

    await browser.close();
    console.log('\n=== TẤT CẢ TÍNH NĂNG TỰ ĐỘNG ĐỒNG BỘ DÂY CHUYỀN (CASCADE SYNC) ĐÃ VƯỢT QUA TEST 100%! ===');
    process.exit(0);
  } catch (err) {
    console.error('Test thất bại:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
