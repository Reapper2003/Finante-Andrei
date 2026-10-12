import { state, catById, ACCOUNTS, accountName } from '../store.js';
import { currentMonth, today, dayLabel, monthLabel, weekdayInitials } from '../dates.js';
import { money, num } from '../fmt.js';
import { monthTotals } from '../calc.js';
import { h, icon, app, openSheet, segmented, selectInput, field, btn, emptyState, stat, signCls, card } from '../ui.js';
import { monthSwitcher, txGroups, txRow, exportButton } from '../components.js';
import { openTxForm } from '../forms.js';
import { t as tr, catName } from '../i18n.js';

const f = { month: currentMonth(), type: '', cat: '', acc: '', q: '' };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function matches(t) {
  if (f.type && t.type !== f.type) return false;
  if (f.cat && t.categoryId !== f.cat) return false;
  if (f.acc && t.accountId !== f.acc && t.toAccountId !== f.acc) return false;
  const q = f.q.trim();
  if (q) {
    // Căutarea se face în toate lunile.
    const nq = norm(q), amountQ = q.replace(/\s/g, '').replace(',', '.');
    const hit = norm(t.note).includes(nq) || norm(catById(t.categoryId)?.name).includes(nq) || norm(catName(catById(t.categoryId))).includes(nq)
      || num(t.amount).includes(q) || String(t.amount).includes(amountQ);
    return hit;
  }
  return t.date.startsWith(f.month);
}

/* ---------- Calendar cu cheltuieli pe zile ---------- */

function openDay(date) {
  const txs = state.transactions.map((t, i) => [t, i]).filter(([t]) => t.date === date).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const spent = txs.filter(t => t.type === 'cheltuiala').reduce((a, t) => a + t.amount, 0);
  const sh = openSheet({
    title: dayLabel(date),
    body: h('div', {},
      h('p', { class: 'muted' }, tr('Cheltuieli: {sum}', { sum: money(spent) })),
      txs.length ? h('div', { class: 'list' }, txs.map(t => txRow(t))) : h('p', { class: 'muted' }, tr('Nicio tranzacție în această zi.'))),
    footer: btn(tr('Adaugă tranzacție în această zi'), () => { sh.close(); setTimeout(() => openTxForm(null, { date }), 0); }),
  });
}

function calendar(m) {
  const [y, mo] = m.split('-').map(Number);
  const days = new Date(y, mo, 0).getDate();
  const offset = (new Date(y, mo - 1, 1).getDay() + 6) % 7; // luni = prima zi
  const totals = new Map();
  for (const t of state.transactions) {
    if (t.type === 'cheltuiala' && t.date.startsWith(m)) totals.set(t.date, (totals.get(t.date) || 0) + t.amount);
  }
  const max = Math.max(0, ...totals.values());
  const t0 = today();
  const cells = Array.from({ length: offset }, () => h('span', {}));
  for (let d = 1; d <= days; d++) {
    const date = `${m}-${String(d).padStart(2, '0')}`;
    const v = totals.get(date) || 0;
    const lvl = v > 0 && max > 0 ? Math.max(1, Math.ceil((v / max) * 4)) : 0;
    cells.push(h('button', {
      type: 'button', class: `cal-day l${lvl}${date === t0 ? ' today' : ''}`, disabled: date > t0,
      'aria-label': `${d} ${monthLabel(m).toLowerCase()}: ${v ? money(v) : tr('fără cheltuieli')}`,
      onclick: () => openDay(date),
    }, d));
  }
  const legend = h('span', { class: 'cal-legend' }, tr('puțin'), [1, 2, 3, 4].map(l => h('i', { class: `l${l}` })), tr('mult'));
  return card(
    h('div', { class: 'card-head' }, h('h2', {}, tr('Cheltuieli pe zile')), legend),
    h('div', { class: 'cal-grid cal-week' }, weekdayInitials().map(x => h('span', {}, x))),
    h('div', { class: 'cal-grid' }, cells));
}

function openFilters() {
  const draft = { ...f };
  const catSel = () => selectInput([{ value: '', label: tr('Toate categoriile') },
    ...state.categories.filter(c => !draft.type || draft.type === 'transfer' || c.type === draft.type).map(c => ({ value: c.id, label: `${c.icon} ${catName(c)}` }))], draft.cat);
  let cat = catSel();
  const catField = field(tr('Categorie'), cat);
  const wire = () => cat.addEventListener('change', () => { draft.cat = cat.value; });
  wire();
  const acc = selectInput([{ value: '', label: tr('Toate conturile') }, ...ACCOUNTS.map(a => ({ value: a.id, label: accountName(a.id) }))], draft.acc);
  acc.addEventListener('change', () => { draft.acc = acc.value; });
  const type = segmented([{ value: '', label: tr('Toate') }, { value: 'venit', label: tr('Venit') }, { value: 'cheltuiala', label: tr('Cheltuială') }, { value: 'transfer', label: tr('Transfer') }], draft.type, v => {
    draft.type = v;
    if (v === 'transfer') draft.cat = '';
    else if (draft.cat && catById(draft.cat)?.type !== v && v) draft.cat = '';
    const next = catSel();
    cat.replaceWith(next);
    cat = next;
    wire();
  });
  const sh = openSheet({
    title: tr('Filtrează'),
    body: h('div', {}, field(tr('Tip'), type), catField, field(tr('Cont'), acc)),
    footer: h('div', { class: 'btn-row' },
      btn(tr('Resetează'), () => { Object.assign(f, { type: '', cat: '', acc: '' }); sh.close(); app.rerender(); }, 'ghost'),
      btn(tr('Aplică'), () => { Object.assign(f, { type: draft.type, cat: draft.cat, acc: draft.acc }); sh.close(); app.rerender(); })),
  });
}

function chips() {
  const list = [];
  const clear = k => () => { f[k] = ''; app.rerender(); };
  if (f.type) list.push([tr({ venit: 'Venituri', cheltuiala: 'Cheltuieli', transfer: 'Transferuri' }[f.type]), clear('type')]);
  if (f.cat) list.push([catName(catById(f.cat)), clear('cat')]);
  if (f.acc) list.push([accountName(f.acc), clear('acc')]);
  if (!list.length) return null;
  return h('div', { class: 'chips' }, list.map(([label, fn]) =>
    h('button', { type: 'button', class: 'chip', onclick: fn, 'aria-label': tr('Elimină filtrul {name}', { name: label }) }, label, icon('x', 14))));
}

export function transactionsPage() {
  if (f.month > currentMonth()) f.month = currentMonth();
  const listBox = h('div', { class: 'stack' });
  const paintList = () => {
    const list = state.transactions.filter(matches);
    listBox.replaceChildren(...(list.length ? txGroups(list) : [emptyState(
      f.q.trim() ? tr('Nicio tranzacție nu se potrivește căutării.') : tr('Nicio tranzacție în această lună.'),
      f.q.trim() ? null : tr('Adaugă o tranzacție'), () => openTxForm())]));
  };
  const search = h('input', {
    type: 'search', class: 'search-input', placeholder: tr('Caută după notă sau sumă'), value: f.q, enterkeyhint: 'search', 'aria-label': tr('Caută'),
    oninput: e => { f.q = e.target.value; paintList(); },
  });
  const activeFilters = [f.type, f.cat, f.acc].filter(Boolean).length;
  const tot = monthTotals(f.month);
  paintList();

  const node = h('div', { class: 'page' },
    monthSwitcher(f.month, v => { f.month = v; app.rerender(); }),
    h('div', { class: 'search-row' },
      h('label', { class: 'search' }, icon('search', 18), search),
      h('button', { type: 'button', class: 'icon-btn filter-btn' + (activeFilters ? ' active' : ''), 'aria-label': tr('Filtre'), onclick: openFilters },
        icon('filter'), activeFilters ? h('span', { class: 'badge' }, activeFilters) : null)),
    chips(),
    h('section', { class: 'card stats3' },
      stat(tr('Venituri'), money(tot.income)), stat(tr('Cheltuieli'), money(tot.expense)), stat(tr('Rămas'), money(tot.left), signCls(tot.left))),
    calendar(f.month),
    listBox,
    exportButton());
  return { title: tr('Tranzacții'), node };
}
