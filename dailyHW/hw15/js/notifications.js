/**
 * notifications.js
 * Handles Web Notification permission and alarm scheduling via setTimeout.
 */

const Notifications = (() => {
  // Map of taskId -> timeoutId to allow cancellation
  let activeTimeouts = {};

  /**
   * Request Web Notification permission on first alarm setup.
   * Shows the in-app banner if denied.
   * @returns {Promise<boolean>} true if permission granted
   */
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      _showBanner();
      return false;
    }

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      _showBanner();
      return false;
    }

    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      _showBanner();
      return false;
    }
    return true;
  }

  function _showBanner() {
    const banner = document.getElementById('notification-banner');
    if (banner) banner.classList.add('visible');
  }

  /**
   * Cancel all active alarm timeouts.
   */
  function _clearAllTimeouts() {
    Object.values(activeTimeouts).forEach(id => clearTimeout(id));
    activeTimeouts = {};
  }

  /**
   * Schedule alarms for today's pending tasks that have an alarm_time.
   * Cancels all existing timeouts before re-scheduling.
   * @param {Array} tasks - full task list from localStorage
   */
  async function scheduleAlarms(tasks) {
    _clearAllTimeouts();

    const todayStr = _todayStr();
    const todayPendingWithAlarm = tasks.filter(t =>
      t.status === 'pending' &&
      t.date === todayStr &&
      t.alarm_time
    );

    if (todayPendingWithAlarm.length === 0) return;

    const permitted = await requestNotificationPermission();
    if (!permitted) return;

    const now = Date.now();

    todayPendingWithAlarm.forEach(task => {
      const alarmMs = _alarmTimestamp(task.alarm_time);
      const delay = alarmMs - now;
      if (delay <= 0) return; // alarm time already passed

      activeTimeouts[task.id] = setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('☕ Cafe TODO 提醒', {
            body: task.title,
            icon: ''
          });
        }
        delete activeTimeouts[task.id];
      }, delay);
    });
  }

  /**
   * Returns today's date string in YYYY-MM-DD format.
   */
  function _todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Returns the Unix timestamp (ms) for today at the given HH:MM time.
   * @param {string} timeStr - "HH:MM"
   */
  function _alarmTimestamp(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.getTime();
  }

  // Reschedule alarms when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // App.getTasks() exposed by app.js after init
      if (window.App && typeof window.App.getTasks === 'function') {
        scheduleAlarms(window.App.getTasks());
      }
    }
  });

  return { scheduleAlarms, requestNotificationPermission };
})();
