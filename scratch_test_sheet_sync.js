const https = require('https');
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

// 1. Parse timetable from Excel as app.js does
const dayMap = {
    'thứ 2': 'T2', 'thu 2': 'T2', 't2': 'T2',
    'thứ 3': 'T3', 'thu 3': 'T3', 't3': 'T3',
    'thứ 4': 'T4', 'thu 4': 'T4', 't4': 'T4',
    'thứ 5': 'T5', 'thu 5': 'T5', 't5': 'T5',
    'thứ 6': 'T6', 'thu 6': 'T6', 't6': 'T6',
    'thứ 7': 'T7', 'thu 7': 'T7', 't7': 'T7'
};

const classesMetadata = [];
const teacherSet = new Set();
const timetable = {};

['Buổi sáng', 'Buổi chiều'].forEach(sheetName => {
    const isAfternoon = sheetName.toLowerCase().includes('chiều');
    const session = isAfternoon ? 'chiều' : 'sáng';
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rows.length < 4) return;

    const headerRow = rows[2];
    const classCols = [];
    for (let c = 2; c < headerRow.length; c++) {
        const clsName = String(headerRow[c] || '').trim();
        if (clsName && clsName.length >= 2) {
            classCols.push({ col: c, name: clsName });
            if (!classesMetadata.some(item => item.name.toLowerCase() === clsName.toLowerCase())) {
                classesMetadata.push({ name: clsName, session: session });
            }
            if (!timetable[clsName]) timetable[clsName] = {};
        }
    }

    let currentDay = 'T2';
    for (let r = 3; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const dayCell = String(row[0] || '').trim().toLowerCase();
        if (dayMap[dayCell]) currentDay = dayMap[dayCell];

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
                }
                timetable[clsName][currentDay][period] = { subject, teacher };
                if (teacher) teacherSet.add(teacher);
            }
        });
    }
});

const teachersList = Array.from(teacherSet).map(t => ({ fullName: t, shortName: t, group: '' }));

const payload = {
    action: "sync_timetable",
    spreadsheetUrl: "",
    teachers: teachersList,
    classes: classesMetadata,
    timetable: timetable,
    weekName: "Tuần 1 - Học kỳ I (Excel TKB)",
    timetableApplyDate: "Áp dụng từ Thứ Hai 24/08/2026"
};

console.log('Sending sync test payload to Google Apps Script...');
console.log('Classes Count:', classesMetadata.length);
console.log('Teachers Count:', teachersList.length);

const postData = JSON.stringify(payload);
const webhookUrl = 'https://script.google.com/macros/s/AKfycbxVmGzjDVBLFilgPthtok2J5QOxifOEoUyLkIbGSCXY1jm9xm41oU4kvWBypdeVPpNF/exec';

function sendPost(urlStr, data) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            // Google Apps Script redirects 302
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log('Following redirect to:', res.headers.location);
                return sendGet(res.headers.location).then(resolve).catch(reject);
            }
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function sendGet(urlStr) {
    return new Promise((resolve, reject) => {
        https.get(urlStr, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return sendGet(res.headers.location).then(resolve).catch(reject);
            }
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        }).on('error', reject);
    });
}

sendPost(webhookUrl, postData).then(res => {
    console.log('\n=== RESPONSE FROM GOOGLE APPS SCRIPT ===');
    console.log('HTTP Status:', res.status);
    console.log('Response Body:', res.body);
}).catch(err => {
    console.error('Error sending sync payload:', err);
});
