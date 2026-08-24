/**
 * Test Group Subject Assignment & Filtering
 */
const state = {
    groups: [
        { id: 'g_toantin', name: 'Tổ Toán - Tin', subjects: ['Toán', 'Tin học', 'Hoạt động trải nghiệm'] },
        { id: 'g_vansudia', name: 'Tổ Văn - Sử - Địa', subjects: ['Ngữ văn', 'Lịch sử', 'Địa lí'] }
    ],
    globalSubjects: [
        { id: 's1', name: 'Toán', groupId: 'g_toantin' },
        { id: 's2', name: 'Tin học', groupId: 'g_toantin' },
        { id: 's3', name: 'Hoạt động trải nghiệm', groupId: 'g_toantin' },
        { id: 's4', name: 'Ngữ văn', groupId: 'g_vansudia' },
        { id: 's5', name: 'Tiếng Anh', groupId: '' },
        { id: 's6', name: 'Giáo dục thể chất', groupId: '' }
    ],
    subjects: [
        { id: 'sub_1', name: 'Toán', grade: '6', periods: 4 },
        { id: 'sub_2', name: 'Tin học', grade: '6', periods: 1 },
        { id: 'sub_3', name: 'Ngữ văn', grade: '6', periods: 4 },
        { id: 'sub_4', name: 'Kiêm nhiệm', grade: 'Kiêm nhiệm', periods: 2 }
    ]
};

function getGroupSubjectDropdownItems(groupId) {
    const groupObj = state.groups.find(g => g && g.id === groupId);
    if (!groupObj) return [];

    const dutyNames = new Set(state.subjects.filter(s => s && s.grade === 'Kiêm nhiệm').map(s => s.name.toLowerCase()));
    const groupSubjectNames = new Set();
    if (groupObj.subjects && Array.isArray(groupObj.subjects)) {
        groupObj.subjects.forEach(sub => sub && groupSubjectNames.add(sub));
    }

    const subjectNamesFromGlobal = state.globalSubjects.filter(gs => gs).map(gs => gs.name);
    const subjectNamesFromSubjects = state.subjects.filter(s => s && s.grade !== 'Kiêm nhiệm').map(s => s.name);
    const allUniqueSubjectNames = [...new Set([...subjectNamesFromGlobal, ...subjectNamesFromSubjects])]
        .filter(name => name && !dutyNames.has(name.toLowerCase()));

    const groupList = [];
    allUniqueSubjectNames.forEach(name => {
        if (groupSubjectNames.has(name)) {
            groupList.push(name);
        }
    });
    groupList.sort((a, b) => a.localeCompare(b, 'vi'));

    if (groupList.length > 0) {
        return groupList.map(name => ({ value: name, label: `⭐ ${name}` }));
    } else {
        return allUniqueSubjectNames.sort((a, b) => a.localeCompare(b, 'vi')).map(name => ({ value: name, label: name }));
    }
}

console.log('Testing Dropdown for Tổ Toán - Tin:');
const toanTinDropdown = getGroupSubjectDropdownItems('g_toantin');
console.log(toanTinDropdown);

if (toanTinDropdown.length === 3 && toanTinDropdown.some(i => i.value === 'Toán') && toanTinDropdown.some(i => i.value === 'Tin học') && toanTinDropdown.some(i => i.value === 'Hoạt động trải nghiệm')) {
    console.log('\n✓ PASS: Tổ Toán - Tin CHỈ hiển thị đúng 3 môn được phân công (Toán, Tin học, HĐTN)!');
} else {
    console.error('\n✗ FAIL: Dropdown subjects mismatch!');
}
