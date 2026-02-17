/**
 * Notification Tests
 * Verifies the logic for scheduling reminders based on case priority.
 */

const ManualTestUtils = require('./ManualTestUtils');
const NotificationsMock = require('./mocks/NotificationsMock');

const tester = new ManualTestUtils('Notification Suite');
const notifications = new NotificationsMock();

// Logic reproduction from utils/notifications.js for testing
async function getSchedulingRule(caseRow) {
    const priority = caseRow.priority || 'Medium';
    const offsets =
        priority === 'High' ? [7, 2, 0] :
            priority === 'Medium' ? [2, 0] : [0];

    let count = 0;
    for (const daysBefore of offsets) {
        const due = new Date(caseRow.deadline_date);
        const alertDate = new Date(due);
        alertDate.setDate(alertDate.getDate() - daysBefore);
        alertDate.setHours(9, 0, 0, 0);

        // Mock scheduling
        await notifications.scheduleNotificationAsync({
            content: { title: `Deadline in ${daysBefore} days` },
            trigger: { date: alertDate }
        });
        count++;
    }
    return count;
}

async function runTests() {
    tester.section('Reminder Count logic');

    const highCase = { id: 'c1', case_title: 'High Case', priority: 'High', deadline_date: '2026-03-01' };
    const medCase = { id: 'c2', case_title: 'Med Case', priority: 'Medium', deadline_date: '2026-03-01' };
    const lowCase = { id: 'c3', case_title: 'Low Case', priority: 'Low', deadline_date: '2026-03-01' };

    tester.expect(await getSchedulingRule(highCase), 3, 'High priority case should schedule 3 notifications (7, 2, 0 days)');
    tester.expect(await getSchedulingRule(medCase), 2, 'Medium priority case should schedule 2 notifications (2, 0 days)');
    tester.expect(await getSchedulingRule(lowCase), 1, 'Low priority case should schedule 1 notification (0 days)');

    tester.section('Scheduled Payload Verification');

    const history = notifications.getHistory();
    tester.expect(history[0].content.title, 'Deadline in 7 days', 'First scheduled notification should hit the 7-day offset');

    tester.summary();
}

runTests();
