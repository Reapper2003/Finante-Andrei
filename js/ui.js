// Componente de interfață: elemente DOM, iconițe, bottom sheet, toast, confirmare, swipe, controale de formular.

import { state, save } from './store.js';
import { forInput, amountPlaceholder } from './fmt.js';
import { t as tr } from './i18n.js';

export const app = { rerender: () => {} };

/* ---------- Creare elemente ---------- */

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false || k === true) continue;
    el.append(k instanceof Node ? k : String(k));
  }
}

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'value') value = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (typeof v === 'boolean' && k in el) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  if (value !== undefined) el.value = value;
  return el;
}

const SVGNS = 'http://www.w3.org/2000/svg';
export function s(tag, props = {}, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  append(el, kids);
  return el;
}

/* ---------- Iconițe (linii simple) ---------- */

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9v11h13V9"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" stroke-width="2.6"/>',
  trend: '<path d="m3 16 6-6 4 4 8-8"/><path d="M15 6h6v6"/>',
  report: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8.5 16.5v-3M12 16.5v-7M15.5 16.5v-5"/>',
  more: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.5 4.5-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  chevL: '<path d="m15 5-7 7 7 7"/>',
  chevR: '<path d="m9 5 7 7-7 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8.5h14V12M12 8v12.5"/><path d="M12 8C10.5 4 6.5 4.2 7 6.6 7.4 8 12 8 12 8zM12 8c1.5-4 5.5-3.8 5-1.4C16.6 8 12 8 12 8z"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  pipette: '<path d="m14.5 4.5 5 5"/><path d="M17 2.5a2.1 2.1 0 0 1 3 3l-2.5 2.5-3-3z"/><path d="M15.5 7.5 6 17l-1 3 3-1 9.5-9.5"/>',
  trash: '<path d="M4 7h16M10 7V4.5h4V7"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5.5M14 11v5.5"/>',
  transfer: '<path d="M4 8h15l-4-4M20 16H5l4 4"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  scale: '<path d="M12 3v18M7 21h10M4 7h16"/><path d="m4 7-2.5 6a3 3 0 0 0 5 0zM20 7l-2.5 6a3 3 0 0 0 5 0z"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.6 3.2 7.8 7.5 9 4.3-1.2 7.5-4.4 7.5-9V6z"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  tag: '<path d="M3 12.5V4h8.5L21 13.5 13.5 21z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  wallet: '<path d="M4 7.5V18a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-1.5zM4 7.5A2 2 0 0 1 6 5.5h11V9"/><circle cx="16" cy="14.5" r="1.2" fill="currentColor"/>',
};

export function icon(name, size = 22) {
  const span = document.createElement('span');
  span.className = 'ic';
  span.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  return span;
}

/* ---------- Temă ---------- */

export const DEFAULT_ACCENT = '#6C47FF';

const hexToRgb = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  const n = parseInt(m ? m[1] : DEFAULT_ACCENT.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => rgbToHex(hexToRgb(a).map((v, i) => v * (1 - t) + hexToRgb(b)[i] * t));
const luminance = hex => {
  const [r, g, b] = hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
// Text alb sau închis, care se citește mai bine pe culoarea dată.
const DARK_TEXT = '#16131F';
const textOn = hex => {
  const L = luminance(hex);
  return 1.05 / (L + 0.05) >= (L + 0.05) / (luminance(DARK_TEXT) + 0.05) ? '#FFFFFF' : DARK_TEXT;
};

export function applyTheme() {
  const t = state.settings.theme;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121418' : '#F5F6F8');

  // Culoarea principală aleasă în Setări; în tema întunecată folosim o variantă mai deschisă.
  const base = /^#[0-9a-f]{6}$/i.test(state.settings.accent || '') ? state.settings.accent : DEFAULT_ACCENT;
  const accent = dark ? mix(base, '#FFFFFF', 0.3) : base;
  const onHero = textOn(base);
  const vars = {
    '--accent': accent,
    '--accent-soft': dark ? mix(base, '#1B1E24', 0.78) : mix(base, '#FFFFFF', 0.88),
    '--on-accent': textOn(accent),
    '--hero': base,
    '--on-hero': onHero,
    '--hero-pos': onHero === '#FFFFFF' ? '#B8F7D9' : '#0B5E3B',
    '--hero-neg': onHero === '#FFFFFF' ? '#FFD0D0' : '#8A1C1C',
    '--heat': base,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

/* ---------- Bottom sheet ---------- */
// Butonul „Înapoi” al telefonului închide panoul: la deschidere adăugăm o intrare în istoric.

let sheets = [];
let historyPushed = false;
let ignorePops = 0;
let afterPop = [];

window.addEventListener('popstate', () => {
  if (ignorePops > 0) {
    ignorePops--;
    const q = afterPop;
    afterPop = [];
    q.forEach(fn => fn());
    return;
  }
  if (sheets.length) {
    historyPushed = false;
    [...sheets].reverse().forEach(sh => sh.close(true));
  }
});

function pushSheetHistory() {
  if (historyPushed || !sheets.length) return;
  history.pushState({ sheet: true }, '');
  historyPushed = true;
}

export function openSheet({ title, body, footer, onClose }) {
  const overlay = h('div', { class: 'overlay' });
  const bodyEl = h('div', { class: 'sheet-body' }, body);
  const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-head' },
      h('h2', {}, title),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': tr('Închide'), onclick: () => api.close() }, icon('x'))),
    bodyEl,
    footer ? h('div', { class: 'sheet-foot' }, footer) : null);
  overlay.addEventListener('click', () => api.close());
  dragToClose(panel, bodyEl, overlay, () => api.close());
  document.body.append(overlay, panel);
  document.body.classList.add('noscroll');
  requestAnimationFrame(() => { overlay.classList.add('open'); panel.classList.add('open'); });

  let closed = false;
  const api = {
    el: panel,
    close(fromPop) {
      if (closed) return;
      closed = true;
      overlay.classList.remove('open');
      panel.classList.remove('open');
      setTimeout(() => { overlay.remove(); panel.remove(); }, 230);
      sheets = sheets.filter(x => x !== api);
      if (!sheets.length) {
        document.body.classList.remove('noscroll');
        if (!fromPop && historyPushed) {
          historyPushed = false;
          ignorePops++;
          history.back();
        }
      }
      onClose?.();
    },
  };
  sheets.push(api);
  if (ignorePops > 0) afterPop.push(pushSheetHistory);
  else pushSheetHistory();
  return api;
}

export const sheetOpen = () => sheets.length > 0;

// Panoul se poate trage în jos ca să se închidă: de oriunde, dacă lista din el e derulată sus.
function dragToClose(panel, body, overlay, close) {
  let x0 = 0, y0 = 0, t0 = 0, dy = 0, active = false, dragging = false;
  panel.addEventListener('touchstart', e => {
    active = e.touches.length === 1 && !(body.contains(e.target) && body.scrollTop > 0);
    if (!active) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; dragging = false;
  }, { passive: true });
  panel.addEventListener('touchmove', e => {
    if (!active) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!dragging) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      // În sus, în lateral sau cu lista derulată: e scroll obișnuit, nu închidere.
      if (my <= 0 || Math.abs(mx) > Math.abs(my) || body.scrollTop > 0) { active = false; return; }
      dragging = true;
      panel.style.transition = 'none';
      overlay.style.transition = 'none';
      document.activeElement?.blur?.();
    }
    e.preventDefault();
    dy = Math.max(0, my);
    panel.style.transform = `translate(-50%, ${dy}px)`;
    overlay.style.opacity = String(Math.max(0, 1 - dy / panel.offsetHeight));
  }, { passive: false });
  const end = () => {
    if (!active) return;
    active = false;
    if (!dragging) return;
    dragging = false;
    const fast = dy / Math.max(1, Date.now() - t0) > 0.5 && dy > 40;
    panel.style.transition = '';
    overlay.style.transition = '';
    panel.style.transform = '';
    overlay.style.opacity = '';
    if (fast || dy > Math.min(160, panel.offsetHeight * 0.3)) close();
  };
  panel.addEventListener('touchend', end);
  panel.addEventListener('touchcancel', end);
}

// Navigare sigură și când un panou e deschis.
export function go(hash) {
  const nav = () => { if (location.hash !== hash) location.hash = hash; else app.rerender(); };
  if (!sheets.length) { if (ignorePops > 0) afterPop.push(nav); else nav(); return; }
  const willPop = historyPushed;
  if (willPop) afterPop.push(nav);
  [...sheets].reverse().forEach(sh => sh.close());
  if (!willPop) nav();
}

export function confirmDialog({ title, message, ok = tr('Șterge'), danger = true }) {
  return new Promise(resolve => {
    let result = false;
    const sh = openSheet({
      title,
      body: message ? h('p', { class: 'muted' }, message) : null,
      footer: h('div', { class: 'btn-row' },
        btn(tr('Anulează'), () => sh.close(), 'ghost'),
        btn(ok, () => { result = true; sh.close(); }, danger ? 'danger' : 'primary')),
      onClose: () => resolve(result),
    });
  });
}

/* ---------- Toast ---------- */

let toastEl, toastTimer;
export function toast(msg) {
  if (!toastEl) {
    toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

/* ---------- Rând cu swipe stânga (Editează / Șterge) ---------- */

let closeOpenSwipe = null;

// trash: în loc de butoane cu text apare doar un coș de gunoi.
export function swipeRow(content, { onTap, onEdit, onDelete, trash = false, cls = '' }) {
  const front = h('div', { class: 'swipe-front' }, content);
  const actions = h('div', { class: 'swipe-actions' + (trash ? ' trash' : '') },
    onEdit && h('button', { type: 'button', class: 'sa-edit', tabindex: -1, onclick: e => { e.stopPropagation(); close(); onEdit(); } }, tr('Editează')),
    onDelete && h('button', { type: 'button', class: 'sa-del', tabindex: -1, 'aria-label': tr('Șterge'), onclick: e => { e.stopPropagation(); close(); onDelete(); } },
      trash ? icon('trash', 22) : tr('Șterge')));
  const wrap = h('div', { class: 'swipe ' + cls }, actions, front);
  const W = trash ? (onDelete ? 76 : 0) : (onEdit ? 84 : 0) + (onDelete ? 84 : 0);
  let x0 = 0, y0 = 0, start = 0, dx = 0, tracking = false, decided = false, horizontal = false, moved = false;

  function open() {
    if (closeOpenSwipe && closeOpenSwipe !== close) closeOpenSwipe();
    wrap.classList.add('open');
    front.style.transform = `translateX(${-W}px)`;
    closeOpenSwipe = close;
  }
  function close() {
    wrap.classList.remove('open');
    front.style.transform = '';
    if (closeOpenSwipe === close) closeOpenSwipe = null;
  }

  front.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    x0 = e.clientX; y0 = e.clientY;
    start = wrap.classList.contains('open') ? -W : 0;
    dx = start; tracking = true; decided = false; horizontal = false; moved = false;
  });
  front.addEventListener('pointermove', e => {
    if (!tracking) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!decided) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      decided = true;
      horizontal = Math.abs(mx) > Math.abs(my);
      if (!horizontal) { tracking = false; return; }
      try { front.setPointerCapture(e.pointerId); } catch { /* ignorat */ }
      front.style.transition = 'none';
      if (closeOpenSwipe && closeOpenSwipe !== close) closeOpenSwipe();
    }
    moved = true;
    dx = Math.max(-W - 24, Math.min(0, start + mx));
    front.style.transform = `translateX(${dx}px)`;
  });
  const end = () => {
    if (!tracking) return;
    tracking = false;
    if (!horizontal) return;
    front.style.transition = '';
    if (dx < -W / 2) open(); else close();
  };
  front.addEventListener('pointerup', end);
  front.addEventListener('pointercancel', end);
  front.addEventListener('click', () => {
    if (moved) { moved = false; return; }
    if (wrap.classList.contains('open')) { close(); return; }
    onTap?.();
  });
  return wrap;
}

/* ---------- Blocuri simple ---------- */

export function btn(label, onclick, cls = 'primary', extra = {}) {
  return h('button', { type: 'button', class: `btn ${cls}`, onclick, ...extra }, label);
}

export const card = (...kids) => h('section', { class: 'card' }, ...kids);

export function sectionHead(title, action) {
  return h('div', { class: 'sec-head' }, h('h2', {}, title), action || null);
}

export function linkBtn(label, onclick, ico = 'plus') {
  return h('button', { type: 'button', class: 'link-btn', onclick }, ico && icon(ico, 18), label);
}

export function progress(p, color) {
  const w = Math.max(0, Math.min(100, (p || 0) * 100));
  return h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': Math.round(w), 'aria-valuemin': 0, 'aria-valuemax': 100 },
    h('i', { style: { width: `${w}%`, ...(color ? { background: color } : {}) } }));
}

export function emptyState(text, actionLabel, onAction) {
  return h('div', { class: 'empty' }, h('p', {}, text), actionLabel ? btn(actionLabel, onAction) : null);
}

export function stat(label, value, cls = '') {
  return h('div', { class: 'stat' }, h('span', { class: 'label' }, label), h('strong', { class: cls }, value));
}

export function catIcon(c, size = 40) {
  return h('span', {
    class: 'cat-ic',
    style: { width: size + 'px', height: size + 'px', background: (c?.color || '#C9CED6') + '55', fontSize: Math.round(size * 0.48) + 'px' },
  }, c?.icon || '•');
}

export const signCls = v => (v > 0.004 ? 'pos' : v < -0.004 ? 'neg' : '');

/* ---------- Controale de formular ---------- */

export function field(label, control, hint) {
  return h('div', { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint ? h('span', { class: 'field-hint' }, hint) : null);
}

export function amountInput(value, props = {}) {
  return h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: amountPlaceholder(), class: 'amount', value: forInput(value), ...props });
}

export function textInput(value, props = {}) {
  return h('input', { type: 'text', autocomplete: 'off', value: value || '', ...props });
}

export function dateInput(value, props = {}) {
  return h('input', { type: 'date', value: value || '', ...props });
}

export function selectInput(options, value) {
  return h('select', { value: value ?? '' }, options.map(o => h('option', { value: o.value }, o.label)));
}

export function segmented(options, value, onChange, cls = '') {
  let cur = value;
  const wrap = h('div', { class: `seg ${cls}`.trim(), role: 'radiogroup' });
  const btns = options.map(o => h('button', {
    type: 'button', role: 'radio', 'aria-checked': String(o.value === cur), class: o.value === cur ? 'on' : '',
    onclick: () => {
      if (cur === o.value) return;
      cur = o.value;
      btns.forEach((b, i) => { b.classList.toggle('on', options[i].value === cur); b.setAttribute('aria-checked', String(options[i].value === cur)); });
      onChange?.(cur);
    },
  }, o.label));
  wrap.append(...btns);
  wrap.get = () => cur;
  return wrap;
}

export function switchInput(checked, onChange) {
  const input = h('input', { type: 'checkbox', class: 'switch', checked: !!checked, role: 'switch' });
  input.addEventListener('change', () => onChange?.(input.checked));
  return input;
}

export function switchRow(label, checked, onChange, hint) {
  const input = switchInput(checked, onChange);
  return h('label', { class: 'switch-row' }, h('span', {}, label, hint ? h('small', {}, hint) : null), input);
}

export function invalid(input, msg) {
  input.classList.add('err');
  input.addEventListener('input', () => input.classList.remove('err'), { once: true });
  input.focus();
  toast(msg);
}

export function emojiPicker(list, value, onChange) {
  let cur = value;
  const custom = h('input', { type: 'text', class: 'emoji-custom', maxlength: 4, placeholder: '✏️', 'aria-label': tr('Altă iconiță'), value: list.includes(value) ? '' : value || '' });
  const grid = h('div', { class: 'emoji-grid' });
  const paint = () => grid.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === cur));
  grid.append(...list.map(e => h('button', { type: 'button', 'data-v': e, onclick: () => { cur = e; custom.value = ''; paint(); onChange(cur); } }, e)), custom);
  custom.addEventListener('input', () => { const v = custom.value.trim(); if (v) { cur = v; paint(); onChange(cur); } });
  paint();
  return grid;
}

export function colorPicker(palette, value, onChange) {
  let cur = value;
  const wrap = h('div', { class: 'color-grid' });
  const paint = () => wrap.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === cur));
  wrap.append(...palette.map(c => h('button', { type: 'button', 'data-v': c, 'aria-label': c, style: { background: c }, onclick: () => { cur = c; paint(); onChange(c); } })));
  paint();
  return wrap;
}

// Livrează un fișier: meniul de partajare pe telefon, descărcare în rest.
export async function deliverFile(blob, filename) {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      // Fără titlu: pe iPhone, titlul ar fi salvat ca un fișier .txt separat lângă fișierul real.
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename, hidden: true });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ---------- Selector de culoare ---------- */
// Pe iPhone folosim selectorul telefonului (are grilă, spectru, glisoare, culori salvate și pipetă).
// Pe Android selectorul sistemului e foarte simplu, așa că deschidem selectorul de mai jos, cu aceleași moduri.

export const nativeColorPicker = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const clamp01 = v => Math.max(0, Math.min(1, v));
const toHex2 = n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
const cpHex = (r, g, b) => ('#' + toHex2(r) + toHex2(g) + toHex2(b)).toUpperCase();
function cpRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  return [n >> 16, (n >> 8) & 255, n & 255];
}
function hexToHsv(hex) {
  const [r, g, b] = cpRgb(hex).map(x => x / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let hue = 0;
  if (d) hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: ((hue * 60) + 360) % 360, s: max ? d / max : 0, v: max };
}
function hsvToHex({ h: hue, s: sat, v: val }) {
  const f = k => { const x = (k + hue / 60) % 6; return (val - val * sat * Math.max(0, Math.min(x, 4 - x, 1))) * 255; };
  return cpHex(f(5), f(3), f(1));
}
function hslHex(hue, sat, light) {
  const a = sat * Math.min(light, 1 - light);
  const f = n => { const k = (n + hue / 30) % 12; return (light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255; };
  return cpHex(f(0), f(8), f(4));
}

// Grila: primul rând nuanțe de gri, apoi 12 culori × 9 trepte, de la închis la deschis.
const GRID_COLS = 12;
const GRID = (() => {
  const rows = [Array.from({ length: GRID_COLS }, (_, i) => { const v = 255 * (1 - i / (GRID_COLS - 1)); return cpHex(v, v, v); })];
  const hues = [200, 215, 235, 262, 290, 325, 350, 8, 24, 40, 54, 90];
  for (let r = 0; r < 9; r++) rows.push(hues.map(hu => hslHex(hu, 0.92, 0.16 + r * 0.085)));
  return rows;
})();

// Trage cu degetul pe un element; fn primește poziția relativă (0..1, 0..1).
function dragArea(el, fn) {
  const move = e => { const r = el.getBoundingClientRect(); fn(clamp01((e.clientX - r.left) / r.width), clamp01((e.clientY - r.top) / r.height)); };
  el.addEventListener('pointerdown', e => { try { el.setPointerCapture(e.pointerId); } catch { /* ignorat */ } move(e); });
  el.addEventListener('pointermove', e => { if (e.buttons || e.pointerType !== 'mouse') move(e); });
}

let pickerMode = 'grid';
const MAX_SAVED = 14;

export function openColorPicker({ value, title = tr('Alege culoarea'), onPick }) {
  let hex = /^#[0-9a-f]{6}$/i.test(value || '') ? value.toUpperCase() : '#6C47FF';
  let hsv = hexToHsv(hex);
  const listeners = [];
  // from: cine a schimbat culoarea (spectrul își păstrează nuanța și la gri / negru).
  const setHex = (v, from) => {
    hex = v.toUpperCase();
    if (from !== 'spectrum') {
      const next = hexToHsv(hex);
      hsv = next.s === 0 || next.v === 0 ? { ...next, h: hsv.h } : next;
    }
    listeners.forEach(fn => fn(from));
  };

  /* Grilă */
  const grid = h('div', { class: 'cp-grid', style: { gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` } },
    GRID.flat().map(c => h('i', { style: { background: c }, 'data-c': c })));
  dragArea(grid, (x, y) => {
    const col = Math.min(GRID_COLS - 1, Math.floor(x * GRID_COLS)), row = Math.min(GRID.length - 1, Math.floor(y * GRID.length));
    setHex(GRID[row][col], 'grid');
  });
  listeners.push(() => grid.querySelectorAll('i').forEach(el => el.classList.toggle('on', el.dataset.c === hex)));

  /* Spectru */
  const area = h('div', { class: 'cp-area' }, h('i', { class: 'cp-thumb' }));
  const hueBar = h('div', { class: 'cp-hue' }, h('i', { class: 'cp-thumb' }));
  dragArea(area, (x, y) => { hsv = { ...hsv, s: x, v: 1 - y }; setHex(hsvToHex(hsv), 'spectrum'); });
  dragArea(hueBar, x => { hsv = { ...hsv, h: Math.min(359.9, x * 360) }; setHex(hsvToHex(hsv), 'spectrum'); });
  listeners.push(() => {
    area.style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`;
    Object.assign(area.firstChild.style, { left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex });
    Object.assign(hueBar.firstChild.style, { left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` });
  });
  const spectrum = h('div', { class: 'cp-spectrum' }, area, hueBar);

  /* Glisoare RGB */
  const sliders = h('div', { class: 'cp-sliders' }, ['R', 'G', 'B'].map((name, k) => {
    const track = h('div', { class: 'cp-track' }, h('i', { class: 'cp-thumb' }));
    const val = h('b', {});
    dragArea(track, x => { const rgb = cpRgb(hex); rgb[k] = x * 255; setHex(cpHex(...rgb), 'sliders'); });
    listeners.push(() => {
      const rgb = cpRgb(hex), lo = [...rgb], hi = [...rgb];
      lo[k] = 0; hi[k] = 255;
      track.style.background = `linear-gradient(to right, ${cpHex(...lo)}, ${cpHex(...hi)})`;
      Object.assign(track.firstChild.style, { left: `${(rgb[k] / 255) * 100}%`, background: hex });
      val.textContent = String(rgb[k]);
    });
    return h('div', { class: 'cp-srow' }, h('span', {}, name), track, val);
  }));

  const panels = { grid, spectrum, sliders };
  const panelBox = h('div', { class: 'cp-panel' });
  const showMode = m => { pickerMode = m; panelBox.replaceChildren(panels[m]); };
  const modeSeg = segmented([{ value: 'grid', label: tr('Grilă') }, { value: 'spectrum', label: tr('Spectru') }, { value: 'sliders', label: tr('Glisoare') }], pickerMode, showMode);
  showMode(pickerMode);

  /* Previzualizare, cod HEX, pipetă (doar unde browserul o permite) */
  const preview = h('span', { class: 'cp-preview' });
  const hexIn = h('input', { type: 'text', class: 'cp-hex', maxlength: 7, autocomplete: 'off', autocapitalize: 'characters', spellcheck: false, 'aria-label': 'HEX' });
  hexIn.addEventListener('input', () => {
    const v = hexIn.value.trim().replace(/^#?/, '#');
    if (/^#[0-9a-f]{6}$/i.test(v)) setHex(v, 'hex');
  });
  listeners.push(from => { preview.style.background = hex; if (from !== 'hex') hexIn.value = hex; });
  const dropper = 'EyeDropper' in window ? h('button', {
    type: 'button', class: 'icon-btn cp-drop', 'aria-label': tr('Ia culoarea de pe ecran'), title: tr('Ia culoarea de pe ecran'),
    onclick: () => new window.EyeDropper().open().then(r => {
      const v = /^#[0-9a-f]{6}$/i.test(r.sRGBHex) ? r.sRGBHex : cpHex(...(r.sRGBHex.match(/\d+/g) || [0, 0, 0]).map(Number));
      setHex(v, 'drop');
    }).catch(() => {}),
  }, icon('pipette', 20)) : null;

  /* Culorile mele: + salvează culoarea curentă; ține apăsat pe una ca s-o ștergi. */
  const savedBox = h('div', { class: 'cp-saved' });
  const paintSaved = () => {
    const list = state.settings.savedColors || [];
    savedBox.replaceChildren(
      ...list.map(c => {
        let timer = null, long = false;
        const b = h('button', {
          type: 'button', class: 'cp-sw' + (c === hex ? ' on' : ''), style: { background: c }, 'aria-label': c,
          onclick: () => { if (!long) setHex(c, 'saved'); long = false; },
        });
        b.addEventListener('pointerdown', () => {
          long = false;
          timer = setTimeout(() => {
            long = true;
            state.settings.savedColors = (state.settings.savedColors || []).filter(x => x !== c);
            save();
            paintSaved();
            toast(tr('Culoare ștearsă'));
          }, 600);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => clearTimeout(timer)));
        b.addEventListener('contextmenu', e => e.preventDefault());
        return b;
      }),
      h('button', {
        type: 'button', class: 'cp-sw add', 'aria-label': tr('Salvează culoarea'), onclick: () => {
          state.settings.savedColors = [hex, ...(state.settings.savedColors || []).filter(x => x !== hex)].slice(0, MAX_SAVED);
          save();
          paintSaved();
          toast(tr('Culoare salvată'));
        },
      }, icon('plus', 18)));
  };
  listeners.push(paintSaved);

  setHex(hex, 'init');
  const sh = openSheet({
    title,
    body: h('div', { class: 'cp' },
      modeSeg, panelBox,
      h('div', { class: 'cp-row' }, preview, hexIn, dropper),
      h('div', { class: 'cp-saved-head' }, h('span', { class: 'field-label' }, tr('Culorile mele')), h('small', { class: 'muted' }, tr('ține apăsat ca să ștergi'))),
      savedBox),
    footer: h('div', { class: 'btn-row' },
      btn(tr('Anulează'), () => sh.close(), 'ghost'),
      btn(tr('Aplică'), () => { sh.close(); onPick(hex); })),
  });
}
