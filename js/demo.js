// Date demo: ~5 luni de activitate, ca aplicația să poată fi încercată imediat.

import { defaultState, uid, PALETTE } from './store.js';
import { t as L } from './i18n.js';
import { today, currentMonth, addMonths, monthEnd, monthsRange, addDays, addMonthsDate } from './dates.js';

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDemo(keepSettings) {
  const s = defaultState();
  Object.assign(s.settings, {
    lang: keepSettings.lang, theme: keepSettings.theme, privateOnStart: keepSettings.privateOnStart, privateMode: keepSettings.privateMode,
    opening: { curent: 3500, economii: 1500 },
  });
  s.emergency.initial = 14000;

  const r = rng(7);
  const between = (a, b) => Math.round((a + r() * (b - a)) * 100) / 100;
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const t = today(), cm = currentMonth(), first = addMonths(cm, -4);
  const startDate = `${first}-01`;
  const cat = name => s.categories.find(c => c.name === name && c.type === (['Salariu', 'Freelance', 'Bonus', 'Dividende'].includes(name) ? 'venit' : 'cheltuiala')).id;
  const day = (m, d) => { const last = Number(monthEnd(m).slice(8)); return `${m}-${String(Math.min(d, last)).padStart(2, '0')}`; };
  const tx = (o) => { if (o.date > t) return null; const x = { id: uid(), accountId: 'curent', note: '', ...o }; s.transactions.push(x); return x; };

  // Goal-uri
  const goals = [
    { name: L('Vacanță în Grecia'), icon: '🏖️', target: 8000, initial: 1200, deadline: addMonthsDate(t, 7), color: PALETTE[0] },
    { name: L('Laptop nou'), icon: '💻', target: 6000, initial: 2500, deadline: null, color: PALETTE[4] },
    { name: L('Avans apartament'), icon: '🏠', target: 40000, initial: 9000, deadline: addMonthsDate(t, 30), color: PALETTE[3] },
  ].map(g => ({ id: uid(), done: false, createdAt: startDate, ...g }));
  s.goals = goals;

  // Investiții
  const brokers = [
    { id: uid(), name: 'XTB', currency: 'EUR', note: L('ETF-uri pe termen lung') },
    { id: uid(), name: 'Trading 212', currency: 'USD', note: '' },
    { id: uid(), name: 'Tradeville', currency: 'RON', note: L('Titluri de stat') },
  ];
  s.brokers = brokers;
  const assets = [
    { id: uid(), brokerId: brokers[0].id, name: 'Vanguard FTSE All-World', symbol: 'VWCE', type: 'etf', monthly: 100, growth: 0.009 },
    { id: uid(), brokerId: brokers[0].id, name: 'iShares Core S&P 500', symbol: 'CSPX', type: 'etf', monthly: 50, growth: 0.011 },
    { id: uid(), brokerId: brokers[1].id, name: 'Apple', symbol: 'AAPL', type: 'actiune', monthly: 40, growth: -0.004 },
    { id: uid(), brokerId: brokers[2].id, name: 'Fidelis 2028', symbol: 'R2805A', type: 'titluri', monthly: 500, growth: 0.005 },
  ];
  s.assets = assets.map(({ monthly, growth, ...a }) => a);
  const rate = { EUR: s.settings.rates.EUR, USD: s.settings.rates.USD, RON: 1 };

  // Datorii
  const debts = [
    { id: uid(), type: 'leasing', creditor: L('Leasing auto'), initial: 45000, remainingStart: 31000, monthly: 1150, interest: 8.9, dueDay: 15, endDate: addMonthsDate(t, 27), note: '', startDate },
    { id: uid(), type: 'card', creditor: L('Card de credit'), initial: 5000, remainingStart: 2600, monthly: 400, interest: 21, dueDay: 25, endDate: null, note: '', startDate },
  ];
  s.debts = debts;

  const months = monthsRange(first, cm);
  const cumulative = new Map(assets.map(a => [a.id, { dep: 0, val: 0 }]));
  months.forEach((m, mi) => {
    tx({ type: 'venit', amount: 9800, date: day(m, 10), categoryId: cat('Salariu'), note: L('Salariu') });
    if (mi % 2 === 1) tx({ type: 'venit', amount: between(900, 1800), date: day(m, 21), categoryId: cat('Freelance'), note: L('Proiect site') });
    if (mi === 2) tx({ type: 'venit', amount: 1500, date: day(m, 24), categoryId: cat('Bonus'), note: L('Bonus trimestrial') });
    tx({ type: 'cheltuiala', amount: 2200, date: day(m, 1), categoryId: cat('Locuință'), note: L('Chirie') });
    tx({ type: 'cheltuiala', amount: between(260, 420), date: day(m, 16), categoryId: cat('Utilități'), note: L('Curent + gaz') });
    tx({ type: 'cheltuiala', amount: 60, date: day(m, 16), categoryId: cat('Utilități'), note: 'Internet' });
    for (let d = 2; d <= 30; d += 4 + Math.floor(r() * 2)) tx({ type: 'cheltuiala', amount: between(70, 330), date: day(m, d), categoryId: cat('Mâncare'), note: pick(['Kaufland', 'Lidl', 'Mega Image', L('Piață'), 'Carrefour']) });
    for (let d = 4; d <= 30; d += 7) tx({ type: 'cheltuiala', amount: between(40, 220), date: day(m, d), categoryId: cat('Transport'), note: pick([L('Benzină'), 'Bolt', L('Abonament STB'), L('Parcare')]) });
    for (let k = 0; k < 3; k++) tx({ type: 'cheltuiala', amount: between(60, 260), date: day(m, 6 + k * 8), categoryId: cat('Distracție'), note: pick(['Restaurant', 'Cinema', 'Concert', L('Ieșire cu prietenii')]) });
    if (r() > 0.3) tx({ type: 'cheltuiala', amount: between(150, 600), date: day(m, 19), categoryId: cat('Shopping'), note: pick([L('Haine'), 'eMAG', L('Pantofi'), 'IKEA']) });
    if (r() > 0.5) tx({ type: 'cheltuiala', amount: between(40, 280), date: day(m, 13), categoryId: cat('Sănătate'), note: L('Farmacie') });
    if (mi % 2 === 0) tx({ type: 'cheltuiala', amount: 149, date: day(m, 9), categoryId: cat('Educație'), note: L('Curs online') });

    // Economii
    tx({ type: 'transfer', amount: 500, date: day(m, 11), accountId: 'curent', toAccountId: 'economii', toBucket: 'urgenta', note: L('Fond de urgență') });
    tx({ type: 'transfer', amount: 400, date: day(m, 11), accountId: 'curent', toAccountId: 'economii', toBucket: 'g:' + goals[0].id, note: L('Goal: Vacanță') });
    tx({ type: 'transfer', amount: 200, date: day(m, 11), accountId: 'curent', toAccountId: 'economii', toBucket: 'g:' + goals[1].id, note: L('Goal: Laptop') });
    tx({ type: 'transfer', amount: 300, date: day(m, 11), accountId: 'curent', toAccountId: 'economii', toBucket: 'g:' + goals[2].id, note: L('Goal: Avans') });

    // Contribuții (cu transfer din Curent) și valori la final de lună
    for (const a of assets) {
      const b = brokers.find(x => x.id === a.brokerId);
      const isTitluri = a.type === 'titluri';
      const c = cumulative.get(a.id);
      const cDate = day(m, 12);
      if ((!isTitluri || mi % 3 === 0) && cDate <= t) {
        const amount = isTitluri ? 1000 : a.monthly;
        const trx = tx({ type: 'transfer', amount: Math.round(amount * rate[b.currency] * 100) / 100, date: cDate, accountId: 'curent', toAccountId: 'investitii', assetId: a.id, note: L('Contribuție {name}', { name: a.name }) });
        s.contributions.push({ id: uid(), assetId: a.id, date: cDate, amount, txId: trx.id });
        c.dep += amount; c.val += amount;
      }
      c.val = c.val * (1 + a.growth + (r() - 0.5) * 0.03);
      const vDate = m === cm ? addDays(t, -1) : monthEnd(m);
      if (c.dep > 0 && vDate >= cDate) s.assetValues.push({ id: uid(), assetId: a.id, date: vDate, value: Math.round(c.val * 100) / 100 });
    }

    // Plăți datorii (cheltuială + plată legată)
    for (const d of debts) {
      const pt = tx({ type: 'cheltuiala', amount: d.monthly, date: day(m, d.dueDay), categoryId: cat('Rate credite'), note: L('Plată {name}', { name: d.creditor }), debtId: d.id });
      if (pt) s.debtPayments.push({ id: uid(), debtId: d.id, date: pt.date, amount: d.monthly, txId: pt.id });
    }
  });

  // Abonamente: plățile trecute se înregistrează automat la pornire.
  const soon = Number(addDays(t, 3).slice(8));
  s.subscriptions = [
    { name: 'Netflix', amount: 49.99, frequency: 'lunar', day: 5, paymentMethod: 'Card Revolut' },
    { name: 'Spotify', amount: 25.99, frequency: 'lunar', day: soon, paymentMethod: 'Card Revolut' },
    { name: L('Sală World Class'), amount: 180, frequency: 'lunar', day: 2, paymentMethod: 'Card BT' },
    { name: 'iCloud 200 GB', amount: 14.99, frequency: 'lunar', day: 22, paymentMethod: 'Apple Pay' },
    { name: 'Adobe Lightroom', amount: 59.99, frequency: 'lunar', day: 27, paymentMethod: 'Card BT', toCancel: true },
    { name: L('Asigurare locuință'), amount: 420, frequency: 'anual', next: addDays(t, 45), paymentMethod: L('Transfer bancar') },
  ].map(x => ({
    id: uid(), name: x.name, amount: x.amount, frequency: x.frequency, paymentMethod: x.paymentMethod, toCancel: !!x.toCancel,
    categoryId: 'c-abonamente', note: '', autoRecord: true,
    nextPayment: x.next || day(first, x.day), anchorDay: x.next ? Number(x.next.slice(8)) : x.day,
  }));

  s.receivables = [
    { id: uid(), person: 'Andrei', amount: 350, date: addDays(t, -12), status: 'neachitat', note: L('Bilete concert') },
    { id: uid(), person: 'Maria', amount: 200, date: addDays(t, -40), status: 'achitat', note: L('Cadou comun') },
  ];
  return s;
}
