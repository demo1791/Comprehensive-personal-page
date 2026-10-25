/* =====================================================================
   个人数字名片 · 小工具演示脚本
   职责：
     1. 番茄专注钟：模式切换、开始/暂停/重置、进度条、完成计数
     2. 待办清单：新增、勾选完成、删除、localStorage 持久化
   说明：本文件只处理「小工具」交互，不含业务数据；
        复用 main.js 中的 escapeHtml（main.js 先于本文件加载）。
   ===================================================================== */

'use strict';

/* ===================== 工具1：番茄专注钟 ===================== */

/* 各模式时长（秒） */
const POMO_DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };

let pomoMode = 'focus';
let pomoRemaining = POMO_DURATIONS.focus;
let pomoTimerId = null;
let pomoCompleted = 0;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* 完成提示音（音频不可用时静默忽略） */
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) { /* 忽略 */ }
}

function initPomodoro() {
  const timeEl = document.getElementById('pomo-time');
  const barEl = document.getElementById('pomo-bar');
  const startEl = document.getElementById('pomo-start');
  const resetEl = document.getElementById('pomo-reset');
  const statsEl = document.getElementById('pomo-stats');
  const modeEls = Array.from(document.querySelectorAll('.tool-mode'));

  function render() {
    const total = POMO_DURATIONS[pomoMode];
    timeEl.textContent = formatTime(pomoRemaining);
    // 进度条：已用时间占比
    barEl.style.width = `${((total - pomoRemaining) / total) * 100}%`;
    startEl.textContent = pomoTimerId ? '暂停' : '开始';
    modeEls.forEach((b) => b.classList.toggle('active', b.dataset.mode === pomoMode));
  }

  function stop() {
    if (pomoTimerId) { clearInterval(pomoTimerId); pomoTimerId = null; }
  }

  function setMode(mode) {
    stop();
    pomoMode = mode;
    pomoRemaining = POMO_DURATIONS[mode];
    render();
  }

  function complete() {
    stop();
    if (pomoMode === 'focus') {
      pomoCompleted += 1;
      statsEl.textContent = `已完成 ${pomoCompleted} 个番茄 🍅`;
      beep();
    }
    pomoRemaining = POMO_DURATIONS[pomoMode];
    render();
  }

  modeEls.forEach((btn) => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

  startEl.addEventListener('click', () => {
    if (pomoTimerId) { stop(); render(); return; }
    pomoTimerId = setInterval(() => {
      pomoRemaining -= 1;
      if (pomoRemaining <= 0) {
        pomoRemaining = 0;
        render();
        complete();
        return;
      }
      render();
    }, 1000);
    render();
  });

  resetEl.addEventListener('click', () => {
    stop();
    pomoRemaining = POMO_DURATIONS[pomoMode];
    render();
  });

  render();
}

/* ===================== 工具2：待办清单 ===================== */

const TODO_KEY = 'tools-todo-v1';

function loadTodos() {
  try { return JSON.parse(localStorage.getItem(TODO_KEY)) || []; }
  catch (e) { return []; }
}
function saveTodos(list) {
  try { localStorage.setItem(TODO_KEY, JSON.stringify(list)); }
  catch (e) { /* 存储不可用时忽略 */ }
}

function initTodo() {
  let todos = loadTodos();

  const formEl = document.getElementById('todo-form');
  const inputEl = document.getElementById('todo-input');
  const listEl = document.getElementById('todo-list');
  const statsEl = document.getElementById('todo-stats');

  function render() {
    if (!todos.length) {
      listEl.innerHTML = '<li class="todo-empty">暂无待办，添加一个吧</li>';
      statsEl.textContent = '';
      return;
    }
    listEl.innerHTML = todos.map((t) => `
      <li class="todo-item ${t.done ? 'done' : ''}" data-id="${t.id}">
        <button class="todo-toggle" data-action="toggle" aria-label="切换完成状态">✓</button>
        <span class="todo-text">${escapeHtml(t.text)}</span>
        <button class="todo-del" data-action="delete" aria-label="删除">×</button>
      </li>`).join('');

    const done = todos.filter((t) => t.done).length;
    statsEl.textContent = `已完成 ${done} / ${todos.length}`;
  }

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    todos.push({ id: Date.now(), text, done: false });
    saveTodos(todos);
    render();
    inputEl.value = '';
    inputEl.focus();
  });

  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const item = btn.closest('.todo-item');
    const id = Number(item.dataset.id);
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    if (btn.dataset.action === 'toggle') {
      todo.done = !todo.done;
    } else if (btn.dataset.action === 'delete') {
      todos = todos.filter((t) => t.id !== id);
    }
    saveTodos(todos);
    render();
  });

  render();
}

/* ===================== 启动 ===================== */

document.addEventListener('DOMContentLoaded', () => {
  initPomodoro();
  initTodo();
});
