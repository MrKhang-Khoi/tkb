const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('lib/xlsx.full.min.js', 'utf8');
const sandbox = { console };
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const XLSX = sandbox.XLSX;
const buffer = fs.readFileSync('TKB_EXCEL.xlsx');
const workbook = XLSX.read(buffer, { type: 'buffer' });

function parseTimetableFromExcel(wb) {
  const timetable = {};
  const classesFound = new Set();
  const teachersFound = new Set();
  const subjectsFound = new Set();

  const dayMap = {
    'thứ 2': 'T2', 'thu 2': 'T2', 't2': 'T2',
    'thứ 3': 'T3', 'thu 3': 'T3', 't3': 'T3',
    'thứ 4': 'T4', 'thu 4': 'T4', 't4': 'T4',
    'thứ 5': 'T5', 'thu 5': 'T5', 't5': 'T5',
    'thứ 6': 'T6', 'thu 6': 'T6', 't6': 'T6',
    'thứ 7': 'T7', 'thu 7': 'T7', 't7': 'T7'
  };

  ['Buổi sáng', 'Buổi chiều'].forEach(sheetName => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return;
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (data.length < 4) return;

    // Find class header row (usually row with "Thứ" and "Tiết")
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const row = data[r];
      if (row && row.some(cell => String(cell).toLowerCase().includes('thứ') || String(cell).toLowerCase().includes('tiết'))) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) headerRowIdx = 2; // default row 3 (0-indexed 2)
    const headerRow = data[headerRowIdx];
    
    // Classes are in columns 2..N
    const classCols = [];
    for (let c = 2; c < headerRow.length; c++) {
      const clsName = String(headerRow[c] || '').trim();
      if (clsName) {
        classCols.push({ col: c, name: clsName });
        classesFound.add(clsName);
        if (!timetable[clsName]) timetable[clsName] = {};
      }
    }

    let currentDay = 'T2';
    for (let r = headerRowIdx + 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const dayCell = String(row[0] || '').trim().toLowerCase();
      if (dayMap[dayCell]) {
        currentDay = dayMap[dayCell];
      }

      const periodCell = String(row[1] || '').trim();
      const pMatch = periodCell.match(/\d+/);
      if (!pMatch) continue;
      const period = parseInt(pMatch[0]);
      if (period < 1 || period > 5) continue;

      classCols.forEach(({ col, name: clsName }) => {
        const cellVal = String(row[col] || '').trim();
        if (!timetable[clsName][currentDay]) timetable[clsName][currentDay] = {};

        if (cellVal) {
          let subject = cellVal;
          let teacher = '';

          if (cellVal.includes('-')) {
            const lastDashIdx = cellVal.lastIndexOf('-');
            subject = cellVal.substring(0, lastDashIdx).trim();
            teacher = cellVal.substring(lastDashIdx + 1).trim();
          } else if (cellVal.includes('\n')) {
            const lines = cellVal.split('\n').map(l => l.trim()).filter(Boolean);
            subject = lines[0] || '';
            teacher = lines[1] ? lines[1].replace(/[()]/g, '').trim() : '';
          }

          timetable[clsName][currentDay][period] = {
            subject: subject,
            teacher: teacher
          };

          if (subject) subjectsFound.add(subject);
          if (teacher) teachersFound.add(teacher);
        }
      });
    }
  });

  return {
    timetable,
    classes: Array.from(classesFound),
    teachers: Array.from(teachersFound),
    subjects: Array.from(subjectsFound)
  };
}

const result = parseTimetableFromExcel(workbook);
console.log('Parsed Classes Count:', result.classes.length, result.classes);
console.log('Parsed Teachers Count:', result.teachers.length, result.teachers.slice(0, 20));
console.log('Parsed Subjects Count:', result.subjects.length, result.subjects);

console.log('\nSample Timetable for 6A1:');
console.log(JSON.stringify(result.timetable['6A1'], null, 2));

console.log('\nSample Timetable for 6A2:');
console.log(JSON.stringify(result.timetable['6A2'], null, 2));
