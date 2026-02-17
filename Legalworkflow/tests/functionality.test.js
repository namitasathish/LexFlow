/**
 * Functionality Tests
 * Tests high-level app features like form validation and search logic.
 */

const ManualTestUtils = require('./ManualTestUtils');
const tester = new ManualTestUtils('Functionality Tests');

// --- Mock Logic ---

const formLogic = {
    validateCaseForm: (caseTitle) => {
        if (!caseTitle || caseTitle.trim() === '') {
            return { valid: false, error: 'Case Title is required' };
        }
        return { valid: true };
    }
};

const searchLogic = {
    filterCases: (cases, search, statusFilter) => {
        let list = cases;
        const q = search.trim().toLowerCase();

        if (q) {
            list = list.filter((c) =>
                (c.case_title || '').toLowerCase().includes(q) ||
                (c.court_name || '').toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'All') {
            list = list.filter((c) => c.status === statusFilter);
        }

        return list;
    }
};

// --- Test Suite ---

tester.section('Form Validation (Add Case Screen)');

tester.expect(formLogic.validateCaseForm('Property Dispute').valid, true, 'Valid title should pass validation');
tester.expect(formLogic.validateCaseForm('').valid, false, 'Empty title should fail validation');
tester.expect(formLogic.validateCaseForm('   ').valid, false, 'Whitespace title should fail validation');

tester.section('Search and Filtering (Home Screen)');

const sampleCases = [
    { id: '1', case_title: 'Smith vs Jones', court_name: 'High Court', status: 'Open' },
    { id: '2', case_title: 'Divorce Proceeding', court_name: 'Family Court', status: 'Closed' },
    { id: '3', case_title: 'Land Dispute', court_name: 'Civil Court', status: 'Open' }
];

tester.expect(searchLogic.filterCases(sampleCases, 'Smith', 'All').length, 1, 'Search for "Smith" should return 1 case');
tester.expect(searchLogic.filterCases(sampleCases, 'Dispute', 'All').length, 1, 'Search for "Dispute" should return 1 case');
tester.expect(searchLogic.filterCases(sampleCases, '', 'Open').length, 2, 'Filter by "Open" status should return 2 cases');
tester.expect(searchLogic.filterCases(sampleCases, 'Nonexistent', 'All').length, 0, 'Search for non-existent text should return 0 cases');

tester.summary();
