/**
 * app.js
 * Main application logic: state management, localStorage, task CRUD,
 * modal handling, startup reminder, and orchestration.
 */

const App = (() => {
  const STORAGE_KEY = 'cafe-todo-tasks';

  // ── State ──────────────────────────────────────────────────────────────────
  let tasks = [];
  let selectedDate = _todayStr();
  let editingTaskId = null; // null = add mode, string = edit mode

  // ── localStorage ──────────────────────────────────────────────────────────

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // corrupted data — reset
      localStorage.setItem(STORAGE_KEY, '[]');
      return [];
    }
  }

  function saveTasks(taskList) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taskList));
  }

  function getTasks() {
    return tasks;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function _todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function _formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${y} 年 ${parseInt(m)} 月 ${parseInt(d)} 日`;
  }

  // ── Task CRUD ─────────────────────────────────────────────────────────────

  function _addTask(title, date, alarmTime) {
    const task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      date,
      alarm_time: alarmTime || null,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    tasks.push(task);
    saveTasks(tasks);
    _afterChange();
  }

  function _updateTask(id, title, date, alarmTime) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    tasks[idx] = { ...tasks[idx], title: title.trim(), date, alarm_time: alarmTime || null };
    saveTasks(tasks);
    _afterChange();
  }

  function _deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(tasks);
    _afterChange();
  }

  function _toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    task.status = task.status === 'completed' ? 'pending' : 'completed';
    saveTasks(tasks);
    _afterChange();
  }

  function _afterChange() {
    Calendar.refresh(tasks);
    _renderTaskList();
    Notifications.scheduleAlarms(tasks);
  }

  // ── Task List Rendering ────────────────────────────────────────────────────

  function _renderTaskList() {
    const container = document.getElementById('task-list');
    const dayTasks = tasks.filter(t => t.date === selectedDate);

    document.getElementById('selected-date-label').textContent =
      _formatDate(selectedDate);

    if (dayTasks.length === 0) {
      container.innerHTML = '<div class="task-empty">今天沒有任務，享受你的咖啡吧 ☕</div>';
      return;
    }

    container.innerHTML = '';
    dayTasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'task-item';
      item.setAttribute('role', 'listitem');

      const isDone = task.status === 'completed';

      item.innerHTML = `
        <input type="checkbox" ${isDone ? 'checked' : ''}
          aria-label="標記完成：${_esc(task.title)}"
          data-id="${task.id}" />
        <div class="task-info">
          <div class="task-title${isDone ? ' completed' : ''}">${_esc(task.title)}</div>
          ${task.alarm_time ? `<div class="task-alarm">⏰ ${task.alarm_time}</div>` : ''}
        </div>
        <div class="task-actions">
          <button class="btn-icon edit" data-id="${task.id}" title="編輯">✏️</button>
          <button class="btn-icon delete" data-id="${task.id}" title="刪除">🗑️</button>
        </div>
      `;

      item.querySelector('input[type="checkbox"]').addEventListener('change', () => {
        _toggleTask(task.id);
      });

      item.querySelector('.btn-icon.edit').addEventListener('click', () => {
        _openEditModal(task.id);
      });

      item.querySelector('.btn-icon.delete').addEventListener('click', () => {
        if (confirm(`確定要刪除「${task.title}」嗎？`)) {
          _deleteTask(task.id);
        }
      });

      container.appendChild(item);
    });
  }

  function _esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Task Modal ─────────────────────────────────────────────────────────────

  function _openAddModal() {
    editingTaskId = null;
    document.getElementById('task-modal-title').textContent = '新增任務';
    document.getElementById('task-title-input').value = '';
    document.getElementById('task-date-input').value = selectedDate;
    document.getElementById('task-alarm-input').value = '';
    document.getElementById('task-form-error').textContent = '';
    document.getElementById('task-modal').classList.add('open');
    document.getElementById('task-title-input').focus();
  }

  function _openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    editingTaskId = id;
    document.getElementById('task-modal-title').textContent = '編輯任務';
    document.getElementById('task-title-input').value = task.title;
    document.getElementById('task-date-input').value = task.date;
    document.getElementById('task-alarm-input').value = task.alarm_time || '';
    document.getElementById('task-form-error').textContent = '';
    document.getElementById('task-modal').classList.add('open');
    document.getElementById('task-title-input').focus();
  }

  function _closeTaskModal() {
    document.getElementById('task-modal').classList.remove('open');
    editingTaskId = null;
  }

  function _saveTaskModal() {
    const title = document.getElementById('task-title-input').value.trim();
    const date = document.getElementById('task-date-input').value;
    const alarmTime = document.getElementById('task-alarm-input').value;
    const errorEl = document.getElementById('task-form-error');

    if (!title) {
      errorEl.textContent = '請輸入任務標題。';
      return;
    }
    if (!date) {
      errorEl.textContent = '請選擇日期。';
      return;
    }
    errorEl.textContent = '';

    if (editingTaskId) {
      _updateTask(editingTaskId, title, date, alarmTime);
      // If date changed, switch selected date to follow the task
      selectedDate = date;
      Calendar.setSelected(date);
    } else {
      _addTask(title, date, alarmTime);
    }

    _closeTaskModal();
    _renderTaskList();
  }

  // ── Startup Reminder Modal ─────────────────────────────────────────────────

  function _showStartupReminder() {
    const todayStr = _todayStr();
    const pending = tasks.filter(t => t.date === todayStr && t.status === 'pending');
    if (pending.length === 0) return;

    const listEl = document.getElementById('reminder-task-list');
    listEl.innerHTML = '';
    pending.forEach(t => {
      const el = document.createElement('div');
      el.className = 'reminder-task-item';
      el.innerHTML = `
        <div class="r-title">${_esc(t.title)}</div>
        ${t.alarm_time ? `<div class="r-alarm">⏰ ${t.alarm_time}</div>` : ''}
      `;
      listEl.appendChild(el);
    });

    document.getElementById('reminder-modal').classList.add('open');
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    tasks = loadTasks();

    // Calendar
    Calendar.init(dateStr => {
      selectedDate = dateStr;
      _renderTaskList();
    });
    Calendar.refresh(tasks);

    // Render task list for today
    _renderTaskList();

    // Bind modal buttons
    document.getElementById('btn-add-task').addEventListener('click', _openAddModal);
    document.getElementById('btn-task-cancel').addEventListener('click', _closeTaskModal);
    document.getElementById('btn-task-save').addEventListener('click', _saveTaskModal);

    // Close modal on overlay click
    document.getElementById('task-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) _closeTaskModal();
    });

    // Keyboard: Enter submits, Escape cancels
    document.getElementById('task-modal').addEventListener('keydown', e => {
      if (e.key === 'Enter') _saveTaskModal();
      if (e.key === 'Escape') _closeTaskModal();
    });

    // Startup reminder
    _showStartupReminder();
    document.getElementById('btn-reminder-confirm').addEventListener('click', () => {
      document.getElementById('reminder-modal').classList.remove('open');
    });

    // Schedule alarms
    Notifications.scheduleAlarms(tasks);
  }

  // Expose getTasks for visibilitychange handler in notifications.js
  window.App = { getTasks, init };

  document.addEventListener('DOMContentLoaded', init);

  return { getTasks };
})();
