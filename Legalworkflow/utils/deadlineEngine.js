/**
 * Deadline Companion:
 * - urgent detection (≤2 days or overdue)
 * - today detection (due today)
 * - weekly workload view (next 7 days)
 *
 * Pure functions (operates on in-memory cases array).
 */

function parseISO(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysDiff(from, to) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/**
 * Determine which date should drive deadlines for a case.
 * Prefer `deadline_date`, otherwise use `next_hearing_date`.
 */
export function getCaseDueDate(caseRow) {
  return parseISO(caseRow.deadline_date) || parseISO(caseRow.next_hearing_date) || null;
}

/**
 * getUrgentCases()
 * - urgent = due within next 2 days OR overdue
 * - excludes status Closed
 */
export function getUrgentCases(cases) {
  const now = new Date();
  return (cases || [])
    .filter((c) => (c.status || 'Open') !== 'Closed')
    .map((c) => {
      const due = getCaseDueDate(c);
      const diff = due ? daysDiff(now, due) : null;
      const overdue = diff !== null && diff < 0;
      const dueSoon = diff !== null && diff <= 2;
      return { ...c, _dueDate: due, _daysLeft: diff, _overdue: overdue, _dueSoon: dueSoon };
    })
    .filter((c) => c._overdue || c._dueSoon)
    .sort((a, b) => (a._daysLeft ?? 9999) - (b._daysLeft ?? 9999));
}

/**
 * getTodayCases()
 * - cases with due date = today
 * - excludes status Closed
 */
export function getTodayCases(cases) {
  const now = new Date();
  return (cases || [])
    .filter((c) => (c.status || 'Open') !== 'Closed')
    .map((c) => {
      const due = getCaseDueDate(c);
      const diff = due ? daysDiff(now, due) : null;
      return { ...c, _dueDate: due, _daysLeft: diff };
    })
    .filter((c) => c._daysLeft === 0);
}

/**
 * getWeeklyCases()
 * - cases with due date in next 7 days (including today)
 * - excludes status Closed
 */
export function getWeeklyCases(cases) {
  const now = new Date();
  return (cases || [])
    .filter((c) => (c.status || 'Open') !== 'Closed')
    .map((c) => {
      const due = getCaseDueDate(c);
      const diff = due ? daysDiff(now, due) : null;
      return { ...c, _dueDate: due, _daysLeft: diff };
    })
    .filter((c) => c._daysLeft !== null && c._daysLeft >= 0 && c._daysLeft <= 7)
    .sort((a, b) => (a._daysLeft ?? 9999) - (b._daysLeft ?? 9999));
}

/**
 * getOverdueCases()
 * - cases past their deadline
 * - excludes status Closed
 */
export function getOverdueCases(cases) {
  const now = new Date();
  return (cases || [])
    .filter((c) => (c.status || 'Open') !== 'Closed')
    .map((c) => {
      const due = getCaseDueDate(c);
      const diff = due ? daysDiff(now, due) : null;
      return { ...c, _dueDate: due, _daysLeft: diff };
    })
    .filter((c) => c._daysLeft !== null && c._daysLeft < 0)
    .sort((a, b) => (a._daysLeft ?? 9999) - (b._daysLeft ?? 9999));
}

/**
 * Group weekly cases by day label (YYYY-MM-DD).
 */
export function groupByDay(casesWithDueDate) {
  const groups = {};
  for (const c of casesWithDueDate || []) {
    const d = c._dueDate;
    if (!d) continue;
    const key = d.toISOString().slice(0, 10);
    groups[key] = groups[key] || [];
    groups[key].push(c);
  }
  return groups;
}
