/**
 * ==============================================================================
 * STUDYSYNC — STUDENT PRODUCTIVITY DASHBOARD
 * Core Application Logic: Tasks, Pomodoro Timer, State & Theme Persistence
 * ==============================================================================
 */

// Storage Keys
const STORAGE_KEYS = {
  THEME: 'studysync_theme',
  TASKS: 'studysync_tasks',
  STUDY_HOURS: 'studysync_study_hours',
  POMO_SESSIONS: 'studysync_pomo_sessions',
};

// Initial Seed Tasks as requested
const DEFAULT_TASKS = [
  { id: '1', title: 'ML Linear Regression', category: 'AI & ML', priority: 'high', completed: false, createdAt: Date.now() - 40000 },
  { id: '2', title: 'Python Practice', category: 'Coding', priority: 'medium', completed: false, createdAt: Date.now() - 30000 },
  { id: '3', title: 'GitHub Project', category: 'Project', priority: 'high', completed: false, createdAt: Date.now() - 20000 },
  { id: '4', title: 'College Assignment', category: 'College', priority: 'medium', completed: true, createdAt: Date.now() - 10000 },
];

/* ==============================================================================
   1. STATE MANAGEMENT
   ============================================================================== */
const state = {
  theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'dark',
  tasks: loadTasksFromStorage(),
  studyHours: parseFloat(localStorage.getItem(STORAGE_KEYS.STUDY_HOURS) || '3.5'),
  dailyGoalTarget: 5.0,
  activeFilter: 'all',
  
  // Timer State
  timer: {
    duration: 1500, // 25 mins in seconds
    remaining: 1500,
    isRunning: false,
    intervalId: null,
    mode: 'pomodoro', // 'pomodoro' | 'shortBreak' | 'longBreak'
    completedSessions: parseInt(localStorage.getItem(STORAGE_KEYS.POMO_SESSIONS) || '3', 10),
  },
};

function loadTasksFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(DEFAULT_TASKS));
      return [...DEFAULT_TASKS];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse tasks from localStorage', e);
    return [...DEFAULT_TASKS];
  }
}

function saveTasksToStorage() {
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
  renderTasks();
  updateStatistics();
}

/* ==============================================================================
   2. DOM REFERENCES
   ============================================================================== */
const DOM = {
  // Theme & Navigation
  html: document.documentElement,
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  menuToggleBtn: document.getElementById('menuToggleBtn'),
  mobileCloseBtn: document.getElementById('mobileCloseBtn'),
  sidebar: document.getElementById('sidebar'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  sidebarProjectsBtn: document.getElementById('sidebarProjectsBtn'),
  greetingTitle: document.getElementById('greetingTitle'),
  currentDateDisplay: document.getElementById('currentDateDisplay'),
  liveClock: document.getElementById('liveClock'),

  // Header quick timer pill
  headerTimerPill: document.getElementById('headerTimerPill'),
  headerTimerText: document.getElementById('headerTimerText'),

  // Statistics
  statStudyHours: document.getElementById('statStudyHours'),
  statTasksRatio: document.getElementById('statTasksRatio'),
  statTasksBar: document.getElementById('statTasksBar'),
  statTasksPercent: document.getElementById('statTasksPercent'),
  statStreak: document.getElementById('statStreak'),
  statProjects: document.getElementById('statProjects'),
  cardProjects: document.getElementById('cardProjects'),

  // Daily Goal
  dailyGoalFill: document.getElementById('dailyGoalFill'),
  goalStudiedText: document.getElementById('goalStudiedText'),
  logStudyTimeBtn: document.getElementById('logStudyTimeBtn'),

  // Tasks
  quickAddForm: document.getElementById('quickAddForm'),
  quickTaskInput: document.getElementById('quickTaskInput'),
  quickTaskCategory: document.getElementById('quickTaskCategory'),
  taskListContainer: document.getElementById('taskListContainer'),
  taskFilters: document.getElementById('taskFilters'),
  tasksPendingCount: document.getElementById('tasksPendingCount'),
  navTaskCounter: document.getElementById('navTaskCounter'),
  clearCompletedTasksBtn: document.getElementById('clearCompletedTasksBtn'),
  headerAddTaskBtn: document.getElementById('headerAddTaskBtn'),
  openTaskModalBtn: document.getElementById('openTaskModalBtn'),

  // Modals
  addTaskModal: document.getElementById('addTaskModal'),
  closeTaskModalBtn: document.getElementById('closeTaskModalBtn'),
  cancelTaskModalBtn: document.getElementById('cancelTaskModalBtn'),
  modalTaskForm: document.getElementById('modalTaskForm'),
  modalTaskTitle: document.getElementById('modalTaskTitle'),
  modalTaskCategory: document.getElementById('modalTaskCategory'),
  modalTaskPriority: document.getElementById('modalTaskPriority'),

  projectsModal: document.getElementById('projectsModal'),
  closeProjectsModalBtn: document.getElementById('closeProjectsModalBtn'),
  doneProjectsModalBtn: document.getElementById('doneProjectsModalBtn'),

  // Timer
  timerDisplay: document.getElementById('timerDisplay'),
  timerProgressCircle: document.getElementById('timerProgressCircle'),
  timerStatusCaption: document.getElementById('timerStatusCaption'),
  timerStartBtn: document.getElementById('timerStartBtn'),
  startBtnText: document.getElementById('startBtnText'),
  timerPauseBtn: document.getElementById('timerPauseBtn'),
  timerResetBtn: document.getElementById('timerResetBtn'),
  timerModeSelectors: document.getElementById('timerModeSelectors'),
  sessionDots: document.getElementById('sessionDots'),
  timerPulseDot: document.getElementById('timerPulseDot'),

  // Quick Action Buttons
  actionAddTask: document.getElementById('actionAddTask'),
  actionStartTimer: document.getElementById('actionStartTimer'),
  actionViewProjects: document.getElementById('actionViewProjects'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer'),
};

/* ==============================================================================
   3. THEME TOGGLE
   ============================================================================== */
function initTheme() {
  DOM.html.setAttribute('data-theme', state.theme);

  DOM.themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    DOM.html.setAttribute('data-theme', state.theme);
    localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
    showToast(`Switched to ${state.theme} mode`, 'info');
  });
}

/* ==============================================================================
   4. GREETING & DATE INITIALIZATION
   ============================================================================== */
function initDateTime() {
  const now = new Date();
  const hour = now.getHours();

  // Dynamic Greeting based on current local time
  let greeting = 'Good Morning';
  if (hour >= 12 && hour < 17) {
    greeting = 'Good Afternoon';
  } else if (hour >= 17) {
    greeting = 'Good Evening';
  }

  DOM.greetingTitle.textContent = `${greeting}, Ishant 👋`;

  // Formatted Date
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  DOM.currentDateDisplay.textContent = now.toLocaleDateString('en-US', dateOptions);

  // Live Clock updater
  updateLiveClock();
  setInterval(updateLiveClock, 1000 * 60);
}

function updateLiveClock() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  DOM.liveClock.textContent = `${hours}:${minutes} ${ampm}`;
}

/* ==============================================================================
   5. TASK MANAGER (CRUD + LOCALSTORAGE)
   ============================================================================== */
function renderTasks() {
  const filtered = state.tasks.filter((t) => {
    if (state.activeFilter === 'pending') return !t.completed;
    if (state.activeFilter === 'completed') return t.completed;
    return true;
  });

  const pendingCount = state.tasks.filter((t) => !t.completed).length;
  DOM.tasksPendingCount.textContent = `${pendingCount} active`;
  DOM.navTaskCounter.textContent = pendingCount;

  if (filtered.length === 0) {
    DOM.taskListContainer.innerHTML = `
      <div class="task-empty-state">
        <span class="empty-icon">🎉</span>
        <p><strong>All clear!</strong></p>
        <span style="font-size: 0.8rem;">No tasks found in this view. Add one above!</span>
      </div>
    `;
    return;
  }

  DOM.taskListContainer.innerHTML = filtered
    .map((task) => {
      const priorityClass = task.priority ? task.priority.toLowerCase() : 'medium';
      return `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
          <label class="task-checkbox-wrap" title="${task.completed ? 'Mark pending' : 'Mark completed'}">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
          </label>
          <div class="task-body">
            <span class="task-title">${escapeHtml(task.title)}</span>
            <div class="task-meta">
              <span class="task-tag">${escapeHtml(task.category || 'General')}</span>
              <span class="task-priority ${priorityClass}">${priorityClass}</span>
            </div>
          </div>
          <div class="task-actions">
            <button class="task-delete-btn" data-id="${task.id}" title="Delete task" aria-label="Delete task">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  // Attach dynamic listener for checkboxes & delete buttons
  DOM.taskListContainer.querySelectorAll('.task-checkbox').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      toggleTaskCompletion(id);
    });
  });

  DOM.taskListContainer.querySelectorAll('.task-delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      deleteTask(id);
    });
  });
}

function toggleTaskCompletion(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasksToStorage();

  if (task.completed) {
    playTaskCompleteChime();
    showToast(`Completed: "${task.title}"`, 'success');
  }
}

function deleteTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveTasksToStorage();
  if (task) {
    showToast(`Removed task: "${task.title}"`, 'warning');
  }
}

function addTask(title, category = 'General', priority = 'medium') {
  const trimmed = title.trim();
  if (!trimmed) return;

  const newTask = {
    id: Date.now().toString(),
    title: trimmed,
    category: category,
    priority: priority,
    completed: false,
    createdAt: Date.now(),
  };

  state.tasks.unshift(newTask);
  saveTasksToStorage();
  showToast(`Added: "${newTask.title}"`, 'success');
}

/* ==============================================================================
   6. STATISTICS & DAILY GOAL LOGIC
   ============================================================================== */
function updateStatistics() {
  // Study Hours Stat
  DOM.statStudyHours.textContent = state.studyHours.toFixed(1);

  // Daily Goal Card Calculation
  const pct = Math.min(100, Math.round((state.studyHours / state.dailyGoalTarget) * 100));
  DOM.dailyGoalFill.style.width = `${pct}%`;
  DOM.goalStudiedText.textContent = state.studyHours.toFixed(1);

  // Tasks ratio
  const total = state.tasks.length;
  const completed = state.tasks.filter((t) => t.completed).length;
  DOM.statTasksRatio.textContent = `${completed}/${total}`;

  const taskPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  DOM.statTasksBar.style.width = `${taskPct}%`;
  DOM.statTasksPercent.textContent = `${taskPct}% finished`;
}

function logExtraStudyTime(minutes = 30) {
  state.studyHours = Math.round((state.studyHours + minutes / 60) * 10) / 10;
  localStorage.setItem(STORAGE_KEYS.STUDY_HOURS, state.studyHours.toString());
  updateStatistics();
  showToast(`Logged +${minutes} mins of study! Total: ${state.studyHours} hrs`, 'success');
}

/* ==============================================================================
   7. POMODORO STUDY TIMER
   ============================================================================== */
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 95; // r=95 -> ~596.9

function initTimer() {
  DOM.timerProgressCircle.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
  updateTimerDisplay();
  renderSessionDots();

  // Mode buttons
  DOM.timerModeSelectors.querySelectorAll('.mode-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      DOM.timerModeSelectors.querySelectorAll('.mode-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.dataset.mode;
      const seconds = parseInt(btn.dataset.time, 10);
      switchTimerMode(mode, seconds);
    });
  });

  // Controls
  DOM.timerStartBtn.addEventListener('click', startTimer);
  DOM.timerPauseBtn.addEventListener('click', pauseTimer);
  DOM.timerResetBtn.addEventListener('click', resetTimer);
}

function switchTimerMode(mode, seconds) {
  pauseTimer();
  state.timer.mode = mode;
  state.timer.duration = seconds;
  state.timer.remaining = seconds;

  let caption = 'Ready to focus';
  if (mode === 'shortBreak') caption = 'Rest your mind (5m)';
  if (mode === 'longBreak') caption = 'Recharge & hydrate (15m)';
  DOM.timerStatusCaption.textContent = caption;

  updateTimerDisplay();
}

function startTimer() {
  if (state.timer.isRunning) return;

  state.timer.isRunning = true;
  DOM.timerStartBtn.disabled = true;
  DOM.timerPauseBtn.disabled = false;
  DOM.startBtnText.textContent = 'Running';
  DOM.timerStatusCaption.textContent = state.timer.mode === 'pomodoro' ? 'Deep Work In Progress' : 'Break Time';

  DOM.headerTimerPill.classList.add('running');
  DOM.timerPulseDot.classList.add('active');

  showToast('Study timer started — Stay focused!', 'info');

  state.timer.intervalId = setInterval(() => {
    if (state.timer.remaining > 0) {
      state.timer.remaining--;
      updateTimerDisplay();
    } else {
      handleTimerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  if (!state.timer.isRunning) return;

  state.timer.isRunning = false;
  clearInterval(state.timer.intervalId);
  DOM.timerStartBtn.disabled = false;
  DOM.timerPauseBtn.disabled = true;
  DOM.startBtnText.textContent = 'Resume';
  DOM.timerStatusCaption.textContent = 'Paused';

  DOM.headerTimerPill.classList.remove('running');
  DOM.timerPulseDot.classList.remove('active');
  showToast('Timer paused', 'warning');
}

function resetTimer() {
  pauseTimer();
  state.timer.remaining = state.timer.duration;
  DOM.startBtnText.textContent = 'Start';
  DOM.timerStatusCaption.textContent = 'Ready to focus';
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const m = Math.floor(state.timer.remaining / 60).toString().padStart(2, '0');
  const s = (state.timer.remaining % 60).toString().padStart(2, '0');
  const formatted = `${m}:${s}`;

  DOM.timerDisplay.textContent = formatted;
  DOM.headerTimerText.textContent = formatted;

  // Animate SVG stroke offset
  const progressRatio = (state.timer.duration - state.timer.remaining) / state.timer.duration;
  const offset = CIRCLE_CIRCUMFERENCE * (1 - progressRatio);
  DOM.timerProgressCircle.style.strokeDashoffset = offset;
}

function handleTimerComplete() {
  pauseTimer();
  playPomodoroAlarmChime();

  if (state.timer.mode === 'pomodoro') {
    state.timer.completedSessions++;
    localStorage.setItem(STORAGE_KEYS.POMO_SESSIONS, state.timer.completedSessions.toString());
    renderSessionDots();

    // Automatically credit 25m of study time
    logExtraStudyTime(25);

    showToast('🎉 Pomodoro Session Completed! 25 mins logged. Take a break!', 'success');
  } else {
    showToast('Break time is over! Ready for another focus session?', 'info');
  }

  resetTimer();
}

function renderSessionDots() {
  const count = state.timer.completedSessions;
  const totalDots = 4;
  let dotsHtml = '';

  for (let i = 0; i < totalDots; i++) {
    const isFilled = i < (count % (totalDots + 1));
    dotsHtml += `<span class="dot ${isFilled ? 'filled' : ''}" title="Session ${i + 1}"></span>`;
  }
  DOM.sessionDots.innerHTML = dotsHtml;
}

/* ==============================================================================
   8. SYNTHESIZED SOUND NOTIFICATIONS (WEB AUDIO API - ZERO DEPENDENCY)
   ============================================================================== */
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTaskCompleteChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.15); // A5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (err) {
    // Audio context policy fallback
  }
}

function playPomodoroAlarmChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  } catch (err) {}
}

/* ==============================================================================
   9. MODALS & EVENT HANDLERS
   ============================================================================== */
function initModals() {
  // Add Task Modal Openers
  const openTaskModal = () => {
    DOM.addTaskModal.classList.add('active');
    setTimeout(() => DOM.modalTaskTitle.focus(), 100);
  };
  const closeTaskModal = () => DOM.addTaskModal.classList.remove('active');

  DOM.headerAddTaskBtn.addEventListener('click', openTaskModal);
  DOM.openTaskModalBtn.addEventListener('click', openTaskModal);
  DOM.actionAddTask.addEventListener('click', openTaskModal);
  DOM.closeTaskModalBtn.addEventListener('click', closeTaskModal);
  DOM.cancelTaskModalBtn.addEventListener('click', closeTaskModal);

  // Projects Modal Openers
  const openProjectsModal = () => DOM.projectsModal.classList.add('active');
  const closeProjectsModal = () => DOM.projectsModal.classList.remove('active');

  DOM.sidebarProjectsBtn.addEventListener('click', openProjectsModal);
  DOM.cardProjects.addEventListener('click', openProjectsModal);
  DOM.actionViewProjects.addEventListener('click', openProjectsModal);
  DOM.closeProjectsModalBtn.addEventListener('click', closeProjectsModal);
  DOM.doneProjectsModalBtn.addEventListener('click', closeProjectsModal);

  // Close modals on overlay backdrop click
  [DOM.addTaskModal, DOM.projectsModal].forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // Modal Task Form Submission
  DOM.modalTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = DOM.modalTaskTitle.value;
    const cat = DOM.modalTaskCategory.value;
    const priority = DOM.modalTaskPriority.value;
    addTask(title, cat, priority);
    DOM.modalTaskForm.reset();
    closeTaskModal();
  });

  // Quick Task Form (Inline)
  DOM.quickAddForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = DOM.quickTaskInput.value;
    const cat = DOM.quickTaskCategory.value;
    addTask(title, cat, 'medium');
    DOM.quickTaskInput.value = '';
  });

  // Task Filter Tabs
  DOM.taskFilters.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      DOM.taskFilters.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeFilter = pill.dataset.filter;
      renderTasks();
    });
  });

  // Clear completed tasks button
  DOM.clearCompletedTasksBtn.addEventListener('click', () => {
    const prevLen = state.tasks.length;
    state.tasks = state.tasks.filter((t) => !t.completed);
    const removedCount = prevLen - state.tasks.length;
    if (removedCount > 0) {
      saveTasksToStorage();
      showToast(`Cleared ${removedCount} completed task(s)`, 'info');
    } else {
      showToast('No completed tasks to clear', 'info');
    }
  });

  // Quick Action: Start Timer
  DOM.actionStartTimer.addEventListener('click', () => {
    document.getElementById('timerSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!state.timer.isRunning) {
      startTimer();
    }
  });

  // Daily Goal: Log 30m study time
  DOM.logStudyTimeBtn.addEventListener('click', () => {
    logExtraStudyTime(30);
  });

  // Mobile Sidebar Drawer
  DOM.menuToggleBtn.addEventListener('click', () => {
    DOM.sidebar.classList.add('mobile-open');
    DOM.sidebarBackdrop.classList.add('active');
  });

  const closeMobileSidebar = () => {
    DOM.sidebar.classList.remove('mobile-open');
    DOM.sidebarBackdrop.classList.remove('active');
  };

  DOM.mobileCloseBtn.addEventListener('click', closeMobileSidebar);
  DOM.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

  // Keyboard shortcut: Escape to close modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTaskModal();
      closeProjectsModal();
      closeMobileSidebar();
    }
  });
}

/* ==============================================================================
   10. TOAST NOTIFICATION UTILITY
   ============================================================================== */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚡';

  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Security: Escape HTML strings for dynamic rendering
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==============================================================================
   11. INITIALIZATION LIFECYCLE
   ============================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDateTime();
  renderTasks();
  updateStatistics();
  initTimer();
  initModals();

  console.log('StudySync Student Productivity Dashboard initialized successfully.');
});
