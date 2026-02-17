/**
 * Local notifications for deadline/priority alerts (Expo Notifications).
 * Note: Expo Go has limitations for remote push; local scheduling works.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const CASE_ALERTS_KEY = '@case_alerts_map'; // caseId -> [notificationIds]

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function getAlertsMap() {
  const raw = await AsyncStorage.getItem(CASE_ALERTS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function setAlertsMap(map) {
  await AsyncStorage.setItem(CASE_ALERTS_KEY, JSON.stringify(map || {}));
}

/**
 * Schedule a notification at a specific Date.
 */
export async function scheduleNotification({ title, body, date, data }) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: data || {} },
    trigger: date ? { date } : null,
  });
}

export async function cancelNotification(notificationId) {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all alerts scheduled for a specific caseId.
 */
export async function cancelCaseAlerts(caseId) {
  const map = await getAlertsMap();
  const ids = map[caseId] || [];
  for (const id of ids) {
    await cancelNotification(id).catch(() => {});
  }
  delete map[caseId];
  await setAlertsMap(map);
}

/**
 * Priority-based alert rules (CORE)
 * - High: 7 days, 2 days, due today
 * - Medium: 2 days, due today
 * - Low: due today
 *
 * Uses `deadline_date` if present, else `next_hearing_date`.
 */
export async function scheduleCaseAlerts(caseRow) {
  const granted = await requestNotificationPermission();
  if (!granted) return [];

  const dueStr = caseRow.deadline_date || caseRow.next_hearing_date;
  if (!dueStr) return [];
  const due = new Date(dueStr);
  if (Number.isNaN(due.getTime())) return [];

  const priority = caseRow.priority || 'Medium';
  const offsets =
    priority === 'High'
      ? [7, 2, 0]
      : priority === 'Medium'
        ? [2, 0]
        : [0];

  const now = new Date();
  const ids = [];

  for (const daysBefore of offsets) {
    const alertDate = new Date(due);
    alertDate.setDate(alertDate.getDate() - daysBefore);
    // fire at 9:00 AM local time for consistency
    alertDate.setHours(9, 0, 0, 0);
    if (alertDate.getTime() <= now.getTime()) continue;

    const title = daysBefore === 0 ? 'Deadline today' : `Deadline in ${daysBefore} day${daysBefore === 1 ? '' : 's'}`;
    const body = `${caseRow.case_title || 'Case'}${caseRow.court_name ? ` • ${caseRow.court_name}` : ''}`;

    const notifId = await scheduleNotification({
      title,
      body,
      date: alertDate,
      data: { caseId: caseRow.id },
    });
    ids.push(notifId);
  }

  if (ids.length) {
    const map = await getAlertsMap();
    map[caseRow.id] = ids;
    await setAlertsMap(map);
  }

  return ids;
}

