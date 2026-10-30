// Luna afișată (comună pentru Acasă și Tranzacții) și meniul din butonul ⋯ din header.

import { currentMonth, monthLabel, monthAbbr, today, daysBetween } from './dates.js';
import { h, icon, openSheet, go, app, btn } from './ui.js';
import { t as tr } from './i18n.js';
import { state, modOn, slotTab } from './store.js';
import { money, moneyRound, plural } from './fmt.js';
import { subTotals, debtTotals, budgetStats } from './calc.js';

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

// Alegerea lunii, deschisă din data de sus de pe Acasă și din Tranzacții.
export function openMonthSheet() {
  const sh = openSheet({
    title: tr('Alege luna'),
    body: h('div', {}, monthPicker(() => sh.close()),
      isCurrentMonth() ? null : btn(tr('Luna curentă'), () => { sh.close(); setMonth(currentMonth()); }, 'secondary')),
  });
}

// Data ultimului backup; `old` = niciodată sau mai vechi de 30 de zile (se arată în culoarea de avertizare).
export function backupInfo() {
  const last = state.settings.lastBackupAt;
  const ago = last ? daysBetween(last, today()) : null;
  const text = ago == null ? tr('backup: niciodată') : ago <= 0 ? tr('backup: azi') : ago === 1 ? tr('backup: ieri') : tr('backup: acum {n} zile', { n: ago });
  return { text, old: ago == null || ago > 30 };
}

export function openMainMenu() {
  const inBar = id => slotTab()[0] === id;
  // `right`: o informație scurtă, gri, înaintea săgeții (ex. totalul lunar la Abonamente).
  const item = (ico, label, hash, right = null, tone = '') => h('button', { type: 'button', class: 'menu-item', onclick: () => go(hash) },
    h('span', { class: 'cat-ic neutral' }, icon(ico, 20)), h('span', {}, label),
    right ? h('small', { class: `mi-right ${tone}`.trim() }, right) : null, icon('chevR', 18));
  const subs = state.subscriptions.length ? tr('{sum}/lună', { sum: money(subTotals().monthly) }) : null;
  const debt = debtTotals().remaining;
  const buds = modOn('bugete') ? budgetStats(currentMonth()) : [];
  const over = buds.filter(b => b.left < 0).length;
  const { text: backup, old: backupOld } = backupInfo();
  // Secțiune cu titlu; dispare dacă toate rândurile ei sunt ascunse.
  const group = (title, rows) => {
    const vis = rows.filter(Boolean);
    return vis.length ? [h('div', { class: 'menu-sec' }, title), h('div', { class: 'list' }, vis)] : [];
  };
  openSheet({
    title: tr('Meniu'),
    body: h('div', {},
      ...group(tr('Analiză'), [
        !inBar('rapoarte') && item('report', tr('Rapoarte'), '#/rapoarte'),
      ]),
      ...group(tr('Planificare'), [
        modOn('abonamente') && item('repeat', tr('Abonamente'), '#/abonamente', subs),
        modOn('datorii') && item('card', tr('Datorii'), '#/datorii', debt > 0 ? tr('{sum} rămase', { sum: moneyRound(debt) }) : null),
        modOn('bugete') && item('budget', tr('Bugete'), '#/bugete', over ? plural(over, tr('buget depășit'), tr('bugete depășite')) : buds.length ? tr('toate în limită') : null, over ? 'neg' : ''),
        modOn('dorinte') && item('gift', tr('Listă de dorințe'), '#/dorinte')]),
      ...group(tr('Unelte'), [
        !inBar('plan') && item('calc', tr('Îmi permit?'), '#/plan'),
        item('trend', tr('Calculator investiții'), '#/calculator'),
        item('tag', tr('Categorii'), '#/categorii')]),
      h('div', { class: 'list menu-settings' }, item('settings', tr('Setări'), '#/setari', backup, backupOld ? 'warn' : ''))),
  });
}

