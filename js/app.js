// ============================================================
//  LIFE DASHBOARD v2 — app.js
//  + Theme Switcher | + Alarm | + Updated Quick Links
// ============================================================

const $ = (id) => document.getElementById(id);
const ls = {
  get: (key, fallback = null) => {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
};

// ───────────── THEME ─────────────
const THEMES = ['tiramisu', 'monokrom', 'green-forest', 'blue-ocean'];

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  ls.set('theme', theme);
  // update active button in modal if open
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

// Theme buttons in modal
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme);
  });
});

// Load saved theme
applyTheme(ls.get('theme', 'tiramisu'));

// ───────────── CLOCK & DATE ─────────────
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  $('clock').textContent = `${h}:${m}:${s}`;

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  $('date-display').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  const hour = now.getHours();
  let greet = hour >= 5 && hour < 12 ? '☀️ Good Morning'
            : hour >= 12 && hour < 17 ? '🌤 Good Afternoon'
            : hour >= 17 && hour < 21 ? '🌇 Good Evening'
            : '🌙 Good Night';
  $('greeting-text').textContent = greet;
}
setInterval(updateClock, 1000);
updateClock();

// ───────────── CUSTOM NAME (Challenge 1) ─────────────
function loadName() {
  const name = ls.get('userName');
  if (!name) {
    $('name-modal').classList.remove('hidden');
  } else {
    $('name-modal').classList.add('hidden');
    $('greeting-name').textContent = name;
  }
}

$('name-save-btn').addEventListener('click', () => {
  const val = $('name-input').value.trim();
  if (!val) { $('name-input').focus(); return; }
  ls.set('userName', val);
  $('greeting-name').textContent = val;
  $('name-modal').classList.add('hidden');
});

$('name-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('name-save-btn').click();
});

$('change-name-btn').addEventListener('click', () => {
  $('name-input').value = ls.get('userName') || '';
  // sync theme buttons
  const current = ls.get('theme', 'tiramisu');
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === current);
  });
  $('name-modal').classList.remove('hidden');
  setTimeout(() => $('name-input').focus(), 100);
});

loadName();

// ───────────── ALARM ─────────────
let alarmAudio = null;

function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const beep = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(880, 0,    0.15);
    beep(880, 0.2,  0.15);
    beep(1100, 0.4, 0.25);
  } catch(e) {}
}

function showAlarm(isWork) {
  playAlarm();
  const toast = $('alarm-toast');
  $('alarm-icon').textContent = isWork ? '🍅' : '☕';
  $('alarm-msg').textContent  = isWork ? 'Work time! Let\'s focus! 💪' : 'Break time! Rest a bit 😌';
  toast.classList.remove('hidden');

  // Bunyikan alarm berulang setiap 10 detik sampai ditutup manual
  const alarmInterval = setInterval(() => {
    if (!toast.classList.contains('hidden')) {
      playAlarm();
    } else {
      clearInterval(alarmInterval);
    }
  }, 10000);

  // Simpan interval agar bisa dihentikan saat tombol ✕ ditekan
  toast.dataset.intervalId = alarmInterval;
}

$('alarm-close').addEventListener('click', () => {
  const toast = $('alarm-toast');
  toast.classList.add('hidden');
  clearInterval(parseInt(toast.dataset.intervalId));
});

// ───────────── POMODORO (Challenge 2 — Changeable + Alarm) ─────────────
const CIRC = 2 * Math.PI * 52;
let pomo = {
  workMin:  ls.get('pomoWork', 25),
  breakMin: ls.get('pomoBreak', 5),
  isWork:   true,
  totalSec: 0,
  remSec:   0,
  running:  false,
  interval: null,
};

function initPomodoro() {
  pomo.remSec    = pomo.workMin * 60;
  pomo.totalSec  = pomo.workMin * 60;
  pomo.isWork    = true;
  renderTimer();
}

function renderTimer() {
  const m = Math.floor(pomo.remSec / 60);
  const s = pomo.remSec % 60;
  $('timer-time').textContent  = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  $('timer-phase').textContent = pomo.isWork ? 'Work' : 'Break';

  const ratio  = pomo.remSec / pomo.totalSec;
  const offset = CIRC * (1 - ratio);
  $('ring-progress').style.strokeDashoffset = offset;
}

function timerTick() {
  pomo.remSec--;
  if (pomo.remSec < 0) {
    // Switch phase
    pomo.isWork = !pomo.isWork;
    const nextMin = pomo.isWork ? pomo.workMin : pomo.breakMin;
    pomo.remSec   = nextMin * 60;
    pomo.totalSec = nextMin * 60;
    showAlarm(pomo.isWork);
  }
  renderTimer();
}

$('timer-start').addEventListener('click', () => {
  if (pomo.running) return;
  pomo.running  = true;
  pomo.interval = setInterval(timerTick, 1000);
});

$('timer-stop').addEventListener('click', () => {
  pomo.running = false;
  clearInterval(pomo.interval);
});

$('timer-reset').addEventListener('click', () => {
  pomo.running = false;
  clearInterval(pomo.interval);
  initPomodoro();
});

$('edit-pomodoro-btn').addEventListener('click', () => {
  $('pomodoro-settings').classList.toggle('hidden');
  $('work-input').value  = pomo.workMin;
  $('break-input').value = pomo.breakMin;
});

$('save-pomodoro-btn').addEventListener('click', () => {
  const w = parseInt($('work-input').value, 10);
  const b = parseInt($('break-input').value, 10);
  if (isNaN(w) || isNaN(b) || w < 1 || b < 1) return;
  pomo.workMin  = w;
  pomo.breakMin = b;
  ls.set('pomoWork', w);
  ls.set('pomoBreak', b);
  pomo.running = false;
  clearInterval(pomo.interval);
  initPomodoro();
  $('pomodoro-settings').classList.add('hidden');
});

initPomodoro();

// ───────────── TO-DO LIST (Challenge 3 — No Duplicates) ─────────────
let tasks    = ls.get('tasks', []);
let editingId = null;

function saveTasks() { ls.set('tasks', tasks); }

function getDisplayTasks() {
  const sort = $('sort-select').value;
  const copy = [...tasks];
  if (sort === 'az') copy.sort((a, b) => a.text.localeCompare(b.text));
  else if (sort === 'done') copy.sort((a, b) => a.done === b.done ? 0 : a.done ? 1 : -1);
  return copy;
}

function renderTasks() {
  const list  = $('task-list');
  const empty = $('task-empty');
  list.innerHTML = '';

  const displayed = getDisplayTasks();
  empty.classList.toggle('hidden', displayed.length > 0);

  displayed.forEach((task) => {
    const li = document.createElement('li');
    li.className = `task-item${task.done ? ' done' : ''}`;
    li.dataset.id = task.id;

    const cb = document.createElement('div');
    cb.className = 'task-checkbox';
    cb.innerHTML = task.done ? '✓' : '';
    cb.title = 'Mark done';
    cb.addEventListener('click', () => toggleDone(task.id));

    if (editingId === task.id) {
      const inp = document.createElement('input');
      inp.className = 'task-edit-input';
      inp.value = task.text;
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveEdit(task.id, inp.value);
        if (e.key === 'Escape') { editingId = null; renderTasks(); }
      });
      inp.addEventListener('blur', () => saveEdit(task.id, inp.value));
      li.appendChild(cb);
      li.appendChild(inp);
      setTimeout(() => inp.focus(), 0);
    } else {
      const span = document.createElement('span');
      span.className = 'task-text';
      span.textContent = task.text;
      li.appendChild(cb);
      li.appendChild(span);
    }

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'task-action-btn';
    editBtn.title = 'Edit';
    editBtn.innerHTML = '✏️';
    editBtn.addEventListener('click', () => { editingId = task.id; renderTasks(); });

    const delBtn = document.createElement('button');
    delBtn.className = 'task-action-btn delete';
    delBtn.title = 'Delete';
    delBtn.innerHTML = '🗑';
    delBtn.addEventListener('click', () => deleteTask(task.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

function addTask() {
  const input = $('task-input');
  const text  = input.value.trim();
  if (!text) return;

  const isDuplicate = tasks.some(t => t.text.toLowerCase() === text.toLowerCase());
  if (isDuplicate) {
    const warn = $('duplicate-warning');
    warn.classList.remove('hidden');
    setTimeout(() => warn.classList.add('hidden'), 2500);
    return;
  }

  tasks.push({ id: Date.now(), text, done: false });
  saveTasks();
  input.value = '';
  $('duplicate-warning').classList.add('hidden');
  renderTasks();
}

function toggleDone(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
  saveTasks(); renderTasks();
}

function saveEdit(id, newText) {
  const text = newText.trim();
  if (!text) { editingId = null; renderTasks(); return; }

  const isDuplicate = tasks.some(t => t.id !== id && t.text.toLowerCase() === text.toLowerCase());
  if (isDuplicate) {
    editingId = null;
    const warn = $('duplicate-warning');
    warn.classList.remove('hidden');
    setTimeout(() => warn.classList.add('hidden'), 2500);
    renderTasks();
    return;
  }

  tasks = tasks.map(t => t.id === id ? { ...t, text } : t);
  saveTasks(); editingId = null; renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(); renderTasks();
}

$('add-task-btn').addEventListener('click', addTask);
$('task-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
$('sort-select').addEventListener('change', renderTasks);
renderTasks();

// ───────────── QUICK LINKS ─────────────
let links = ls.get('quickLinks', [
  { id: 1, name: 'YouTube',       url: 'https://youtube.com' },
  { id: 2, name: 'Spotify',       url: 'https://open.spotify.com' },
  { id: 3, name: 'Google Scholar',url: 'https://scholar.google.com' },
  { id: 4, name: 'ChatGPT',       url: 'https://chat.openai.com' },
]);

function saveLinks() { ls.set('quickLinks', links); }

function renderLinks() {
  const container = $('links-container');
  const empty     = $('links-empty');
  container.innerHTML = '';

  empty.classList.toggle('hidden', links.length > 0);

  links.forEach((link) => {
    const chip = document.createElement('a');
    chip.className = 'link-chip';
    chip.href      = link.url;
    chip.target    = '_blank';
    chip.rel       = 'noopener noreferrer';

    const favicon = `https://www.google.com/s2/favicons?sz=16&domain=${encodeURIComponent(link.url)}`;
    chip.innerHTML = `<img src="${favicon}" width="16" height="16" alt="" onerror="this.style.display='none'"> ${link.name} <button class="link-delete-btn" title="Remove">✕</button>`;

    chip.querySelector('.link-delete-btn').addEventListener('click', (e) => {
      e.preventDefault();
      links = links.filter(l => l.id !== link.id);
      saveLinks(); renderLinks();
    });

    container.appendChild(chip);
  });
}

$('add-link-btn').addEventListener('click', () => {
  $('add-link-form').classList.toggle('hidden');
  if (!$('add-link-form').classList.contains('hidden')) $('link-name-input').focus();
});

$('cancel-link-btn').addEventListener('click', () => {
  $('add-link-form').classList.add('hidden');
  $('link-name-input').value = '';
  $('link-url-input').value  = '';
});

$('save-link-btn').addEventListener('click', () => {
  const name = $('link-name-input').value.trim();
  let   url  = $('link-url-input').value.trim();
  if (!name || !url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  links.push({ id: Date.now(), name, url });
  saveLinks(); renderLinks();
  $('add-link-form').classList.add('hidden');
  $('link-name-input').value = '';
  $('link-url-input').value  = '';
});

renderLinks();
