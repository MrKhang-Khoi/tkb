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

['Buổi sáng', 'Buổi chiều'].forEach(sheetName => {
  console.log('====================================================');
  console.log('SHEET:', sheetName);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log('Total Rows:', data.length);
  data.forEach((row, idx) => {
    const day = row[0];
    const period = row[1];
    const firstFew = row.slice(2, 6);
    console.log(`Row ${idx+1}: Day=[${day}], Period=[${period}], Classes[0..3]=${JSON.stringify(firstFew)}`);
  });
});
