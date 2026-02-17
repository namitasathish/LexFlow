/**
 * Database Tests
 * Tests CRUD operations using the SQLite Mock.
 */

const ManualTestUtils = require('./ManualTestUtils');
const SQLiteMock = require('./mocks/SQLiteMock');

const tester = new ManualTestUtils('Database CRUD Tests');
const db = new SQLiteMock();

async function runTests() {
    tester.section('Case Creation (Insert)');

    const newCase = {
        id: 'case_123',
        title: 'Smith vs. Jones',
        status: 'Open'
    };

    const insertRes = await db.runAsync(
        'INSERT INTO cases (id, case_title, court_name, client_id, filing_date, next_hearing_date, deadline_date, priority, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [newCase.id, newCase.title, 'High Court', 'cl_1', null, null, null, 'High', newCase.status, '', '2026-02-17', '2026-02-17']
    );

    tester.expect(insertRes.changes, 1, 'Should return 1 change after successful insertion');

    tester.section('Case Retrieval (Fetch)');

    const fetched = await db.getFirstAsync('SELECT * FROM cases WHERE id = ?', [newCase.id]);
    tester.expect(fetched.case_title, newCase.title, 'Fetched case title should match the inserted title');
    tester.expect(fetched.id, newCase.id, 'Fetched case ID should match');

    tester.section('Case Update');

    const updatedTitle = 'Smith vs. Jones (Updated)';
    const updateRes = await db.runAsync(
        'UPDATE cases SET case_title = ?, court_name = ?, client_id = ?, filing_date = ?, next_hearing_date = ?, deadline_date = ?, priority = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?',
        [updatedTitle, 'High Court', 'cl_1', null, null, null, 'High', 'Open', '', '2026-02-17', newCase.id]
    );

    tester.expect(updateRes.changes, 1, 'Should return 1 change after successful update');

    const afterUpdate = await db.getFirstAsync('SELECT * FROM cases WHERE id = ?', [newCase.id]);
    tester.expect(afterUpdate.case_title, updatedTitle, 'Fetched case title should be updated');

    tester.section('Case Deletion');

    const deleteRes = await db.runAsync('DELETE FROM cases WHERE id = ?', [newCase.id]);
    tester.expect(deleteRes.changes, 1, 'Should return 1 change after successful deletion');

    const afterDelete = await db.getFirstAsync('SELECT * FROM cases WHERE id = ?', [newCase.id]);
    tester.expect(afterDelete, null, 'Case should not exist after deletion');

    tester.summary();
}

runTests().catch(err => console.error(err));
