/* =====================================================================
   个人数字名片 · 主脚本
   职责：
     1. 渲染导航头部 / 首屏（姓名 + 简介 + 头像首字）
     2. 渲染「个人经历时间线」（模块1），处理展开/收起与空状态
   说明：业务数据全部来自 data.js，本文件不含任何业务数据。
   ===================================================================== */

'use strict';

/* ===================== 工具函数 ===================== */

/* HTML 转义：防止数据中的特殊字符破坏结构或注入脚本 */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* 空状态占位组件（模块1 时间线使用） */
function emptyStateHTML(text) {
  return `
    <div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round"
              d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 4v2" />
        <circle cx="12" cy="9" r="1" />
      </svg>
      <p>${escapeHtml(text)}</p>
    </div>`;
}

/* ===================== 导航头部 / 首屏 ===================== */

function renderProfile() {
  document.getElementById('header-name').textContent = PROFILE.name;
  document.getElementById('hero-avatar').textContent = PROFILE.name.slice(0, 1);
  document.getElementById('hero-name').textContent = PROFILE.name;
  document.getElementById('hero-intro').textContent = PROFILE.intro;
}

/* ===================== 模块1：个人经历时间线 ===================== */

/* 生成单条时间线条目 HTML */
function timelineItemHTML(item) {
  // 备注为空时不渲染「展开箭头 + 备注区」
  const hasNote = Boolean(item.detailNote);
  return `
    <article class="timeline-item" role="button" tabindex="0" aria-expanded="false">
      <span class="timeline-marker" aria-hidden="true"></span>
      <div class="timeline-card">
        <div class="mb-1 text-sm font-medium text-indigo-600">
          ${escapeHtml(item.startTime)} — ${escapeHtml(item.endTime)}
        </div>
        <h3 class="text-base font-semibold text-slate-900">${escapeHtml(item.title)}</h3>
        <span class="mt-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
          ${escapeHtml(item.tag)}
        </span>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">${escapeHtml(item.desc)}</p>
        ${hasNote ? `
          <div class="timeline-detail">
            <p class="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-500">
              ${escapeHtml(item.detailNote)}
            </p>
          </div>
          <div class="mt-3 flex items-center gap-1 text-xs text-slate-400">
            详情备注
            <span class="timeline-chevron">▾</span>
          </div>
        ` : ''}
      </div>
    </article>`;
}

function renderTimeline() {
  const container = document.getElementById('timeline-container');

  // 边界处理：数组为空 → 渲染空状态提示，避免空白错乱布局
  if (!TIMELINE_DATA.length) {
    container.innerHTML = emptyStateHTML('暂无经历数据，敬请期待。');
    return;
  }

  container.innerHTML =
    `<div class="timeline">${TIMELINE_DATA.map(timelineItemHTML).join('')}</div>`;
}

/* 时间线交互：点击条目展开 / 收起备注（事件委托 + 键盘支持） */
function initTimeline() {
  const container = document.getElementById('timeline-container');

  container.addEventListener('click', (e) => {
    const item = e.target.closest('.timeline-item');
    if (item && item.querySelector('.timeline-detail')) toggleTimelineItem(item);
  });

  // 键盘：Enter / 空格 均可展开（与 role="button" 语义一致）
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.timeline-item');
    if (item && item.querySelector('.timeline-detail')) {
      e.preventDefault();
      toggleTimelineItem(item);
    }
  });
}

function toggleTimelineItem(item) {
  const isOpen = item.classList.toggle('is-open');
  item.setAttribute('aria-expanded', String(isOpen));
}

/* ===================== 启动 ===================== */

document.addEventListener('DOMContentLoaded', () => {
  renderProfile();

  // 模块1：时间线
  renderTimeline();
  initTimeline();
});
