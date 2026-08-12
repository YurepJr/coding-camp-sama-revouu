/* ============================================================
   MY DASHBOARD — app.js
   Features:
     - Greeting + live date/time
     - Focus Timer (custom duration, Start/Stop/Reset)
     - To-Do List (add, edit, done, delete, filter, LocalStorage)
     - Quick Links (add, delete, favicon, LocalStorage)
   Challenges:
     #1  Light / Dark mode
     #2  Custom name in greeting
     #3  Prevent duplicate tasks
   Bonus:
     Sort tasks A-Z / Z-A
   ============================================================ */

'use strict';

/* ------------------------------------------------------------
   STORAGE HELPERS
   ------------------------------------------------------------ */
const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage error:', e);
    }
  },
};

/* ============================================================
   1. DATE / TIME & GREETING
   ============================================================ */
const datetimeEl = document.getElementById('datetime');
const greetingEl = document.getElementById('greeting');

function getGreetingWord(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function updateClock() {
  const now  = new Date();
  const hour = now.getHours();

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  datetimeEl.textContent = `${dateStr}  •  ${timeStr}`;

  const name = store.get('userName', '');
  greetingEl.textContent = name
    ? `${getGreetingWord(hour)}, ${name}!`
    : `${getGreetingWord(hour)}!`;
}

updateClock();
setInterval(updateClock, 1000);

/* ============================================================
   2. LIGHT / DARK MODE  (Challenge #1)
   ============================================================ */
const themeToggleBtn = document.getElementById('themeToggle');
const themeIconEl    = document.getElementById('themeIcon');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
  store.set('theme', theme);
}

applyTheme(store.get('theme', 'light'));

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ============================================================
   3. CUSTOM NAME  (Challenge #2)
   ============================================================ */
const nameModal     = document.getElementById('nameModal');
const nameInput     = document.getElementById('nameInput');
const nameSaveBtn   = document.getElementById('nameSave');
const nameCancelBtn = document.getElementById('nameCancel');
const nameBtnEl     = document.getElementById('nameBtn');

function openNameModal() {
  nameInput.value = store.get('userName', '');
  nameModal.hidden = false;
  nameInput.focus();
}

function closeNameModal() {
  nameModal.hidden = true;
}

nameBtnEl.addEventListener('click', openNameModal);

nameSaveBtn.addEventListener('click', () => {
  store.set('userName', nameInput.value.trim());
  closeNameModal();
  updateClock();
});

nameCancelBtn.addEventListener('click', closeNameModal);

nameModal.addEventListener('click', (e) => {
  if (e.target === nameModal || e.target.classList.contains('modal__backdrop')) {
    closeNameModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !nameModal.hidden) closeNameModal();
});

/* ============================================================
   4. FOCUS TIMER
   ============================================================ */
const timerDisplayEl = document.getElementById('timerDisplay');
const timerStartBtn  = document.getElementById('timerStart');
const timerStopBtn   = document.getElementById('timerStop');
const timerResetBtn  = document.getElementById('timerReset');
const timerStatusEl  = document.getElementById('timerStatus');
const timerMinutesEl = document.getElementById('timerMinutes');

let timerInterval = null;
let timerSeconds  = 0;
let timerRunning  = false;

function getDuration() {
  const v = parseInt(timerMinutesEl.value, 10);
  return (isNaN(v) || v < 1) ? 25 * 60 : v * 60;
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

function renderTimer(secs) {
  timerDisplayEl.textContent = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = getDuration();
  renderTimer(timerSeconds);
  timerStatusEl.textContent = '';
  timerDisplayEl.classList.remove('running');
  timerStartBtn.disabled = false;
  timerStopBtn.disabled  = true;
}

resetTimer();

timerMinutesEl.addEventListener('change', () => {
  if (!timerRunning) resetTimer();
});

timerStartBtn.addEventListener('click', () => {
  if (timerRunning) return;
  if (timerSeconds <= 0) resetTimer();

  timerRunning = true;
  timerStartBtn.disabled = true;
  timerStopBtn.disabled  = false;
  timerDisplayEl.classList.add('running');
  timerStatusEl.textContent = '🔥 Focus!';

  timerInterval = setInterval(() => {
    timerSeconds--;
    renderTimer(timerSeconds);

    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerDisplayEl.classList.remove('running');
      timerStatusEl.textContent = "🎉 Time's up! Great work.";
      timerStartBtn.disabled = false;
      timerStopBtn.disabled  = true;
      if (Notification.permission === 'granted') {
        new Notification('Focus Timer', { body: 'Session complete!' });
      }
    }
  }, 1000);
});

timerStopBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
  timerDisplayEl.classList.remove('running');
  timerStatusEl.textContent = 'Paused.';
  timerStartBtn.disabled = false;
  timerStopBtn.disabled  = true;
});

timerResetBtn.addEventListener('click', resetTimer);

// Ask notification permission once
document.addEventListener('click', () => {
  if (Notification && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, { once: true });

/* ============================================================
   5. TO-DO LIST
   ============================================================ */
const todoFormEl  = document.getElementById('todoForm');
const todoInputEl = document.getElementById('todoInput');
const todoListEl  = document.getElementById('todoList');
const todoEmptyEl = document.getElementById('todoEmpty');
const sortBtnEl   = document.getElementById('sortBtn');

let todos      = store.get('todos', []);
let todoFilter = 'all';
let sortAsc    = true;

/* ---- helpers ---- */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function saveTodos() {
  store.set('todos', todos);
}

function isDuplicate(text, excludeId = null) {
  return todos.some(t =>
    t.id !== excludeId &&
    t.text.trim().toLowerCase() === text.trim().toLowerCase()
  );
}

function getVisible() {
  if (todoFilter === 'active') return todos.filter(t => !t.done);
  if (todoFilter === 'done')   return todos.filter(t =>  t.done);
  return todos;
}

/* ---- render ---- */
function renderTodos() {
  todoListEl.innerHTML = '';
  const list = getVisible();
  todoEmptyEl.style.display = list.length === 0 ? 'block' : 'none';

  list.forEach(todo => {
    const li = document.createElement('li');
    li.className  = `todo__item${todo.done ? ' done' : ''}`;
    li.dataset.id = todo.id;

    // Checkbox
    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.checked = todo.done;
    cb.setAttribute('aria-label', `Mark "${todo.text}" done`);
    cb.addEventListener('change', () => toggleTodo(todo.id));

    // Text
    const span = document.createElement('span');
    span.className   = 'todo__text';
    span.textContent = todo.text;

    // Actions wrapper
    const actions = document.createElement('div');
    actions.className = 'todo__actions';

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className   = 'btn btn--outline';
    editBtn.style.cssText = 'padding:3px 8px;font-size:.78rem;';
    editBtn.textContent = '✏️';
    editBtn.setAttribute('aria-label', `Edit "${todo.text}"`);
    editBtn.addEventListener('click', () => startEdit(todo.id, li, span));

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className   = 'btn--danger';
    delBtn.textContent = '🗑';
    delBtn.setAttribute('aria-label', `Delete "${todo.text}"`);
    delBtn.addEventListener('click', () => deleteTodo(todo.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(cb);
    li.appendChild(span);
    li.appendChild(actions);
    todoListEl.appendChild(li);
  });
}

/* ---- actions ---- */
function addTodo(text) {
  text = text.trim();
  if (!text) return;

  // Challenge #3: prevent duplicate
  if (isDuplicate(text)) {
    todoInputEl.style.borderColor = 'var(--danger)';
    todoInputEl.placeholder = '⚠ Task already exists!';
    setTimeout(() => {
      todoInputEl.style.borderColor = '';
      todoInputEl.placeholder = 'Add a new task…';
    }, 2000);
    return;
  }

  todos.push({ id: genId(), text, done: false });
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  const t = todos.find(t => t.id === id);
  if (t) { t.done = !t.done; saveTodos(); renderTodos(); }
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
}

function startEdit(id, li, textSpan) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  // Replace span with input
  const editInput = document.createElement('input');
  editInput.type      = 'text';
  editInput.className = 'todo__edit-input';
  editInput.value     = todo.text;
  editInput.maxLength = 120;
  textSpan.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  // Replace edit btn with save btn
  const actions    = li.querySelector('.todo__actions');
  const oldEditBtn = actions.querySelector('.btn--outline');

  const saveBtn = document.createElement('button');
  saveBtn.className   = 'btn btn--primary';
  saveBtn.style.cssText = 'padding:3px 10px;font-size:.78rem;';
  saveBtn.textContent = '✔';
  saveBtn.setAttribute('aria-label', 'Save edit');
  oldEditBtn.replaceWith(saveBtn);

  const commit = () => {
    const val = editInput.value.trim();
    if (!val) return;
    if (isDuplicate(val, id)) {
      editInput.style.borderColor = 'var(--danger)';
      return;
    }
    todo.text = val;
    saveTodos();
    renderTodos();
  };

  saveBtn.addEventListener('click', commit);
  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  commit();
    if (e.key === 'Escape') renderTodos(); // cancel
  });
}

function sortTodos() {
  todos.sort((a, b) => {
    const cmp = a.text.toLowerCase().localeCompare(b.text.toLowerCase());
    return sortAsc ? cmp : -cmp;
  });
  sortAsc = !sortAsc;
  sortBtnEl.textContent = sortAsc ? '⇅ Sort' : '⇅ Sort ↑';
  saveTodos();
  renderTodos();
}

/* ---- events ---- */
todoFormEl.addEventListener('submit', e => {
  e.preventDefault();
  addTodo(todoInputEl.value);
  todoInputEl.value = '';
});

sortBtnEl.addEventListener('click', sortTodos);

document.querySelectorAll('.btn--chip[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn--chip[data-filter]')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    todoFilter = btn.dataset.filter;
    renderTodos();
  });
});

renderTodos();

/* ============================================================
   6. QUICK LINKS
   ============================================================ */
const linkFormEl  = document.getElementById('linkForm');
const linkNameEl  = document.getElementById('linkName');
const linkUrlEl   = document.getElementById('linkUrl');
const linkGridEl  = document.getElementById('linkGrid');
const linkEmptyEl = document.getElementById('linkEmpty');

let links = store.get('links', []);

function saveLinks() {
  store.set('links', links);
}

function getFavicon(url) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).origin}&sz=32`;
  } catch {
    return null;
  }
}

function renderLinks() {
  linkGridEl.innerHTML = '';
  linkEmptyEl.style.display = links.length === 0 ? 'block' : 'none';

  links.forEach((link, i) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'link__wrapper';

    const a = document.createElement('a');
    a.href      = link.url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.className = 'link__item';
    a.setAttribute('aria-label', `Open ${link.name}`);

    const favicon = getFavicon(link.url);
    if (favicon) {
      const img = document.createElement('img');
      img.src = favicon;
      img.alt = '';
      img.onerror = () => img.remove();
      a.appendChild(img);
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = link.name;
    a.appendChild(nameSpan);

    const removeBtn = document.createElement('button');
    removeBtn.className   = 'link__remove';
    removeBtn.textContent = '✕ remove';
    removeBtn.setAttribute('aria-label', `Remove ${link.name}`);
    removeBtn.addEventListener('click', () => {
      links.splice(i, 1);
      saveLinks();
      renderLinks();
    });

    wrapper.appendChild(a);
    wrapper.appendChild(removeBtn);
    linkGridEl.appendChild(wrapper);
  });
}

linkFormEl.addEventListener('submit', e => {
  e.preventDefault();
  const name = linkNameEl.value.trim();
  let   url  = linkUrlEl.value.trim();

  if (!name || !url) return;

  // Auto-add https:// if missing
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  try { new URL(url); } catch {
    linkUrlEl.style.borderColor = 'var(--danger)';
    setTimeout(() => { linkUrlEl.style.borderColor = ''; }, 2000);
    return;
  }

  links.push({ name, url });
  saveLinks();
  renderLinks();

  linkNameEl.value = '';
  linkUrlEl.value  = '';
  linkNameEl.focus();
});

renderLinks();
