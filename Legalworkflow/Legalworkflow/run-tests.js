/**
 * Master Test Runner
 * Executes all manual test suites for the Legal Workflow project.
 */

const { execSync } = require('child_process');

const tests = [
    'tests/unit.test.js',
    'tests/db.test.js',
    'tests/functionality.test.js',
    'tests/notifications.test.js'
];

console.log('=========================================');
console.log('   LEGAL WORKFLOW - MASTER TEST RUNNER  ');
console.log('=========================================\n');

let totalPassed = true;

tests.forEach(testFile => {
    try {
        console.log(`Running: node ${testFile}`);
        const output = execSync(`node ${testFile}`, { encoding: 'utf-8' });
        console.log(output);
        if (output.includes('Failed:')) {
            totalPassed = false;
        }
    } catch (error) {
        console.error(`ERROR running ${testFile}:`, error.message);
        totalPassed = false;
    }
});

console.log('=========================================');
if (totalPassed) {
    console.log('✅ ALL TEST SUITES EXECUTED SUCCESSFULLY');
} else {
    console.log('❌ SOME TESTS FAILED. PLEASE REVIEW ABOVE.');
}
console.log('=========================================');
