/**
 * calendar.js
 * Renders the monthly calendar and handles date selection.
 * Exposes Calendar.init(onDateSelect) and Calendar.refresh(tasks).
 */

const Calendar = (() => {
  let currentYear;
  let currentMonth; // 0-indexed
  let selectedDate; // "YYYY-MM-DD" or null
  let onDateSelect; // callback(dateStr)
  let tasksByDate = {}; // {"YYYY-MM-DD": [{...},...]}

  const DOW_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

  /**
   * Initialize the calendar.
   * @param {function} selectCallback - called with "YYYY-MM-DD" when user clicks a date
   */
  function init(selectCallback) {
    onDateSelect = selectCallback;

    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    selectedDate = _todayStr();

    document.getElementById('btn-prev-month').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      _render();
    });

    document.getElementById('btn-next-month').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      _render();
    });

    _render();
  }

  /**
   * Update the internal task index and re-render the calendar.
   * @param {Array} tasks
   */
  function refresh(tasks) {
    tasksByDate = {};
    tasks.forEach(t => {
      if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
      tasksByDate[t.date].push(t);
    });
    _render();
  }

  /**
   * Set the selected date programmatically (without triggering onDateSelect).
   * @param {string} dateStr - "YYYY-MM-DD"
   */
  function setSelected(dateStr) {
    selectedDate = dateStr;
    _render();
  }

  // ---- Private ----

  function _todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function _pad(n) {
    return String(n).padStart(2, '0');
  }

  function _render() {
    _renderLabel();
    _renderGrid();
  }

  function _renderLabel() {
    const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    document.getElementById('calendar-month-label').textContent =
      `${currentYear} 年 ${monthNames[currentMonth]}`;
  }

  function _renderGrid() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Day-of-week headers (Mon-Sun)
    DOW_LABELS.forEach(d => {
      const el = document.createElement('div');
      el.className = 'cal-dow';
      el.textContent = d;
      grid.appendChild(el);
    });

    const todayStr = _todayStr();

    // First day of month (0=Sun…6=Sat), convert to Mon-based (0=Mon…6=Sun)
    const firstDow = new Date(currentYear, currentMonth, 1).getDay();
    const offset = (firstDow === 0) ? 6 : firstDow - 1;

    // Days in month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Blank cells before first day
    for (let i = 0; i < offset; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-day other-month';
      grid.appendChild(blank);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${_pad(currentMonth + 1)}-${_pad(d)}`;
      const el = document.createElement('div');
      el.className = 'cal-day';
      el.setAttribute('role', 'gridcell');
      el.setAttribute('aria-label', dateStr);
      el.textContent = d;

      if (dateStr === todayStr) el.classList.add('today');
      if (dateStr === selectedDate) el.classList.add('selected');

      // Task indicator dot
      const dot = _buildDot(dateStr);
      if (dot) el.appendChild(dot);

      el.addEventListener('click', () => {
        selectedDate = dateStr;
        _render();
        if (onDateSelect) onDateSelect(dateStr);
      });

      grid.appendChild(el);
    }
  }

  function _buildDot(dateStr) {
    const dayTasks = tasksByDate[dateStr];
    if (!dayTasks || dayTasks.length === 0) return null;

    const allDone = dayTasks.every(t => t.status === 'completed');
    const dot = document.createElement('div');
    dot.className = allDone ? 'cal-dot done' : 'cal-dot pending';
    return dot;
  }

  return { init, refresh, setSelected };
})();
