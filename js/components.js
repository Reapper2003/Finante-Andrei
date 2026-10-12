// Bucăți de interfață folosite pe mai multe pagini.

import { state, catById, accountName } from './store.js';
import { currentMonth, addMonths, monthLabel, dayLabel, fmtDate } from './dates.js';
import { money } from './fmt.js';
import { t as tr, catName } from './i18n.js';
import { bucketName } from './calc.js';
import { h, icon, swipeRow, catIcon, toast, confirmDialog } from './ui.js';
import { deleteTx } from './actions.js';
import { openTxForm, openExportSheet } from './forms.js';

export function monthSwitcher(m, onChange) {
  return h('div', { class: 'month-sw' },
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': tr('Luna anterioară'), onclick: () => onChange(addMonths(m, -1)) }, icon('chevL')),
    h('span', { class: 'month-label' }, monthLabel(m)),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': tr('Luna următoare'), disabled: m >= currentMonth(), onclick: () => onChange(addMonths(m, 1)) }, icon('chevR')));
}

export function transferLabel(t) {
  const from = t.accountId === 'economii' ? bucketName(t.fromBucket) : accountName(t.accountId);
  let to = t.toAccountId === 'economii' ? bucketName(t.toBucket) : accountName(t.toAccountId);
  if (t.assetId) to += ` · ${state.assets.find(a => a.id === t.assetId)?.name || ''}`;
  return `${from} → ${to}`;
}

export function confirmDeleteTx(t, after) {
  const extra = t.debtId ? ' ' + tr('Plata datoriei legată de ea va fi ștearsă și ea.') : t.assetId ? ' ' + tr('Contribuția la investiții legată de ea va fi ștearsă și ea.') : '';
  return confirmDialog({ title: tr('Ștergi tranzacția?'), message: `${money(t.amount)} · ${fmtDate(t.date)}.${extra}` }).then(ok => {
    if (!ok) return false;
    deleteTx(t.id);
    toast(tr('Tranzacție ștearsă'));
    after?.();
    return true;
  });
}

export function txRow(t, { showDate = false } = {}) {
  const c = t.type === 'transfer' ? null : catById(t.categoryId);
  const isTr = t.type === 'transfer';
  const title = isTr ? t.note || tr('Transfer') : catName(c);
  const sub = [
    isTr ? null : t.note,
    isTr ? transferLabel(t) : t.accountId === 'economii' ? tr('din Economii') : null,
    showDate ? fmtDate(t.date) : null,
  ].filter(Boolean).join(' · ');
  const amt = t.type === 'venit'
    ? h('span', { class: 'amt pos' }, money(t.amount, { sign: true }))
    : t.type === 'cheltuiala' ? h('span', { class: 'amt' }, money(-t.amount)) : h('span', { class: 'amt muted' }, money(t.amount));
  const ic = t.type === 'transfer' ? h('span', { class: 'cat-ic neutral' }, icon('transfer', 20)) : catIcon(c);
  const content = h('div', { class: 'row' }, ic,
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), sub ? h('div', { class: 'row-sub' }, sub) : null), amt);
  return swipeRow(content, { onTap: () => openTxForm(t), onEdit: () => openTxForm(t), onDelete: () => confirmDeleteTx(t) });
}

// Listă grupată pe zile, cele mai noi primele.
export function txGroups(list) {
  const sorted = list.map((t, i) => [t, i]).sort((a, b) => b[0].date.localeCompare(a[0].date) || b[1] - a[1]).map(x => x[0]);
  const groups = new Map();
  for (const t of sorted) {
    if (!groups.has(t.date)) groups.set(t.date, []);
    groups.get(t.date).push(t);
  }
  return [...groups].map(([date, txs]) => h('div', { class: 'day' },
    h('div', { class: 'day-head' }, dayLabel(date)),
    h('div', { class: 'list' }, txs.map(t => txRow(t)))));
}

export function exportButton() {
  return h('button', { type: 'button', class: 'btn ghost export-btn', onclick: () => openExportSheet() }, icon('download', 18), tr('Exportă în Excel'));
}

export function listRow({ iconEl, title, sub, right, rightSub, onTap, chevron = false, cls = '' }) {
  return h(onTap ? 'button' : 'div', { type: onTap ? 'button' : null, class: `row ${onTap ? 'tap' : ''} ${cls}`, onclick: onTap || null },
    iconEl || null,
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), sub ? h('div', { class: 'row-sub' }, sub) : null),
    right != null || rightSub ? h('div', { class: 'row-right' }, right != null ? h('span', { class: 'amt' }, right) : null, rightSub || null) : null,
    chevron ? h('span', { class: 'chev', 'aria-hidden': 'true' }, icon('chevR', 18)) : null);
}
