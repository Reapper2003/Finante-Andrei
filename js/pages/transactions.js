import { state, catById, ACCOUNTS, accountName } from '../store.js';
import { currentMonth, today, dayLabel, monthLabel, weekdayInitials } from '../dates.js';
import { money, num, parseAmount, forInput, CURRENCIES } from '../fmt.js';
import { monthTotals, txCurrency, txAmountIn } from '../calc.js';
import { h, icon, app, openSheet, segmented, selectInput, field, btn, emptyState, stat, signCls, card } from '../ui.js';
import { txGroups, txRow, exportButton } from '../components.js';
import { getMonth, monthChip } from '../menu.js';
import { openTxForm } from '../forms.js';
import { t as tr, catName } from '../i18n.js';

// cur = doar tranzacțiile în această monedă; min / max = interval de sumă, în moneda rangeCur.
const f = { type: '', cat: '', acc: '', q: '', cur: '', min: null, max: null, rangeCur: '' };
const curLabel = c => (c === 'RON' ? 'lei' : CURRENCIES[c]);
const rangeCur = () => f.rangeCur || f.cur || state.settings.currency;

// Filtrele comune listei și calendarului: categorie, cont, monedă, interval de sumă.
function extraMatch(t) {
  if (f.cat && t.categoryId !== f.cat) return false;
  if (f.acc && t.accountId !== f.acc && t.toAccountId !== f.acc) return false;
  if (f.cur && txCurrency(t) !== f.cur) return false;
  if (f.min != null || f.max != null) {
    const v = txAmountIn(t, rangeCur());
    if (f.min != null && v < f.min) return false;
    if (f.max != null && v > f.max) return false;
  }
  return true;
}
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function matches(t) {
  if (f.type && t.type !== f.type) return false;
  if (!extraMatch(t)) return false;
  const q = f.q.trim();
  if (q) {
    // Căutarea se face în toate lunile.
    const nq = norm(q), amountQ = q.replace(/\s/g, '').replace(',', '.');
    const hit = norm(t.note).includes(nq) || norm(catById(t.categoryId)?.name).includes(nq) || norm(catName(catById(t.categoryId))).includes(nq)
      || num(t.amount).includes(q) || String(t.amount).includes(amountQ)
      || (t.origAmount != null && (num(t.origAmount).includes(q) || String(t.origAmount).includes(amountQ)));
    return hit;
  }
  return t.date.startsWith(getMonth());
}

/* ---------- Calendar pe zile ---------- */
// Calendarul urmează filtrele: tipul ales (la „Toate” arată cheltuielile), categoria și contul.

const CAL_TYPE = { '': 'cheltuiala', cheltuiala: 'cheltuiala', venit: 'venit', transfer: 'transfer' };
const CAL_LABEL = { cheltuiala: 'Cheltuieli', venit: 'Venituri', transfer: 'Transferuri' };

function calendarMatches(t) {
  return t.type === CAL_TYPE[f.type] && extraMatch(t);
}

function openDay(date) {
  const all = state.transactions.map((t, i) => [t, i]).filter(([t]) => t.date === date).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  // În panoul zilei vezi tranzacțiile filtrate (la „Toate”, pe toate).
  const txs = f.type || f.cat || f.acc || f.cur || f.min != null || f.max != null ? all.filter(calendarMatches) : all;
  const type = CAL_TYPE[f.type];
  const total = all.filter(calendarMatches).reduce((a, t) => a + t.amount, 0);
  const sh = openSheet({
    title: dayLabel(date),
    body: h('div', {},
      h('p', { class: 'muted' }, `${tr(CAL_LABEL[type])}: ${money(total)}`),
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
    if (t.date.startsWith(m) && calendarMatches(t)) totals.set(t.date, (totals.get(t.date) || 0) + t.amount);
  }
  const type = CAL_TYPE[f.type];
  const max = Math.max(0, ...totals.values());
  const t0 = today();
  const cells = Array.from({ length: offset }, () => h('span', {}));
  for (let d = 1; d <= days; d++) {
    const date = `${m}-${String(d).padStart(2, '0')}`;
    const v = totals.get(date) || 0;
    const lvl = v > 0 && max > 0 ? Math.max(1, Math.ceil((v / max) * 4)) : 0;
    cells.push(h('button', {
      type: 'button', class: `cal-day l${lvl}${date === t0 ? ' today' : ''}`, disabled: date > t0,
      'aria-label': `${d} ${monthLabel(m).toLowerCase()}: ${v ? money(v) : '—'}`,
      onclick: () => openDay(date),
    }, d));
  }
  const legend = h('span', { class: 'cal-legend' }, tr('puțin'), [1, 2, 3, 4].map(l => h('i', { class: `l${l}` })), tr('mult'));
  return card(
    h('div', { class: 'card-head' }, h('div', {}, h('h2', {}, tr('Calendar')), h('small', { class: 'muted' }, tr('{type} pe zile', { type: tr(CAL_LABEL[type]) }))), legend),
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
  const curs = Object.keys(CURRENCIES);
  const curSeg = segmented([{ value: '', label: tr('Toate') }, ...curs.map(c => ({ value: c, label: curLabel(c) }))], draft.cur, v => {
    draft.cur = v;
    // Intervalul urmează moneda aleasă, dacă nu a fost schimbat de mână.
    if (v && !rangeTouched) { draft.rangeCur = v; rangeSeg.replaceWith(rangeSeg = makeRangeSeg()); }
  });
  let rangeTouched = !!f.rangeCur;
  const makeRangeSeg = () => segmented(curs.map(c => ({ value: c, label: curLabel(c) })), draft.rangeCur || draft.cur || state.settings.currency,
    v => { draft.rangeCur = v; rangeTouched = true; });
  let rangeSeg = makeRangeSeg();
  const min = h('input', { type: 'text', inputmode: 'decimal', placeholder: tr('De la'), value: forInput(f.min ?? ''), autocomplete: 'off' });
  const max = h('input', { type: 'text', inputmode: 'decimal', placeholder: tr('Până la'), value: forInput(f.max ?? ''), autocomplete: 'off' });
  const rangeBox = h('div', {}, h('div', { class: 'two' }, min, max), h('div', { style: { marginTop: '8px' } }, rangeSeg));
  const sh = openSheet({
    title: tr('Filtrează'),
    body: h('div', {},
      field(tr('Tip'), type), catField, field(tr('Cont'), acc),
      field(tr('Monedă'), curSeg, tr('În euro sau dolari: cheltuielile și veniturile introduse în acea monedă, transferurile spre fonduri și goal-uri în acea monedă și contribuțiile la brokerii în acea monedă.')),
      field(tr('Sumă între'), rangeBox, tr('Lasă gol ca să nu limitezi. Sumele în altă monedă se compară convertite cu cursul din Setări.'))),
    footer: h('div', { class: 'btn-row' },
      btn(tr('Resetează'), () => { Object.assign(f, { type: '', cat: '', acc: '', cur: '', min: null, max: null, rangeCur: '' }); sh.close(); app.rerender(); }, 'ghost'),
      btn(tr('Aplică'), () => {
        const lo = min.value.trim() ? parseAmount(min.value) : null, hi = max.value.trim() ? parseAmount(max.value) : null;
        if (lo != null && !(lo >= 0)) return min.focus();
        if (hi != null && !(hi >= 0)) return max.focus();
        Object.assign(f, {
          type: draft.type, cat: draft.cat, acc: draft.acc, cur: draft.cur,
          min: lo != null && hi != null && lo > hi ? hi : lo, max: lo != null && hi != null && lo > hi ? lo : hi,
          rangeCur: rangeTouched ? draft.rangeCur : '',
        });
        sh.close();
        app.rerender();
      })),
  });
}

function chips() {
  const list = [];
  const clear = k => () => { f[k] = ''; app.rerender(); };
  if (f.cat) list.push([catName(catById(f.cat)), clear('cat')]);
  if (f.acc) list.push([accountName(f.acc), clear('acc')]);
  if (f.cur) list.push([tr('Doar în {cur}', { cur: curLabel(f.cur) }), clear('cur')]);
  if (f.min != null || f.max != null) {
    const c = rangeCur();
    const label = f.min != null && f.max != null ? `${money(f.min, { cur: c, show: true })} – ${money(f.max, { cur: c, show: true })}`
      : f.min != null ? tr('peste {sum}', { sum: money(f.min, { cur: c, show: true }) }) : tr('sub {sum}', { sum: money(f.max, { cur: c, show: true }) });
    list.push([label, () => { f.min = null; f.max = null; f.rangeCur = ''; app.rerender(); }]);
  }
  if (!list.length) return null;
  return h('div', { class: 'chips' }, list.map(([label, fn]) =>
    h('button', { type: 'button', class: 'chip', onclick: fn, 'aria-label': tr('Elimină filtrul {name}', { name: label }) }, label, icon('x', 14))));
}

export function transactionsPage() {
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
  const activeFilters = [f.cat, f.acc, f.cur, f.min != null || f.max != null].filter(Boolean).length; // tipul se vede deja în pastile
  const tot = monthTotals(getMonth());
  paintList();

  const node = h('div', { class: 'page' },
    monthChip(),
    h('div', { class: 'search-row' },
      h('label', { class: 'search' }, icon('search', 18), search),
      h('button', { type: 'button', class: 'icon-btn filter-btn' + (activeFilters ? ' active' : ''), 'aria-label': tr('Filtre'), onclick: openFilters },
        icon('filter'), activeFilters ? h('span', { class: 'badge' }, activeFilters) : null)),
    // Tipul se alege direct din „pastile”; categoria și contul rămân în panoul de filtre.
    h('div', { class: 'chips-scroll' },
      [['', 'Toate'], ['cheltuiala', 'Cheltuieli'], ['venit', 'Venituri'], ['transfer', 'Transferuri']].map(([v, label]) =>
        h('button', { type: 'button', class: 'pchip' + (f.type === v ? ' on' : ''), onclick: () => { f.type = v; if (v === 'transfer') f.cat = ''; app.rerender(); } }, tr(label)))),
    chips(),
    h('div', { class: 'sum3' },
      h('div', {}, h('small', {}, tr('Venituri')), h('b', { class: tot.income > 0 ? 'pos' : '' }, money(tot.income, { sign: true }))),
      h('div', {}, h('small', {}, tr('Cheltuieli')), h('b', {}, money(-tot.expense))),
      h('div', {}, h('small', {}, tr('Rămas')), h('b', { class: signCls(tot.left) }, money(tot.left)))),
    calendar(getMonth()),
    listBox,
    exportButton());
  return { title: tr('Tranzacții'), subtitle: monthLabel(getMonth()), node };
}
