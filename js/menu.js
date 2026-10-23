// Luna afișată (comună pentru Acasă și Tranzacții) și meniul din butonul ⋯ din header.

import { currentMonth, monthLabel, monthAbbr } from './dates.js';
import { h, icon, openSheet, go, app, btn } from './ui.js';
import { t as tr } from './i18n.js';
import { modOn, slotTab } from './store.js';

// Implicit e luna curentă; o lună aleasă din meniu rămâne până o schimbi sau redeschizi aplicația.
let viewMonth = null;
export const getMonth = () => {
  const cm = currentMonth();
  if (!viewMonth || viewMonth > cm) viewMonth = cm;
  return viewMonth;
};
export function setMonth(m) {
  viewMonth = m;
  app.rerender();
}
export const isCurrentMonth = () => getMonth() === currentMonth();

// Indicator afișat doar când te uiți la altă lună decât cea curentă.
export function monthChip() {
  if (isCurrentMonth()) return null;
  return h('button', { type: 'button', class: 'month-chip', onclick: () => setMonth(currentMonth()), 'aria-label': tr('Înapoi la luna curentă') },
    icon('calendar', 16), monthLabel(getMonth()), icon('x', 14));
}

function monthPicker(close) {
  const cm = currentMonth();
  let year = Number(getMonth().slice(0, 4));
  const box = h('div', { class: 'mp' });
  const paint = () => {
    const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    box.replaceChildren(
      h('div', { class: 'mp-year' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': tr('Anul anterior'), onclick: () => { year--; paint(); } }, icon('chevL')),
        h('b', {}, String(year)),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': tr('Anul următor'), disabled: year >= Number(cm.slice(0, 4)), onclick: () => { year++; paint(); } }, icon('chevR'))),
      h('div', { class: 'mp-grid' }, months.map(m => h('button', {
        type: 'button', class: `mp-m${m === getMonth() ? ' on' : ''}${m === cm ? ' now' : ''}`, disabled: m > cm,
        onclick: () => { close(); setMonth(m); },
      }, monthAbbr(m)))));
  };
  paint();
  return box;
}

export function openMainMenu() {
  const inBar = id => slotTab()[0] === id;
  const item = (ico, label, hash) => h('button', { type: 'button', class: 'menu-item', onclick: () => go(hash) },
    h('span', { class: 'cat-ic neutral' }, icon(ico, 20)), h('span', {}, label), icon('chevR', 18));
  // Secțiune cu titlu; dispare dacă toate rândurile ei sunt ascunse.
  const group = (title, rows) => {
    const vis = rows.filter(Boolean);
    return vis.length ? [h('div', { class: 'menu-sec' }, title), h('div', { class: 'list' }, vis)] : [];
  };
  const sh = openSheet({
    title: tr('Meniu'),
    body: h('div', {},
      h('div', { class: 'menu-sec' }, tr('Luna afișată')),
      monthPicker(() => sh.close()),
      isCurrentMonth() ? null : btn(tr('Luna curentă'), () => { sh.close(); setMonth(currentMonth()); }, 'secondary'),
      ...group(tr('Analiză'), [
        modOn('investitii') && !inBar('investitii') && item('trend', tr('Investiții'), '#/investitii'),
        !inBar('rapoarte') && item('report', tr('Rapoarte'), '#/rapoarte'),
        modOn('avere') && item('scale', tr('Avere netă'), '#/avere')]),
      ...group(tr('Planificare'), [
        modOn('abonamente') && item('repeat', tr('Abonamente'), '#/abonamente'),
        modOn('datorii') && item('card', tr('Datorii'), '#/datorii'),
        modOn('dorinte') && item('gift', tr('Listă de dorințe'), '#/dorinte')]),
      ...group(tr('Unelte'), [
        !inBar('plan') && item('calc', tr('Calculator bani'), '#/plan'),
        item('trend', tr('Calculator investiții'), '#/calculator'),
        item('tag', tr('Categorii'), '#/categorii')]),
      h('div', { class: 'list menu-settings' }, item('settings', tr('Setări'), '#/setari'))),
  });
}

