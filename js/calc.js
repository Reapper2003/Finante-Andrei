// Toate calculele: solduri, economii, investiții, datorii, avere netă, rapoarte.
// Parametrul `upTo` („AAAA-LL-ZZ”) calculează valoarea la o anumită dată; null = acum.

import { state, catById, catByName, PALETTE } from './store.js';
import { t as tr, catName } from './i18n.js';
import { today, currentMonth, addMonths, monthEnd, monthsRange, daysBetween, addDays, addMonthsDate, nextPayday } from './dates.js';

export const round2 = n => Math.round((Number(n) || 0) * 100) / 100;
const sum = (arr, f = x => x) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const inRange = (d, upTo) => !upTo || (!!d && d <= upTo);

export const ASSET_TYPES = [
  { value: 'etf', label: 'ETF' }, { value: 'actiune', label: 'Acțiune' }, { value: 'crypto', label: 'Crypto' },
  { value: 'obligatiuni', label: 'Obligațiuni' }, { value: 'titluri', label: 'Titluri de stat' }, { value: 'altele', label: 'Altele' },
];
export const assetTypeLabel = v => tr(ASSET_TYPES.find(x => x.value === v)?.label || 'Altele');
export const assetTypeOptions = () => ASSET_TYPES.map(x => ({ value: x.value, label: tr(x.label) }));

export const DEBT_TYPES = [
  { value: 'credit', label: 'Credit bancar' }, { value: 'card', label: 'Card de credit' }, { value: 'leasing', label: 'Leasing' },
  { value: 'persoana', label: 'Împrumut de la o persoană' }, { value: 'altele', label: 'Altele' },
];
export const debtTypeLabel = v => tr(DEBT_TYPES.find(x => x.value === v)?.label || 'Altele');
export const debtTypeOptions = () => DEBT_TYPES.map(x => ({ value: x.value, label: tr(x.label) }));

export const FREQ = { lunar: 1, trimestrial: 3, anual: 12 };
const FREQ_RO = { lunar: 'Lunar', trimestrial: 'Trimestrial', anual: 'Anual' };
export const freqLabel = f => tr(FREQ_RO[f] || f);
export const freqOptions = () => Object.keys(FREQ_RO).map(value => ({ value, label: freqLabel(value) }));

// Cursurile din setări sunt în lei pentru 1 EUR / 1 USD.
export function convert(amount, from, to) {
  if (!from || !to || from === to) return amount;
  const r = state.settings.rates;
  const ron = from === 'RON' ? amount : amount * (r[from] || 1);
  return to === 'RON' ? ron : ron / (r[to] || 1);
}

/* ---------- Conturi și „compartimente” de economii ---------- */
// Economiile sunt împărțite în compartimente, fiecare cu moneda lui:
// '' = alte economii (moneda implicită), 'urgenta' = fond de urgență (moneda implicită),
// 'g:<id>' = goal, 'f:<id>' = fond de economii (ex. „Economii în euro”).
// La transferuri: `amount` e în moneda implicită; `toAmount` / `fromAmount` (dacă există) sunt în moneda compartimentului.

const baseCur = () => state.settings.currency;
const findGoal = b => state.goals.find(g => 'g:' + g.id === b);
const findFund = b => state.funds.find(f => 'f:' + f.id === b);

export function bucketCurrency(b) {
  if (b?.startsWith('g:')) return findGoal(b)?.currency || baseCur();
  if (b?.startsWith('f:')) return findFund(b)?.currency || baseCur();
  return baseCur();
}

export const allBuckets = () => ['', 'urgenta', ...state.goals.map(g => 'g:' + g.id), ...state.funds.map(f => 'f:' + f.id)];

// Suma intrată în compartiment, respectiv ieșită din el, în moneda compartimentului.
export const bucketIn = t => t.toAmount ?? t.amount;
export const bucketOut = t => t.fromAmount ?? t.amount;

export function accountBalance(acc, upTo = null) {
  if (acc === 'economii') {
    const base = baseCur();
    return round2(allBuckets().reduce((a, b) => a + convert(bucketBalance(b, upTo), bucketCurrency(b), base), 0));
  }
  let b = acc === 'curent' ? state.settings.opening.curent || 0 : 0;
  for (const t of state.transactions) {
    if (!inRange(t.date, upTo)) continue;
    if (t.type === 'venit' && t.accountId === acc) b += t.amount;
    else if (t.type === 'cheltuiala' && t.accountId === acc) b -= t.amount;
    else if (t.type === 'transfer') {
      if (t.accountId === acc) b -= t.amount;
      if (t.toAccountId === acc) b += t.amount;
    }
  }
  return round2(b);
}

// Soldul unui compartiment, în moneda lui.
export function bucketBalance(bucket, upTo = null) {
  let b = 0;
  if (bucket === 'urgenta') b = state.emergency.initial || 0;
  else if (bucket.startsWith('g:')) {
    const g = findGoal(bucket);
    if (g && inRange(g.createdAt, upTo)) b = g.initial || 0;
  } else if (bucket.startsWith('f:')) {
    const f = findFund(bucket);
    if (f && inRange(f.createdAt, upTo)) b = f.initial || 0;
  } else b = state.settings.opening.economii || 0;
  for (const t of state.transactions) {
    if (!inRange(t.date, upTo)) continue;
    if (t.type === 'transfer') {
      if (t.toAccountId === 'economii' && (t.toBucket || '') === bucket) b += bucketIn(t);
      if (t.accountId === 'economii' && (t.fromBucket || '') === bucket) b -= bucketOut(t);
    } else if (bucket === '' && t.accountId === 'economii') {
      b += t.type === 'venit' ? t.amount : -t.amount;
    }
  }
  return round2(b);
}

export function bucketName(b) {
  if (!b) return tr('Alte economii');
  if (b === 'urgenta') return tr('Fond de urgență');
  if (b.startsWith('f:')) return findFund(b)?.name || tr('Fond șters');
  return findGoal(b)?.name || tr('Goal șters');
}

const curTag = b => (bucketCurrency(b) !== baseCur() ? ` (${bucketCurrency(b)})` : '');

export function bucketOptions(current) {
  return [
    { value: '', label: tr('Alte economii') },
    { value: 'urgenta', label: tr('Fond de urgență') },
    ...state.funds.map(f => ({ value: 'f:' + f.id, label: tr('Fond: {name}', { name: f.name }) + curTag('f:' + f.id) })),
    ...state.goals.filter(g => !g.done || 'g:' + g.id === current).map(g => ({ value: 'g:' + g.id, label: tr('Goal: {name}', { name: g.name }) + curTag('g:' + g.id) })),
  ];
}

// Pentru grafice: valoarea fiecărui compartiment, convertită în moneda implicită.
export function savingsBreakdown(upTo = null) {
  const base = baseCur();
  const val = b => convert(bucketBalance(b, upTo), bucketCurrency(b), base);
  const items = [{ id: 'urgenta', label: tr('Fond de urgență'), value: val('urgenta'), color: '#4FD1DC' }];
  for (const f of state.funds) items.push({ id: 'f:' + f.id, label: f.name, value: val('f:' + f.id), color: f.color });
  for (const g of state.goals) items.push({ id: 'g:' + g.id, label: g.name, value: val('g:' + g.id), color: g.color });
  items.push({ id: '', label: tr('Alte economii'), value: val(''), color: '#C9CED6' });
  return items.filter(i => i.value > 0).map(i => ({ ...i, value: round2(i.value) }));
}

// Totaluri de economii pe monede (fiecare în moneda ei).
export function savingsByCurrency() {
  const out = {};
  for (const b of allBuckets()) {
    const cur = bucketCurrency(b);
    out[cur] = round2((out[cur] || 0) + bucketBalance(b));
  }
  return out;
}

export function goalStats(g) {
  const saved = bucketBalance('g:' + g.id);
  const left = Math.max(0, round2(g.target - saved));
  let perMonth = null, overdue = false;
  if (g.deadline && left > 0) {
    const days = daysBetween(today(), g.deadline);
    if (days < 0) overdue = true;
    else perMonth = left / Math.max(1, Math.ceil(days / 30.44));
  }
  return { saved, left, pct: g.target > 0 ? saved / g.target : 0, perMonth, overdue, cur: g.currency || baseCur() };
}

/* ---------- Moneda unei tranzacții ---------- */
// O tranzacție e „în euro” dacă are o sumă proprie în euro: transfer spre / dintr-un fond sau goal în euro,
// sau contribuție la un broker în euro. Restul sunt în moneda implicită.

export function txCurrency(t) {
  const base = baseCur();
  if (t.origCurrency && t.origCurrency !== base) return t.origCurrency;
  if (t.type === 'transfer') {
    if (t.toAmount != null && bucketCurrency(t.toBucket) !== base) return bucketCurrency(t.toBucket);
    if (t.fromAmount != null && bucketCurrency(t.fromBucket) !== base) return bucketCurrency(t.fromBucket);
    if (t.toAccountId === 'investitii' && t.assetId) {
      const a = state.assets.find(x => x.id === t.assetId), b = a && brokerOfAsset(a);
      if (b && b.currency !== base) return b.currency;
    }
  }
  return base;
}

// Suma tranzacției într-o monedă: suma proprie dacă e chiar în acea monedă, altfel convertită cu cursul din Setări.
export function txAmountIn(t, cur) {
  const own = txCurrency(t), base = baseCur();
  if (own === cur && own !== base) {
    if (t.origAmount != null && t.origCurrency === own) return t.origAmount;
    if (t.toAmount != null && bucketCurrency(t.toBucket) === own) return t.toAmount;
    if (t.fromAmount != null && bucketCurrency(t.fromBucket) === own) return t.fromAmount;
    const c = state.contributions.find(x => x.txId === t.id);
    if (c) return c.amount;
  }
  return round2(convert(t.amount, base, cur));
}

/* ---------- Lunar ---------- */

export function monthTotals(key) {
  let income = 0, expense = 0;
  for (const t of state.transactions) {
    if (!t.date.startsWith(key)) continue;
    if (t.type === 'venit') income += t.amount;
    else if (t.type === 'cheltuiala') expense += t.amount;
  }
  return { income: round2(income), expense: round2(expense), left: round2(income - expense) };
}

export function expenseByCategory(key, type = 'cheltuiala') {
  const map = new Map();
  for (const t of state.transactions) {
    if (t.type !== type || !t.date.startsWith(key)) continue;
    const k = t.categoryId || '';
    map.set(k, (map.get(k) || 0) + t.amount);
  }
  return [...map].map(([id, value]) => {
    const c = catById(id);
    return { id, value: round2(value), label: catName(c), color: c?.color || '#C9CED6', icon: c?.icon || '•' };
  }).sort((a, b) => b.value - a.value);
}

export const incomeByCategory = key => expenseByCategory(key, 'venit');

/* ---------- Investiții ---------- */

export const brokerOfAsset = a => state.brokers.find(b => b.id === a.brokerId);

export function assetStats(a, upTo = null) {
  const contribs = state.contributions.filter(c => c.assetId === a.id && inRange(c.date, upTo));
  const deposited = round2(sum(contribs, c => c.amount));
  // La aceeași dată contează valoarea salvată ultima (ts), nu ordinea din listă.
  const vals = state.assetValues.filter(v => v.assetId === a.id && inRange(v.date, upTo)).sort((x, y) => x.date.localeCompare(y.date) || (x.ts || 0) - (y.ts || 0));
  const last = vals[vals.length - 1];
  // Fără valoare introdusă: valoarea = total depus. Contribuțiile de după ultima valoare se adaugă la ea.
  const value = round2(last ? last.value + sum(contribs.filter(c => c.date > last.date), c => c.amount) : deposited);
  const profit = round2(value - deposited);
  return { deposited, value, profit, pct: deposited > 0 ? profit / deposited : 0, lastDate: last?.date || null };
}

export function brokerStats(b, upTo = null) {
  const list = state.assets.filter(a => a.brokerId === b.id).map(a => assetStats(a, upTo));
  const deposited = round2(sum(list, s => s.deposited)), value = round2(sum(list, s => s.value));
  const profit = round2(value - deposited);
  return { deposited, value, profit, pct: deposited > 0 ? profit / deposited : 0, count: list.length };
}

export function portfolioStats(upTo = null) {
  const base = state.settings.currency;
  let deposited = 0, value = 0;
  for (const b of state.brokers) {
    const s = brokerStats(b, upTo);
    deposited += convert(s.deposited, b.currency, base);
    value += convert(s.value, b.currency, base);
  }
  deposited = round2(deposited); value = round2(value);
  const profit = round2(value - deposited);
  return { deposited, value, profit, pct: deposited > 0 ? profit / deposited : 0 };
}

// Valoarea portofoliului pe perioada aleasă (în zile: 1, 7, 30, 365, 1095, 1825, sau 'all').
// Până la ~2 luni: un punct pe zi; până la ~1 an: unul pe săptămână; peste: unul pe lună (la final de lună), plus azi.
// Perioada nu începe înainte de prima investiție, ca graficul să nu pornească de la zero.
export function portfolioSeriesFor(period) {
  const dates = [...state.contributions.map(c => c.date), ...state.assetValues.map(v => v.date)].filter(Boolean).sort();
  if (!dates.length) return { points: [], step: 'day' };
  const t = today();
  let start = period === 'all' ? dates[0] : addDays(t, -Number(period));
  if (start < dates[0]) start = dates[0];
  if (start > t) start = t;
  const span = daysBetween(start, t);
  const step = span <= 62 ? 'day' : span <= 400 ? 'week' : 'month';
  const list = [];
  if (step === 'month') {
    for (const m of monthsRange(start.slice(0, 7), t.slice(0, 7))) { const e = monthEnd(m); list.push(e < t ? e : t); }
    if (list[0] > start) list.unshift(start);
  } else {
    const k = step === 'day' ? 1 : 7;
    for (let d = t; d >= start; d = addDays(d, -k)) list.unshift(d);
    if (list[0] > start) list.unshift(start);
  }
  return { step, points: [...new Set(list)].map(d => ({ d, ...portfolioStats(d === t ? null : d) })) };
}

export function allocation(by) {
  const base = state.settings.currency;
  const map = new Map();
  for (const a of state.assets) {
    const b = brokerOfAsset(a);
    if (!b) continue;
    const key = by === 'broker' ? b.id : a.type;
    map.set(key, (map.get(key) || 0) + convert(assetStats(a).value, b.currency, base));
  }
  return [...map].filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).map(([k, v], i) => ({
    id: k, value: round2(v), color: PALETTE[i % PALETTE.length],
    label: by === 'broker' ? state.brokers.find(b => b.id === k)?.name || '—' : assetTypeLabel(k),
  }));
}

export function contributionInBase(c) {
  const a = state.assets.find(x => x.id === c.assetId);
  const b = a && brokerOfAsset(a);
  return convert(c.amount, b?.currency || state.settings.currency, state.settings.currency);
}

/* ---------- Datorii ---------- */

export function debtRemaining(d, upTo = null) {
  if (upTo && d.startDate && upTo < d.startDate) return 0;
  const paid = sum(state.debtPayments.filter(p => p.debtId === d.id && inRange(p.date, upTo)), p => p.amount);
  return Math.max(0, round2((d.remainingStart ?? d.initial) - paid));
}

export function debtStats(d) {
  const remaining = debtRemaining(d);
  const paidPct = d.initial > 0 ? Math.min(1, Math.max(0, (d.initial - remaining) / d.initial)) : 0;
  const monthsLeft = remaining <= 0 ? 0 : d.monthly > 0 ? Math.ceil(remaining / d.monthly) : null;
  return { remaining, paidPct, monthsLeft };
}

export function debtTotals(upTo = null) {
  let remaining = 0, monthly = 0;
  for (const d of state.debts) {
    const r = debtRemaining(d, upTo);
    remaining += r;
    if (r > 0) monthly += d.monthly || 0;
  }
  return { remaining: round2(remaining), monthly: round2(monthly) };
}

export const receivablesOpen = (upTo = null) =>
  round2(sum(state.receivables.filter(r => r.status !== 'achitat' && inRange(r.date, upTo)), r => r.amount));

/* ---------- Avere netă ---------- */

export function netWorth(upTo = null) {
  const cur = accountBalance('curent', upTo);
  const eco = accountBalance('economii', upTo);
  const inv = portfolioStats(upTo).value;
  const debts = debtTotals(upTo).remaining;
  const rec = state.settings.includeReceivables ? receivablesOpen(upTo) : 0;
  const without = round2(cur + eco + rec - debts);
  return { cur, eco, inv, debts, rec, without, with: round2(without + inv) };
}

export const snapshotFor = m => state.snapshots.find(s => s.month === m);

export function netWorthSeries() {
  const pts = [...state.snapshots].sort((a, b) => a.month.localeCompare(b.month)).map(s => ({ m: s.month, without: s.without, with: s.with }));
  const now = netWorth();
  pts.push({ m: currentMonth(), without: now.without, with: now.with });
  return pts;
}

/* ---------- Fond de urgență ---------- */

// Media cheltuielilor din ultimele 3 luni încheiate dinaintea lunii `ref`.
export function avgMonthlyExpense(ref = currentMonth()) {
  const e = state.emergency;
  if (e.manualAvg > 0) return { value: e.manualAvg, manual: true };
  const vals = [1, 2, 3].map(i => monthTotals(addMonths(ref, -i)).expense).filter(v => v > 0);
  if (vals.length) return { value: round2(sum(vals) / vals.length), manual: false, months: vals.length };
  return { value: monthTotals(ref).expense, manual: false, months: 0 };
}

export function efStats() {
  const e = state.emergency;
  const balance = bucketBalance('urgenta');
  const avg = avgMonthlyExpense().value;
  const target = round2(avg * e.months);
  const covered = avg > 0 ? balance / avg : 0;
  const level = covered < e.red ? 'neg' : covered < e.orange ? 'warn' : 'pos';
  return { balance, avg, target, covered, months: e.months, pct: target > 0 ? Math.min(1, balance / target) : 0, level };
}

/* ---------- Abonamente ---------- */

export const subMonthly = s => s.amount / (FREQ[s.frequency] || 1);

export function subTotals() {
  const monthly = round2(sum(state.subscriptions, subMonthly));
  return { monthly, annual: round2(monthly * 12) };
}

export function upcomingSubs(days = 7) {
  const t = today();
  return state.subscriptions
    .filter(s => s.nextPayment && s.nextPayment >= t && daysBetween(t, s.nextPayment) <= days)
    .sort((a, b) => a.nextPayment.localeCompare(b.nextPayment));
}

/* ---------- Raport anual ---------- */

export function availableYears() {
  const first = firstDataMonth();
  const cy = Number(currentMonth().slice(0, 4));
  const fy = first ? Math.min(Number(first.slice(0, 4)), cy) : cy;
  return Array.from({ length: cy - fy + 1 }, (_, i) => cy - i);
}

// Se calculează mereu din date (nu se salvează), pentru anul întreg sau până azi în anul curent.
export function buildYearReport(y) {
  const cm = currentMonth();
  const isCurrent = String(y) === cm.slice(0, 4);
  const months = monthsRange(`${y}-01`, `${y}-12`).filter(m => m <= cm);
  const perMonth = months.map(m => ({ m, ...monthTotals(m) }));
  const income = round2(sum(perMonth, x => x.income)), expense = round2(sum(perMonth, x => x.expense));
  const active = perMonth.filter(x => x.income || x.expense);
  const n = active.length || 1;

  const catMap = new Map();
  for (const m of months) {
    for (const c of expenseByCategory(m)) {
      const prev = catMap.get(c.id);
      catMap.set(c.id, prev ? { ...prev, value: round2(prev.value + c.value) } : { ...c });
    }
  }
  const categories = [...catMap.values()].sort((a, b) => b.value - a.value);

  const pick = (arr, f) => arr.length ? arr.reduce((best, x) => (f(x) > f(best) ? x : best)) : null;
  const end = isCurrent ? null : `${y}-12-31`, start = `${y - 1}-12-31`;
  const inYear = d => d && d.startsWith(String(y));
  const subsCat = catByName('Abonamente', 'cheltuiala')?.id;
  const nwEnd = netWorth(end), nwStart = netWorth(start);
  const pStart = portfolioStats(start), pEnd = portfolioStats(end);

  return {
    year: y, isCurrent, months: perMonth,
    income, expense, left: round2(income - expense),
    savingsRate: income > 0 ? (income - expense) / income : null,
    avgIncome: round2(income / n), avgExpense: round2(expense / n),
    categories,
    bestMonth: pick(active, x => x.left),
    priciestMonth: pick(active, x => x.expense),
    subscriptions: round2(sum(state.transactions.filter(t =>
      t.type === 'cheltuiala' && inYear(t.date) && (t.subscriptionId || (subsCat && t.categoryId === subsCat))), t => t.amount)),
    debts: { paid: round2(sum(state.debtPayments.filter(p => inYear(p.date)), p => p.amount)), remaining: debtTotals(end).remaining },
    investments: {
      deposited: round2(sum(state.contributions.filter(c => inYear(c.date)), contributionInBase)),
      valueStart: pStart.value, valueEnd: pEnd.value,
    },
    ef: { start: bucketBalance('urgenta', start), end: bucketBalance('urgenta', end) },
    goals: state.goals.filter(g => !g.createdAt || g.createdAt <= (end || today())).map(g => {
      const b = 'g:' + g.id, savedEnd = bucketBalance(b, end);
      return { name: g.name, icon: g.icon, color: g.color, cur: g.currency || baseCur(), target: g.target, savedEnd, added: round2(savedEnd - bucketBalance(b, start)), pct: g.target > 0 ? savedEnd / g.target : 0 };
    }),
    networth: { without: nwEnd.without, with: nwEnd.with, startWithout: nwStart.without, startWith: nwStart.with },
  };
}

/* ---------- Cât pot cheltui azi ---------- */

// Plățile din contul Curent care mai urmează până la `end` (inclusiv): abonamente și rate neplătite încă.
// Rămân în listă și după scadență, până confirmi că le-ai plătit (abonamentele cu plată automată se înregistrează singure).
export function upcomingCommitments(end = monthEnd(currentMonth())) {
  const t = today(), cm = currentMonth();
  const items = [];
  for (const s of state.subscriptions) {
    // Un abonament poate cădea de mai multe ori în interval (ex. lunar, când salariul e peste mai mult de o lună).
    for (let d = s.nextPayment, i = 0; d && d <= end && i < 6; d = addMonthsDate(d, FREQ[s.frequency] || 1, s.anchorDay), i++) {
      if (s.autoRecord && d <= t) continue;
      items.push({ label: s.name, date: d, amount: s.amount, kind: tr('Abonament'), subId: s.id, late: d < t });
    }
  }
  for (const d of state.debts) {
    let remaining = debtRemaining(d);
    if (!(remaining > 0 && d.monthly > 0)) continue;
    for (const m of monthsRange(cm, end.slice(0, 7))) {
      if (remaining <= 0) break;
      if (state.debtPayments.some(p => p.debtId === d.id && p.date.startsWith(m))) continue;
      // rata unei luni plătite înainte ca datoria să fie adăugată în aplicație (bifa din formular)
      if (d.paidThrough && m <= d.paidThrough) continue;
      const last = Number(monthEnd(m).slice(8));
      const due = `${m}-${String(Math.min(d.dueDay || last, last)).padStart(2, '0')}`;
      // Luna curentă: rata neplătită intră în calcul chiar dacă scadența a trecut. Lunile următoare: doar până la `end`.
      if (due > end || (m !== cm && due <= t)) continue;
      const amount = Math.min(d.monthly, remaining);
      remaining -= amount;
      items.push({ label: d.creditor, date: due, amount, kind: tr('Rată'), debtId: d.id, late: due < t });
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

// Banii din Curent se împart până în ziua dinaintea următorului salariu (dacă e setată ziua), altfel până la final de lună.
export function dailyAllowance() {
  const t = today();
  const salaryDay = state.settings.salaryDay;
  const payday = salaryDay ? nextPayday(salaryDay, t) : null;
  const end = payday ? addDays(payday, -1) : monthEnd(currentMonth());
  // Ratele și abonamentele plătite azi sunt plăți planificate, nu cheltuieli din „bugetul zilei”.
  const spentToday = round2(sum(state.transactions.filter(x =>
    x.type === 'cheltuiala' && x.accountId === 'curent' && x.date === t && !x.debtId && !x.subscriptionId), x => x.amount));
  const available = accountBalance('curent');
  const commitments = upcomingCommitments(end);
  const committed = round2(sum(commitments, c => c.amount));
  const daysLeft = daysBetween(t, end) + 1;
  const free = round2(available + spentToday - committed);
  const perDay = free > 0 ? round2(free / daysLeft) : 0;
  return { available, spentToday, committed, commitments, daysLeft, free, perDay, leftToday: round2(perDay - spentToday), end, payday };
}

/* ---------- Snapshot-uri și rapoarte lunare ---------- */

export function firstDataMonth() {
  const dates = [
    ...state.transactions.map(t => t.date), ...state.contributions.map(c => c.date), ...state.assetValues.map(v => v.date),
    ...state.debts.map(d => d.startDate), ...state.goals.map(g => g.createdAt), ...state.funds.map(f => f.createdAt), ...state.debtPayments.map(p => p.date),
  ].filter(Boolean).sort();
  return dates.length ? dates[0].slice(0, 7) : null;
}

function closedMonths() {
  const first = firstDataMonth();
  const last = addMonths(currentMonth(), -1);
  return first && first <= last ? monthsRange(first, last) : [];
}

export function ensureSnapshots() {
  let changed = false;
  for (const m of closedMonths()) {
    if (snapshotFor(m)) continue;
    const nw = netWorth(monthEnd(m));
    state.snapshots.push({ month: m, without: nw.without, with: nw.with });
    changed = true;
  }
  if (changed) state.snapshots.sort((a, b) => a.month.localeCompare(b.month));
  return changed;
}

export function rebuildSnapshots() {
  state.snapshots = [];
  ensureSnapshots();
}

export function ensureReports() {
  let changed = false;
  for (const m of closedMonths()) {
    if (state.reports.some(r => r.month === m)) continue;
    state.reports.push(buildReport(m));
    changed = true;
  }
  if (changed) state.reports.sort((a, b) => a.month.localeCompare(b.month));
  return changed;
}

export function buildReport(m) {
  const prev = addMonths(m, -1), end = monthEnd(m), prevEnd = monthEnd(prev);
  const tot = monthTotals(m), ptot = monthTotals(prev);
  const cats = expenseByCategory(m), pcats = expenseByCategory(prev);
  const ids = [...new Set([...cats.map(c => c.id), ...pcats.map(c => c.id)])];
  const compare = ids.map(id => {
    const c = cats.find(x => x.id === id), p = pcats.find(x => x.id === id), b = c || p;
    return { id, label: b.label, icon: b.icon, color: b.color, cur: c?.value || 0, prev: p?.value || 0 };
  }).sort((a, b) => b.cur - a.cur || b.prev - a.prev);

  const subsCat = catByName('Abonamente', 'cheltuiala')?.id;
  const subscriptions = round2(sum(state.transactions.filter(t =>
    t.type === 'cheltuiala' && t.date.startsWith(m) && (t.subscriptionId || (subsCat && t.categoryId === subsCat))), t => t.amount));

  const goals = state.goals.filter(g => inRange(g.createdAt, end)).map(g => {
    const b = 'g:' + g.id, savedEnd = bucketBalance(b, end);
    return { name: g.name, icon: g.icon, color: g.color, cur: g.currency || baseCur(), target: g.target, added: round2(savedEnd - bucketBalance(b, prevEnd)), savedEnd, pct: g.target > 0 ? savedEnd / g.target : 0 };
  });

  const avg = avgMonthlyExpense(addMonths(m, 1)).value;
  const efEnd = bucketBalance('urgenta', end);
  const pStart = portfolioStats(prevEnd), pEnd = portfolioStats(end);
  const nw = snapshotFor(m) || netWorth(end);
  const pnw = snapshotFor(prev) || netWorth(prevEnd);

  return {
    month: m,
    generatedAt: today(),
    income: tot.income, expense: tot.expense, left: tot.left,
    savingsRate: tot.income > 0 ? tot.left / tot.income : null,
    prevIncome: ptot.income, prevExpense: ptot.expense,
    top: cats.slice(0, 3),
    compare,
    subscriptions,
    goals,
    ef: { start: bucketBalance('urgenta', prevEnd), end: efEnd, covered: avg > 0 ? efEnd / avg : 0, months: state.emergency.months },
    debts: {
      paid: round2(sum(state.debtPayments.filter(p => p.date.startsWith(m)), p => p.amount)),
      remaining: debtTotals(end).remaining,
    },
    investments: {
      deposited: round2(sum(state.contributions.filter(c => c.date.startsWith(m)), contributionInBase)),
      valueStart: pStart.value, valueEnd: pEnd.value, totalDeposited: pEnd.deposited, profit: pEnd.profit,
    },
    networth: { without: nw.without, with: nw.with, prevWithout: pnw.without, prevWith: pnw.with },
  };
}
