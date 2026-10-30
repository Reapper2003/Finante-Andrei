// Bucăți de interfață folosite pe mai multe pagini.

import { state, catById, accountName, modOn } from './store.js';
import { currentMonth, addMonths, monthLabel, dayLabel, fmtDate } from './dates.js';
import { money, moneyRound, pct } from './fmt.js';
import { t as tr, catName } from './i18n.js';
import { bucketName, bucketCurrency, bucketIn, bucketOut, accountBalance, portfolioStats } from './calc.js';
import { h, icon, swipeRow, catIcon, toast, confirmDialog } from './ui.js';
import { deleteTx } from './actions.js';
import { openTxForm, openExportSheet, openBucketMove } from './forms.js';

// Sus pe Economii și pe Investiții: două file cu totalul fiecăreia; apar doar cu modulul Investiții pornit.
export function savingsTabs(active) {
  if (!modOn('investitii')) return null;
  const p = portfolioStats();
  const tab = (id, label, sub) => h('button', {
    type: 'button', role: 'tab', class: id === active ? 'on' : '', 'aria-selected': String(id === active),
    onclick: () => { if (id !== active) location.replace(`#/${id}`); },
  }, h('b', {}, label), h('small', {}, sub));
  return h('div', { class: 'seg sav-tabs', role: 'tablist', 'aria-label': tr('Economii și investiții') },
    tab('economii', tr('Economii'), moneyRound(accountBalance('economii'))),
    tab('investitii', tr('Investiții'), state.brokers.length ? `${moneyRound(p.value)} · ${pct(p.pct, 1, true)}` : '—'));
}

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
  // La transferurile spre / dintr-un compartiment în altă monedă, afișăm și suma în acea monedă.
  const base = state.settings.currency;
  const foreign = isTr && (t.toAmount != null && bucketCurrency(t.toBucket) !== base ? money(t.toAmount, { cur: bucketCurrency(t.toBucket) })
    : t.fromAmount != null && bucketCurrency(t.fromBucket) !== base ? money(t.fromAmount, { cur: bucketCurrency(t.fromBucket) }) : null);
  const orig = !isTr && t.origCurrency && t.origCurrency !== base;
  const amt = orig
    ? h('div', { class: 'row-right' },
      h('span', { class: 'amt' + (t.type === 'venit' ? ' pos' : '') }, money(t.type === 'venit' ? t.origAmount : -t.origAmount, { cur: t.origCurrency, sign: t.type === 'venit' })),
      h('span', { class: 'row-sub' }, money(t.type === 'venit' ? t.amount : -t.amount, { sign: t.type === 'venit' })))
    : t.type === 'venit'
    ? h('span', { class: 'amt pos' }, money(t.amount, { sign: true }))
    : t.type === 'cheltuiala' ? h('span', { class: 'amt' }, money(-t.amount))
      : foreign ? h('div', { class: 'row-right' }, h('span', { class: 'amt muted' }, money(t.amount)), h('span', { class: 'row-sub' }, foreign))
        : h('span', { class: 'amt muted' }, money(t.amount));
  const ic = t.type === 'transfer' ? h('span', { class: 'cat-ic neutral' }, icon('transfer', 20)) : catIcon(c);
  const content = h('div', { class: 'row' }, ic,
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), sub ? h('div', { class: 'row-sub' }, sub) : null), amt);
  return swipeRow(content, { onTap: () => openTxForm(t), onEdit: () => openTxForm(t), onDelete: () => confirmDeleteTx(t) });
}

// Transferurile din aceeași zi spre investiții sau spre economii se strâng într-un rând pliabil.
// Grupurile deschise rămân deschise cât stai pe pagină.
const openGroups = new Set();
const groupKind = t => t.type !== 'transfer' ? null
  : t.toAccountId === 'investitii' ? 'investitii'
  : t.toAccountId === 'economii' && t.accountId !== 'economii' ? 'economii' : null;
const destName = t => t.toAccountId === 'investitii'
  ? state.assets.find(a => a.id === t.assetId)?.name || accountName('investitii')
  : bucketName(t.toBucket);

function txGroupRow(key, kind, txs) {
  const box = h('div', { class: 'tx-grp' });
  const paint = () => {
    const open = openGroups.has(key);
    const names = [...new Set(txs.map(destName))].join(', ');
    box.classList.toggle('open', open);
    box.replaceChildren(
      h('button', {
        type: 'button', class: 'row tap tx-grp-head', 'aria-expanded': String(open),
        onclick: () => { if (open) openGroups.delete(key); else openGroups.add(key); paint(); },
      },
        h('span', { class: 'cat-ic neutral' }, icon(kind === 'investitii' ? 'trend' : 'transfer', 20)),
        h('div', { class: 'row-main' },
          h('div', { class: 'row-title' }, kind === 'investitii'
            ? tr('{n} contribuții la investiții', { n: txs.length }) : tr('{n} transferuri spre economii', { n: txs.length })),
          h('div', { class: 'row-sub' }, names)),
        h('span', { class: 'amt muted' }, money(txs.reduce((a, t) => a + t.amount, 0))),
        h('span', { class: 'tx-grp-chev' }, icon('chevR', 18))),
      open ? h('div', { class: 'tx-grp-items' }, txs.map(t => txRow(t))) : null);
  };
  paint();
  return box;
}

// Listă grupată pe zile, cele mai noi primele. Cu `group`, transferurile repetate din aceeași zi se strâng (vezi mai sus).
export function txGroups(list, { group = false } = {}) {
  const sorted = list.map((t, i) => [t, i]).sort((a, b) => b[0].date.localeCompare(a[0].date) || b[1] - a[1]).map(x => x[0]);
  const groups = new Map();
  for (const t of sorted) {
    if (!groups.has(t.date)) groups.set(t.date, []);
    groups.get(t.date).push(t);
  }
  return [...groups].map(([date, txs]) => {
    // Totalul zilei: venituri minus cheltuieli (transferurile nu intră).
    const net = txs.reduce((a, t) => a + (t.type === 'venit' ? t.amount : t.type === 'cheltuiala' ? -t.amount : 0), 0);
    // Un grup apare în locul primului lui transfer; un singur transfer rămâne rând normal.
    const byKind = {};
    if (group) for (const t of txs) { const k = groupKind(t); if (k) (byKind[k] ||= []).push(t); }
    const rows = [];
    for (const t of txs) {
      const k = groupKind(t), g = k && byKind[k];
      if (!g || g.length < 2) rows.push(txRow(t));
      else if (g[0] === t) rows.push(txGroupRow(`${date}|${k}`, k, g));
    }
    return h('div', { class: 'day' },
    h('div', { class: 'day-head' }, h('span', {}, dayLabel(date)), net ? h('span', {}, money(net, { sign: true })) : null),
    h('div', { class: 'list' }, rows));
  });
}

// Mișcările unui compartiment de economii (fond de urgență, fond, alte economii), cu sume în moneda lui.
export function movesList(bucket) {
  const cur = bucketCurrency(bucket);
  const touches = t => t.type === 'transfer'
    ? (t.toAccountId === 'economii' && (t.toBucket || '') === bucket) || (t.accountId === 'economii' && (t.fromBucket || '') === bucket)
    : bucket === '' && t.accountId === 'economii';
  const moves = state.transactions.filter(touches).sort((a, b) => b.date.localeCompare(a.date));
  if (!moves.length) return h('p', { class: 'muted' }, tr('Nicio mișcare încă. Adaugă bani din contul Curent.'));
  return h('div', { class: 'list' }, moves.map(t => {
    let isIn, amount, other, simple;
    if (t.type === 'transfer') {
      isIn = t.toAccountId === 'economii' && (t.toBucket || '') === bucket;
      amount = isIn ? bucketIn(t) : bucketOut(t);
      other = isIn ? (t.accountId === 'economii' ? bucketName(t.fromBucket) : accountName(t.accountId))
        : (t.toAccountId === 'economii' ? bucketName(t.toBucket) : accountName(t.toAccountId));
      // Transferurile simple (din / spre Curent sau „Alte economii”) se editează cu formularul compartimentului.
      const otherAcc = isIn ? t.accountId : t.toAccountId, otherBucket = isIn ? t.fromBucket : t.toBucket;
      simple = otherAcc === 'curent' || (otherAcc === 'economii' && !otherBucket);
    } else {
      isIn = t.type === 'venit';
      amount = t.amount;
      other = catName(catById(t.categoryId));
      simple = false;
    }
    const content = h('div', { class: 'row' },
      h('span', { class: 'cat-ic neutral' }, icon(isIn ? 'download' : 'upload', 20)),
      h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, isIn ? tr('Depunere') : tr('Retragere')),
        h('div', { class: 'row-sub' }, `${fmtDate(t.date)} · ${isIn ? tr('din {name}', { name: other }) : tr('către {name}', { name: other })}`)),
      h('span', { class: 'amt ' + (isIn ? 'pos' : '') }, money(isIn ? amount : -amount, { cur, sign: true })));
    const edit = () => (simple ? openBucketMove({ bucket, dir: isIn ? 'in' : 'out', existing: t }) : openTxForm(t));
    return swipeRow(content, { onTap: edit, onEdit: edit, onDelete: () => confirmDeleteTx(t) });
  }));
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
