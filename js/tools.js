/* =====================================================================
   个人数字名片 · 作品集在线工具脚本
   工具：
     1. 番茄专注钟 —— 模式切换、开始/暂停/重置、进度条、完成计数
     2. 待办清单（进阶版）—— 优先级、状态筛选、行内编辑、localStorage
     3. Markdown 笔记 —— 新建/删除/切换、Markdown 预览、自动保存
     4. 天气查询 —— Open-Meteo 免费 API、定位、收藏城市
   说明：本文件只处理「工具」交互，不含业务数据；
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
  const modeEls = Array.from(document.querySelectorAll('[data-mode]'));

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

/* ===================== 工具2：待办清单（进阶版） ===================== */

const TODO_KEY = 'tools-todo-v1';
const PRIO_LABEL = { high: '高', medium: '中', low: '低' };

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
  let todoFilter = 'all';
  let editingId = null;

  const formEl = document.getElementById('todo-form');
  const inputEl = document.getElementById('todo-input');
  const priorityEl = document.getElementById('todo-priority');
  const listEl = document.getElementById('todo-list');
  const statsEl = document.getElementById('todo-stats');
  const filterBtns = Array.from(document.querySelectorAll('#todo-filters .tool-mode'));

  function todoItemHTML(t) {
    const prio = t.priority || 'medium';
    // 编辑态：文本变成输入框
    if (t.id === editingId) {
      return `
        <li class="todo-item ${t.done ? 'done' : ''}" data-id="${t.id}">
          <button class="todo-toggle" data-action="toggle" aria-label="切换完成状态">✓</button>
          <input class="todo-edit-input" value="${escapeHtml(t.text)}" />
          <button class="todo-del" data-action="delete" aria-label="删除">×</button>
        </li>`;
    }
    return `
      <li class="todo-item ${t.done ? 'done' : ''}" data-id="${t.id}">
        <button class="todo-toggle" data-action="toggle" aria-label="切换完成状态">✓</button>
        <span class="todo-text">${escapeHtml(t.text)}</span>
        <span class="todo-priority prio-${prio}">${PRIO_LABEL[prio]}</span>
        <button class="todo-edit" data-action="edit" aria-label="编辑">✎</button>
        <button class="todo-del" data-action="delete" aria-label="删除">×</button>
      </li>`;
  }

  function render() {
    filterBtns.forEach((b) => b.classList.toggle('active', b.dataset.filter === todoFilter));

    if (!todos.length) {
      listEl.innerHTML = '<li class="todo-empty">暂无待办，添加一个吧</li>';
      statsEl.textContent = '';
      return;
    }

    const list = todos.filter((t) => {
      if (todoFilter === 'active') return !t.done;
      if (todoFilter === 'done') return t.done;
      return true;
    });

    listEl.innerHTML = list.length
      ? list.map(todoItemHTML).join('')
      : '<li class="todo-empty">该筛选下暂无待办</li>';

    const done = todos.filter((t) => t.done).length;
    statsEl.textContent = `已完成 ${done} / 共 ${todos.length}`;
  }

  function commitEdit(input) {
    const id = Number(input.closest('.todo-item').dataset.id);
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      const v = input.value.trim();
      if (v) todo.text = v;
    }
    editingId = null;
    saveTodos(todos);
    render();
  }

  filterBtns.forEach((btn) => btn.addEventListener('click', () => {
    todoFilter = btn.dataset.filter;
    render();
  }));

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    todos.push({ id: Date.now(), text, done: false, priority: priorityEl.value });
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

    if (btn.dataset.action === 'toggle') todo.done = !todo.done;
    else if (btn.dataset.action === 'delete') todos = todos.filter((t) => t.id !== id);
    else if (btn.dataset.action === 'edit') editingId = id;

    saveTodos(todos);
    render();
  });

  // 行内编辑：回车提交，Esc 取消
  listEl.addEventListener('keydown', (e) => {
    if (!e.target.classList.contains('todo-edit-input')) return;
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(e.target); }
    else if (e.key === 'Escape') { editingId = null; render(); }
  });

  // 行内编辑：失焦提交
  listEl.addEventListener('focusout', (e) => {
    if (e.target.classList.contains('todo-edit-input') && editingId !== null) commitEdit(e.target);
  });

  render();
}

/* ===================== 工具3：Markdown 笔记 ===================== */

const NOTES_KEY = 'tools-notes-v1';

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || []; }
  catch (e) { return []; }
}
function saveNotes(list) {
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(list)); }
  catch (e) { /* 忽略 */ }
}

/* 极简 Markdown 渲染：先转义 HTML 再套用规则，保证 XSS 安全 */
function renderMarkdown(src) {
  const lines = String(src ?? '').split('\n');
  let html = '';
  let inCode = false;
  let inList = false;

  function inline(text) {
    let t = escapeHtml(text);
    t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return t;
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) { html += '</code></pre>'; inCode = false; }
      else { html += '<pre><code>'; inCode = true; }
      continue;
    }
    if (inCode) { html += escapeHtml(line) + '\n'; continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      html += `<h${level}>${inline(h[2])}</h${level}>`;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`;
      continue;
    }
    if (inList) { html += '</ul>'; inList = false; }
    if (!line.trim()) continue;
    html += `<p>${inline(line)}</p>`;
  }
  if (inCode) html += '</code></pre>';
  if (inList) html += '</ul>';
  return html;
}

function initNotes() {
  let notes = loadNotes();
  let currentId = null;
  let preview = false;
  let saveTimer = null;

  const listEl = document.getElementById('note-list');
  const editorEl = document.getElementById('note-editor');
  const previewEl = document.getElementById('note-preview');
  const toggleEl = document.getElementById('note-toggle');
  const newEl = document.getElementById('note-new');
  const statusEl = document.getElementById('note-status');

  function current() {
    return notes.find((n) => n.id === currentId) || null;
  }

  function renderList() {
    if (!notes.length) {
      listEl.innerHTML = '<li class="note-empty">暂无笔记，点「新建」创建</li>';
      return;
    }
    listEl.innerHTML = notes.map((n) => {
      const title = (n.text.split('\n')[0] || '').replace(/^#+\s*/, '') || '未命名笔记';
      return `
        <li class="note-item ${n.id === currentId ? 'active' : ''}" data-id="${n.id}">
          <span class="note-item__title">${escapeHtml(title)}</span>
          <button class="note-item__del" data-action="del" aria-label="删除">×</button>
        </li>`;
    }).join('');
  }

  function renderEditor() {
    const n = current();
    editorEl.value = n ? n.text : '';
    if (preview) {
      previewEl.innerHTML = n ? renderMarkdown(n.text) : '';
      previewEl.hidden = false;
      editorEl.hidden = true;
      toggleEl.textContent = '编辑';
    } else {
      previewEl.hidden = true;
      editorEl.hidden = false;
      toggleEl.textContent = '预览';
    }
  }

  function save() {
    saveNotes(notes);
    statusEl.textContent = '已保存 ' + new Date().toLocaleTimeString();
  }

  function selectNote(id) {
    currentId = id;
    preview = false;
    renderList();
    renderEditor();
  }

  newEl.addEventListener('click', () => {
    const note = { id: Date.now(), text: '# 新笔记\n\n在这里开始记录你的想法…', updatedAt: Date.now() };
    notes.unshift(note);
    currentId = note.id;
    preview = false;
    save();
    renderList();
    renderEditor();
    editorEl.focus();
  });

  listEl.addEventListener('click', (e) => {
    const del = e.target.closest('[data-action="del"]');
    if (del) {
      const id = Number(del.closest('.note-item').dataset.id);
      notes = notes.filter((n) => n.id !== id);
      if (currentId === id) currentId = notes.length ? notes[0].id : null;
      save();
      renderList();
      renderEditor();
      return;
    }
    const item = e.target.closest('.note-item');
    if (item) selectNote(Number(item.dataset.id));
  });

  editorEl.addEventListener('input', () => {
    const n = current();
    if (!n) return;
    n.text = editorEl.value;
    n.updatedAt = Date.now();
    statusEl.textContent = '输入中…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 600);
  });

  toggleEl.addEventListener('click', () => {
    preview = !preview;
    renderEditor();
  });

  // 初始：选中第一篇，或显示空态
  if (notes.length) selectNote(notes[0].id);
  else { renderList(); renderEditor(); }
}

/* ===================== 工具4：天气查询 ===================== */

const WEATHER_FAV_KEY = 'tools-weather-fav-v1';

/* WMO 天气代码 → [图标, 中文] */
const WMO_MAP = {
  0: ['☀️', '晴'], 1: ['🌤️', '大致晴朗'], 2: ['⛅', '多云'], 3: ['☁️', '阴'],
  45: ['🌫️', '雾'], 48: ['🌫️', '雾凇'],
  51: ['🌦️', '小毛毛雨'], 53: ['🌦️', '毛毛雨'], 55: ['🌧️', '大毛毛雨'],
  56: ['🌧️', '冻毛毛雨'], 57: ['🌧️', '冻毛毛雨'],
  61: ['🌦️', '小雨'], 63: ['🌧️', '中雨'], 65: ['🌧️', '大雨'],
  66: ['🌧️', '冻雨'], 67: ['🌧️', '冻雨'],
  71: ['🌨️', '小雪'], 73: ['🌨️', '中雪'], 75: ['❄️', '大雪'], 77: ['🌨️', '雪粒'],
  80: ['🌦️', '小阵雨'], 81: ['🌧️', '阵雨'], 82: ['⛈️', '强阵雨'],
  85: ['🌨️', '小阵雪'], 86: ['🌨️', '阵雪'],
  95: ['⛈️', '雷阵雨'], 96: ['⛈️', '雷阵雨伴冰雹'], 99: ['⛈️', '强雷暴伴冰雹'],
};

function loadFavs() {
  try { return JSON.parse(localStorage.getItem(WEATHER_FAV_KEY)) || []; }
  catch (e) { return []; }
}
function saveFavs(list) {
  try { localStorage.setItem(WEATHER_FAV_KEY, JSON.stringify(list)); }
  catch (e) { /* 忽略 */ }
}

function initWeather() {
  let favs = loadFavs();
  let lastData = null;
  let currentLocation = null; // { name, lat, lon }

  const formEl = document.getElementById('weather-form');
  const inputEl = document.getElementById('weather-input');
  const locateEl = document.getElementById('weather-locate');
  const bodyEl = document.getElementById('weather-body');
  const statusEl = document.getElementById('weather-status');

  function wmo(code) {
    return WMO_MAP[code] || WMO_MAP[0];
  }

  function isFav(loc) {
    return favs.some((f) => f.lat === loc.lat && f.lon === loc.lon);
  }

  function render() {
    if (!lastData || !currentLocation) return;
    const cur = lastData.current;
    const daily = lastData.daily;
    const [icon, label] = wmo(cur.weather_code);
    const favorited = isFav(currentLocation);

    const days = daily.time.slice(0, 5).map((t, i) => ({
      date: t,
      code: daily.weather_code[i],
      max: daily.temperature_2m_max[i],
      min: daily.temperature_2m_min[i],
    }));

    bodyEl.innerHTML = `
      <div class="weather-current">
        <span class="weather-current__icon">${icon}</span>
        <div class="weather-current__info">
          <div class="weather-current__name">${escapeHtml(currentLocation.name)}</div>
          <div class="weather-current__temp">${Math.round(cur.temperature_2m)}°</div>
          <div class="weather-current__meta">${label} · 湿度 ${cur.relative_humidity_2m}% · 风速 ${cur.wind_speed_10m} km/h</div>
        </div>
        <button id="weather-fav-toggle" class="tool-btn tool-btn--sm">${favorited ? '★ 已收藏' : '☆ 收藏'}</button>
      </div>
      <div class="weather-daily">
        ${days.map((d) => {
          const [di] = wmo(d.code);
          const wd = '周' + '日一二三四五六'[new Date(d.date + 'T00:00:00').getDay()];
          return `<div class="weather-day">
            <div>${wd}</div>
            <div class="weather-day__icon">${di}</div>
            <div class="weather-day__temp">${Math.round(d.max)}° / ${Math.round(d.min)}°</div>
          </div>`;
        }).join('')}
      </div>
      ${favs.length ? `
        <div class="weather-fav">
          ${favs.map((f) => `
            <span class="weather-fav-item">
              <button class="weather-fav-btn" data-action="fav-city" data-name="${escapeHtml(f.name)}" data-lat="${f.lat}" data-lon="${f.lon}">${escapeHtml(f.name)}</button>
              <button class="weather-fav-del" data-action="fav-del" data-lat="${f.lat}" data-lon="${f.lon}" aria-label="删除收藏">×</button>
            </span>`).join('')}
        </div>` : ''}
    `;
  }

  async function fetchWeather(lat, lon, name) {
    statusEl.textContent = '加载中…';
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
        + '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m'
        + '&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5';
      const res = await fetch(url);
      if (!res.ok) throw new Error('network');
      lastData = await res.json();
      render();
      statusEl.textContent = '';
    } catch (err) {
      bodyEl.innerHTML = '<p class="weather-hint">天气获取失败，请检查网络后重试。</p>';
      statusEl.textContent = '';
    }
  }

  async function geocode(name) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=zh&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('network');
    const data = await res.json();
    if (!data.results || !data.results.length) throw new Error('not-found');
    const r = data.results[0];
    return { name: r.name + (r.admin1 ? ' · ' + r.admin1 : ''), lat: r.latitude, lon: r.longitude };
  }

  function toggleFav() {
    if (!currentLocation) return;
    if (isFav(currentLocation)) {
      favs = favs.filter((f) => !(f.lat === currentLocation.lat && f.lon === currentLocation.lon));
    } else {
      favs.push({ ...currentLocation });
    }
    saveFavs(favs);
    render();
  }

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = inputEl.value.trim();
    if (!q) return;
    try {
      const loc = await geocode(q);
      currentLocation = loc;
      await fetchWeather(loc.lat, loc.lon, loc.name);
    } catch (err) {
      bodyEl.innerHTML = `<p class="weather-hint">未找到「${escapeHtml(q)}」，换个关键词试试。</p>`;
      statusEl.textContent = '';
    }
  });

  locateEl.addEventListener('click', () => {
    if (!navigator.geolocation) {
      bodyEl.innerHTML = '<p class="weather-hint">当前浏览器不支持定位。</p>';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        currentLocation = { name: '当前位置', lat: pos.coords.latitude, lon: pos.coords.longitude };
        fetchWeather(pos.coords.latitude, pos.coords.longitude, '当前位置');
      },
      () => { bodyEl.innerHTML = '<p class="weather-hint">定位失败，请手动输入城市名。</p>'; }
    );
  });

  bodyEl.addEventListener('click', async (e) => {
    const toggle = e.target.closest('#weather-fav-toggle');
    if (toggle) { toggleFav(); return; }

    const city = e.target.closest('[data-action="fav-city"]');
    if (city) {
      currentLocation = { name: city.dataset.name, lat: Number(city.dataset.lat), lon: Number(city.dataset.lon) };
      await fetchWeather(currentLocation.lat, currentLocation.lon, currentLocation.name);
      return;
    }

    const del = e.target.closest('[data-action="fav-del"]');
    if (del) {
      const lat = Number(del.dataset.lat);
      const lon = Number(del.dataset.lon);
      favs = favs.filter((f) => !(f.lat === lat && f.lon === lon));
      saveFavs(favs);
      render();
    }
  });
}

/* ===================== 启动 ===================== */

document.addEventListener('DOMContentLoaded', () => {
  initPomodoro();
  initTodo();
  initNotes();
  initWeather();
});
