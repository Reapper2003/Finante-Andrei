// Grafice SVG simple: cerc (donut) interactiv și grafic linie.

import { h, s } from './ui.js';
import { pct, compact, isPrivate } from './fmt.js';
import { t as tr } from './i18n.js';

export function donut({ items, title, format, onLegend, size = 200, legendLimit = Infinity }) {
  const total = items.reduce((a, i) => a + i.value, 0);
  const R = 70, SW = 20, C = 2 * Math.PI * R;
  const svg = s('svg', { viewBox: '0 0 180 180', width: size, height: size, class: 'donut-svg', role: 'img', 'aria-label': title });
  svg.append(s('circle', { cx: 90, cy: 90, r: R, fill: 'none', stroke: 'var(--soft)', 'stroke-width': SW }));
  const gap = items.length > 1 ? 1.5 : 0;
  let acc = 0, sel = null;
  const arcs = items.map((it, i) => {
    const len = (it.value / total) * C;
    const el = s('circle', {
      cx: 90, cy: 90, r: R, fill: 'none', stroke: it.color, 'stroke-width': SW, class: 'arc',
      'stroke-dasharray': `${Math.max(0.01, len - gap)} ${C}`, 'stroke-dashoffset': -acc, transform: 'rotate(-90 90 90)',
    });
    acc += len;
    el.addEventListener('click', () => pick(i));
    return el;
  });
  svg.append(...arcs);

  const center = h('div', { class: 'donut-center' });
  const rows = [];
  function paint() {
    const it = sel == null ? null : items[sel];
    center.replaceChildren(...[
      h('span', { class: 'dc-label' }, it ? it.label : title),
      (v => h('strong', { class: 'dc-value' + (v.length > 12 ? ' long' : '') }, v))(format(it ? it.value : total)),
      it ? h('span', { class: 'dc-pct' }, pct(it.value / total)) : null,
    ].filter(Boolean));
    arcs.forEach((a, j) => {
      a.setAttribute('stroke-width', j === sel ? SW + 6 : SW);
      a.style.opacity = sel == null || j === sel ? 1 : 0.35;
    });
    rows.forEach((r, j) => r.classList.toggle('sel', j === sel));
  }
  function pick(i) { sel = sel === i ? null : i; paint(); }

  const legend = h('div', { class: 'legend' }, items.map((it, i) => {
    const row = h('button', { type: 'button', class: 'lg-row', onclick: () => (onLegend ? onLegend(it) : pick(i)) },
      h('span', { class: 'dot', style: { background: it.color } }),
      h('span', { class: 'lg-name' }, it.label),
      h('span', { class: 'lg-pct' }, pct(it.value / total)),
      h('span', { class: 'lg-val' }, format(it.value)),
      onLegend ? h('span', { class: 'lg-chev', 'aria-hidden': 'true' }, '›') : null);
    rows.push(row);
    return row;
  }));
  // Legendă scurtă: primele rânduri, restul la cerere.
  let more = null;
  if (items.length > legendLimit + 1) {
    let open = false;
    const hidden = rows.slice(legendLimit);
    hidden.forEach(r => { r.hidden = true; });
    more = h('button', { type: 'button', class: 'lg-more' });
    const label = () => { more.textContent = open ? tr('Arată mai puține') : tr('Arată toate ({n})', { n: items.length }); };
    more.addEventListener('click', () => { open = !open; hidden.forEach(r => { r.hidden = !open; }); label(); });
    label();
  }
  paint();
  const el = h('div', { class: 'donut' }, h('div', { class: 'donut-wrap', style: { width: size + 'px', height: size + 'px' } }, svg, center), legend);
  // Butonul „Arată toate” îl poate așeza apelantul în altă parte (ex. lângă un comutator).
  el.moreButton = more;
  if (more) el.append(more);
  return el;
}

export function lineChart({ labels, series, format, height = 180 }) {
  const hideAxis = isPrivate();
  const W = 340, H = height, pl = hideAxis ? 10 : 44, pr = 12, pt = 12, pb = 26;
  const all = series.flatMap(se => se.values).filter(v => v != null && isFinite(v));
  let min = all.length ? Math.min(...all) : 0, max = all.length ? Math.max(...all) : 1;
  if (min === max) { const d = Math.abs(min) * 0.1 || 1; min -= d; max += d; }
  const padV = (max - min) * 0.08;
  min -= padV; max += padV;
  const n = labels.length;
  const X = i => pl + (n === 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (n - 1));
  const Y = v => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'line-svg', role: 'img', 'aria-label': series.map(se => se.name).join(', ') });
  for (let k = 0; k <= 3; k++) {
    const v = min + ((max - min) * k) / 3, y = Y(v);
    svg.append(s('line', { x1: pl, x2: W - pr, y1: y, y2: y, class: 'grid' }));
    if (!hideAxis) svg.append(s('text', { x: pl - 6, y: y + 4, 'text-anchor': 'end', class: 'axis' }, compact(v)));
  }
  const idxs = n <= 4 ? labels.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
  for (const i of idxs) {
    const anchor = n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
    svg.append(s('text', { x: X(i), y: H - 6, 'text-anchor': anchor, class: 'axis' }, labels[i]));
  }
  for (const se of series) {
    const pts = se.values.map((v, i) => (v == null ? null : [X(i), Y(v)])).filter(Boolean);
    if (!pts.length) continue;
    svg.append(s('path', {
      d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '),
      fill: 'none', stroke: se.color, 'stroke-width': 2.2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      'stroke-dasharray': se.dashed ? '5 4' : null,
    }));
    if (n <= 13) for (const p of pts) svg.append(s('circle', { cx: p[0], cy: p[1], r: 2.6, fill: se.color }));
  }

  const guide = s('line', { y1: pt, y2: H - pb, class: 'guide', visibility: 'hidden' });
  const dots = series.map(se => s('circle', { r: 4.5, fill: se.color, stroke: 'var(--card)', 'stroke-width': 2, visibility: 'hidden' }));
  const hit = s('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' });
  svg.append(guide, ...dots, hit);
  const tip = h('div', { class: 'chart-tip', hidden: true });

  function show(e) {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let i = n === 1 ? 0 : Math.round(((x - pl) / (W - pl - pr)) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    const cx = X(i);
    guide.setAttribute('x1', cx); guide.setAttribute('x2', cx); guide.setAttribute('visibility', 'visible');
    series.forEach((se, j) => {
      const v = se.values[i];
      if (v == null) { dots[j].setAttribute('visibility', 'hidden'); return; }
      dots[j].setAttribute('cx', cx); dots[j].setAttribute('cy', Y(v)); dots[j].setAttribute('visibility', 'visible');
    });
    tip.replaceChildren(h('b', {}, labels[i]), ...series.map(se => h('span', {}, h('i', { style: { background: se.color } }), `${se.name}: ${format(se.values[i])}`)));
    tip.hidden = false;
    const left = (cx / W) * 100;
    tip.style.left = `${left}%`;
    tip.style.transform = `translateX(${left > 60 ? '-100%' : left < 40 ? '0' : '-50%'})`;
  }
  hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) show(e); });

  const legend = h('div', { class: 'line-legend' }, series.map(se =>
    h('span', {}, h('i', { class: se.dashed ? 'dashed' : '', style: { borderColor: se.color } }), se.name)));
  return h('div', { class: 'line-chart' }, h('div', { class: 'line-wrap' }, svg, tip), legend);
}

// Bare grupate (ex. venituri și cheltuieli pe luni). Tap pe o lună: valorile ei.
export function barChart({ labels, series, format }) {
  const hideAxis = isPrivate();
  const W = 340, H = 190, pl = hideAxis ? 6 : 40, pr = 6, pt = 10, pb = 24;
  const max = Math.max(1, ...series.flatMap(se => se.values));
  const n = labels.length, slot = (W - pl - pr) / n;
  const gap = Math.max(2, slot * 0.22), bw = (slot - gap) / series.length;
  const Y = v => pt + (1 - v / max) * (H - pt - pb);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'line-svg', role: 'img', 'aria-label': series.map(se => se.name).join(', ') });
  for (let k = 0; k <= 3; k++) {
    const v = (max * k) / 3, y = Y(v);
    svg.append(s('line', { x1: pl, x2: W - pr, y1: y, y2: y, class: 'grid' }));
    if (!hideAxis) svg.append(s('text', { x: pl - 6, y: y + 4, 'text-anchor': 'end', class: 'axis' }, compact(v)));
  }
  const groups = labels.map((lab, i) => {
    const x0 = pl + i * slot + gap / 2;
    const g = s('g', { class: 'bar-group' });
    series.forEach((se, j) => {
      const v = se.values[i] || 0, y = Y(v);
      g.append(s('rect', { x: x0 + j * bw, y, width: Math.max(1, bw - 1), height: Math.max(0, H - pb - y), rx: Math.min(3, bw / 3), fill: se.color }));
    });
    svg.append(s('text', { x: x0 + (slot - gap) / 2, y: H - 7, 'text-anchor': 'middle', class: 'axis' }, lab));
    svg.append(g);
    return g;
  });
  const hit = s('rect', { x: pl, y: 0, width: W - pl - pr, height: H, fill: 'transparent' });
  svg.append(hit);
  const tip = h('div', { class: 'chart-tip', hidden: true });

  function show(e) {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.floor((x - pl) / slot)));
    groups.forEach((g, j) => g.style.opacity = j === i ? 1 : 0.4);
    tip.replaceChildren(h('b', {}, labels[i]), ...series.map(se => h('span', {}, h('i', { style: { background: se.color } }), `${se.name}: ${format(se.values[i] || 0)}`)));
    tip.hidden = false;
    const left = ((pl + (i + 0.5) * slot) / W) * 100;
    tip.style.left = `${left}%`;
    tip.style.transform = `translateX(${left > 60 ? '-100%' : left < 40 ? '0' : '-50%'})`;
  }
  hit.addEventListener('pointerdown', show);
  hit.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) show(e); });

  const legend = h('div', { class: 'line-legend' }, series.map(se =>
    h('span', {}, h('i', { class: 'box', style: { background: se.color } }), se.name)));
  return h('div', { class: 'line-chart' }, h('div', { class: 'line-wrap' }, svg, tip), legend);
}

// Împărțire pe categorii ca bară colorată + rânduri cu bare (în locul cercului).
// legendOnly: doar bara și o legendă scurtă (fără rânduri).
export function barBreakdown({ items, format, onTap, limit = 5, legendOnly = false }) {
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  const stack = h('div', { class: 'stackbar' }, items.map(it => h('i', { style: { flex: String(it.value), background: it.color }, title: it.label })));
  if (legendOnly) {
    return h('div', {}, stack, h('div', { class: 'bk-legend' },
      items.map(it => h('span', {}, h('i', { style: { background: it.color } }), `${it.label} ${pct(it.value / total, 0)}`))));
  }
  const rows = items.map(it => h(onTap ? 'button' : 'div', { type: onTap ? 'button' : null, class: 'bk-row', onclick: onTap ? () => onTap(it) : null },
    h('span', { class: 'cat-ic', style: { width: '40px', height: '40px', background: (it.color || '#C9CED6') + '40', fontSize: '19px' } }, it.icon || '•'),
    h('div', { class: 'row-main' },
      h('div', { class: 'top-line' }, h('span', {}, it.label), h('span', {}, format(it.value))),
      h('div', { class: 'bar' }, h('i', { style: { width: `${(it.value / total) * 100}%`, background: it.color } })))));
  const el = h('div', {}, stack, ...rows);
  if (items.length > limit + 1) {
    let open = false;
    const hidden = rows.slice(limit);
    hidden.forEach(r => { r.hidden = true; });
    const more = h('button', { type: 'button', class: 'lg-more' });
    const label = () => { more.textContent = open ? tr('Arată mai puține') : tr('Arată toate ({n})', { n: items.length }); };
    more.addEventListener('click', () => { open = !open; hidden.forEach(r => { r.hidden = !open; }); label(); });
    label();
    el.append(more);
  }
  return el;
}
