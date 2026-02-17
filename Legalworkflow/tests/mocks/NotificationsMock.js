/**
 * Mock for expo-notifications
 */

class NotificationsMock {
    constructor() {
        this.scheduledNotifications = [];
    }

    async scheduleNotificationAsync({ content, trigger }) {
        const id = `notif_${Math.random().toString(36).substr(2, 9)}`;
        this.scheduledNotifications.push({ id, content, trigger });
        return id;
    }

    async getPermissionsAsync() {
        return { status: 'granted' };
    }

    async requestPermissionsAsync() {
        return { status: 'granted' };
    }

    async cancelScheduledNotificationAsync(id) {
        this.scheduledNotifications = this.scheduledNotifications.filter(n => n.id !== id);
    }

    // Helper for tests
    getHistory() {
        return this.scheduledNotifications;
    }
}

module.exports = NotificationsMock;
