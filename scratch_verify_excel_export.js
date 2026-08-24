const fs = require('fs');
const vm = require('vm');

// Test running generateSpreadsheetML
const appCode = fs.readFileSync('app.js', 'utf8');

const sandbox = {
    console,
    Date,
    state: {
        teachers: [{ fullName: 'Nguyễn Văn A', shortName: 'N.V.A', group: 'g1' }],
        groups: [{ id: 'g1', name: 'Tổ Toán - Tin' }]
    }
};
sandbox.window = sandbox;
sandbox.window.addEventListener = () => {};
sandbox.global = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.localStorage = { getItem: () => null, setItem: () => null };
sandbox.document = {
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
};

vm.createContext(sandbox);
vm.runInContext(appCode, sandbox);

const localClasses = [
    { name: '6A1', session: 'sáng' },
    { name: '7A1', session: 'sáng' },
    { name: '6A2', session: 'chiều' }
];

const localTeachers = [
    { fullName: 'Nguyễn Văn A', shortName: 'N.V.A', subjects: ['Toán'] }
];

const localTimetable = {
    '6A1': {
        'T2': {
            1: { subject: 'Chào Cờ', teacher: 'N.V.A' },
            2: { subject: 'Toán', teacher: 'N.V.A' }
        }
    }
};

const xmlResult = sandbox.generateSpreadsheetML(localClasses, localTeachers, localTimetable);
fs.writeFileSync('test_output_clean.xls', xmlResult, 'utf8');

console.log('XML Size (bytes):', Buffer.byteLength(xmlResult));
if (xmlResult.includes('<Worksheet ss:Name="Buổi sáng">') &&
    xmlResult.includes('<Layout x:Orientation="Landscape"/>') &&
    xmlResult.includes('<Style ss:ID="DataCell">') &&
    !xmlResult.includes('x:FullRows="1"')) {
    console.log('\n✓ PASS: generateSpreadsheetML generates clean, print-ready, bordered Excel without extra bottom rows!');
} else {
    console.error('\n✗ FAIL: Attributes check failed!');
}
