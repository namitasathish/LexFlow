/**
 * Manual Testing Utilities
 * A simple library to provide professional logging and assertions for academic demo tests.
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
};

class ManualTestUtils {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.passed = 0;
        this.failed = 0;
    }

    section(name) {
        console.log(`\n${colors.bright}${colors.cyan}--- ${name} ---${colors.reset}`);
    }

    expect(actual, expected, description) {
        const isMatched = JSON.stringify(actual) === JSON.stringify(expected);
        if (isMatched) {
            console.log(`${colors.green}✓ PASS:${colors.reset} ${description}`);
            this.passed++;
            return true;
        } else {
            console.log(`${colors.red}✗ FAIL:${colors.reset} ${description}`);
            console.log(`  Expected: ${JSON.stringify(expected)}`);
            console.log(`  Actual:   ${JSON.stringify(actual)}`);
            this.failed++;
            return false;
        }
    }

    summary() {
        console.log(`\n${colors.bright}${this.suiteName} Summary:${colors.reset}`);
        console.log(`${colors.green}Passed: ${this.passed}${colors.reset}`);
        if (this.failed > 0) {
            console.log(`${colors.red}Failed: ${this.failed}${colors.reset}`);
        } else {
            console.log(`${colors.green}All tests passed!${colors.reset}`);
        }
    }
}

module.exports = ManualTestUtils;
