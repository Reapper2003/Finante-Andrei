// Export Excel (toate datele sau o perioadă), export raport lunar, backup JSON.

import { state, catById, accountName } from './store.js';
import { t as tr, catName } from './i18n.js';
import { today, monthLabel } from './dates.js';
import { buildXlsx } from './xlsx.js';
import { deliverFile } from './ui.js';
import {
  round2, bucketName, assetStats, brokerStats, assetTypeLabel, brokerOfAsset, debtTypeLabel, debtStats,
  goalStats, efStats, subMonthly, freqLabel, bucketCurrency, bucketBalance, convert,
} from './calc.js';

const H = (...names) => names.map(v => ({ v: tr(v), s: 'head' }));
const D = v => ({ t: 'd', v });
const M = v => (v == null ? '' : { v: round2(v), s: 'money' });
const P = v => (v == null || !isFinite(v) ? '' : { v: Math.round(v * 10000) / 10000, s: 'pct' });
const I = v => (v == null ? '' : { v, s: 'int' });
const B = (v, vars) => ({ v: tr(v, vars), s: 'bold' });
const TYPE = { venit: 'Venit', cheltuiala: 'Cheltuială', transfer: 'Transfer' };
const typeName = k => tr(TYPE[k]);
const yesNo = v => (v ? tr('Da') : tr('Nu'));

export function buildAllSheets({ from, to } = {}) {
  const cur = state.settings.currency;
  const inR = d => (!from || (d && d >= from)) && (!to || (d && d <= to));
  const inRM = m => (!from || m >= from.slice(0, 7)) && (!to || m <= to.slice(0, 7));
  const byDate = (a, b) => (a.date || '').localeCompare(b.date || '');
  const assetName = id => state.assets.find(a => a.id === id)?.name || '';
  const brokerName = assetId => { const a = state.assets.find(x => x.id === assetId); return (a && brokerOfAsset(a)?.name) || ''; };
  const brokerCur = assetId => { const a = state.assets.find(x => x.id === assetId); return (a && brokerOfAsset(a)?.currency) || cur; };

  const tx = state.transactions.filter(t => inR(t.date)).sort(byDate);
  const sheets = [];

  sheets.push({
    name: tr('Tranzacții'), freeze: 1, cols: [12, 12, 18, 12, 24, 14, 8, 30, 14, 10],
    rows: [H('Data', 'Tip', 'Categorie', 'Cont', 'Cont destinație', 'Sumă', 'Monedă', 'Notă', 'Sumă originală', 'Moneda originală'),
      ...tx.map(t => [D(t.date), typeName(t.type), t.type === 'transfer' ? '' : catName(catById(t.categoryId)),
        t.accountId === 'economii' && t.type === 'transfer' ? `${accountName('economii')} (${bucketName(t.fromBucket)})` : accountName(t.accountId),
        t.type !== 'transfer' ? '' : t.toAccountId === 'economii' ? `${accountName('economii')} (${bucketName(t.toBucket)})` : accountName(t.toAccountId) + (t.assetId ? ` – ${assetName(t.assetId)}` : ''),
        M(t.amount), cur, t.note || '', t.origCurrency ? M(t.origAmount) : '', t.origCurrency || ''])],
  });

  sheets.push({
    name: tr('Categorii'), freeze: 1, cols: [20, 12, 10, 10],
    rows: [H('Nume', 'Tip', 'Culoare', 'Iconiță'), ...state.categories.map(c => [catName(c), typeName(c.type), c.color, c.icon])],
  });

  sheets.push({
    name: tr('Brokeri'), freeze: 1, cols: [20, 8, 14, 16, 14, 10, 30],
    rows: [H('Broker', 'Monedă', 'Total depus', 'Valoare curentă', 'Profit', 'Profit %', 'Notă'),
      ...state.brokers.map(b => { const s = brokerStats(b); return [b.name, b.currency, M(s.deposited), M(s.value), M(s.profit), P(s.pct), b.note || '']; })],
  });

  sheets.push({
    name: tr('Active'), freeze: 1, cols: [18, 26, 10, 14, 8, 14, 16, 14, 10, 14],
    rows: [H('Broker', 'Activ', 'Simbol', 'Tip', 'Monedă', 'Total depus', 'Valoare curentă', 'Profit', 'Profit %', 'Valoare la data'),
      ...state.assets.map(a => { const b = brokerOfAsset(a), s = assetStats(a); return [b?.name || '', a.name, a.symbol || '', assetTypeLabel(a.type), b?.currency || '', M(s.deposited), M(s.value), M(s.profit), P(s.pct), s.lastDate ? D(s.lastDate) : '']; })],
  });

  sheets.push({
    name: tr('Contribuții'), freeze: 1, cols: [12, 18, 26, 14, 8],
    rows: [H('Data', 'Broker', 'Activ', 'Sumă', 'Monedă'),
      ...state.contributions.filter(c => inR(c.date)).sort(byDate).map(c => [D(c.date), brokerName(c.assetId), assetName(c.assetId), M(c.amount), brokerCur(c.assetId)])],
  });

  sheets.push({
    name: tr('Istoric valori'), freeze: 1, cols: [12, 18, 26, 14, 8],
    rows: [H('Data', 'Broker', 'Activ', 'Valoare', 'Monedă'),
      ...state.assetValues.filter(v => inR(v.date)).sort(byDate).map(v => [D(v.date), brokerName(v.assetId), assetName(v.assetId), M(v.value), brokerCur(v.assetId)])],
  });

  sheets.push({
    name: tr('Abonamente'), freeze: 1, cols: [22, 12, 12, 16, 16, 16, 10, 14, 28],
    rows: [H('Nume', 'Sumă', 'Frecvență', 'Următoarea plată', 'Metodă de plată', 'Categorie', 'De anulat?', 'Cost lunar', 'Notă'),
      ...[...state.subscriptions].sort((a, b) => (a.nextPayment || '').localeCompare(b.nextPayment || '')).map(s =>
        [s.name, M(s.amount), freqLabel(s.frequency), D(s.nextPayment), s.paymentMethod || '', s.categoryId ? catName(catById(s.categoryId)) : '', yesNo(s.toCancel), M(subMonthly(s)), s.note || ''])],
  });

  sheets.push({
    name: tr('Goal-uri'), freeze: 1, cols: [22, 8, 14, 14, 10, 14, 14, 10],
    rows: [H('Nume', 'Monedă', 'Țintă', 'Strâns', 'Progres %', 'Rămas', 'Termen', 'Finalizat'),
      ...state.goals.map(g => { const s = goalStats(g); return [g.name, s.cur, M(g.target), M(s.saved), P(s.pct), M(s.left), g.deadline ? D(g.deadline) : '', yesNo(g.done)]; })],
  });

  sheets.push({
    name: tr('Fonduri de economii'), freeze: 1, cols: [24, 8, 14, 16, 30],
    rows: [H('Nume', 'Monedă', 'Sold', 'Sold în moneda implicită', 'Notă'),
      ...['', ...state.funds.map(f => 'f:' + f.id)].map(b => {
        const c = bucketCurrency(b), bal = bucketBalance(b);
        return [bucketName(b), c, M(bal), M(convert(bal, c, cur)), b ? state.funds.find(f => 'f:' + f.id === b)?.note || '' : ''];
      })],
  });

  const ef = efStats();
  const efMoves = state.transactions.filter(t => t.type === 'transfer' && (t.toBucket === 'urgenta' || t.fromBucket === 'urgenta') && inR(t.date)).sort(byDate);
  sheets.push({
    name: tr('Fond de urgență'), cols: [26, 14, 14, 30],
    rows: [
      [B('Sold fond'), M(ef.balance)], [B('Luni țintă'), I(ef.months)], [B('Cheltuieli lunare medii'), M(ef.avg)],
      [B('Sumă țintă'), M(ef.target)], [B('Luni acoperite'), { v: Math.round(ef.covered * 10) / 10, s: 'dec1' }], [B('Progres'), P(ef.pct)], [],
      H('Data', 'Mișcare', 'Sumă', 'Notă'),
      ...efMoves.map(t => [D(t.date), t.toBucket === 'urgenta' ? tr('Depunere') : tr('Retragere'), M(t.toBucket === 'urgenta' ? t.amount : -t.amount), t.note || '']),
    ],
  });

  sheets.push({
    name: tr('Datorii'), freeze: 1, cols: [22, 22, 14, 14, 12, 10, 11, 12, 10, 28],
    rows: [H('Tip', 'Creditor', 'Sumă inițială', 'Sold rămas', 'Rată lunară', 'Dobândă %', 'Zi scadență', 'Data finală', 'Achitat %', 'Notă'),
      ...state.debts.map(d => { const s = debtStats(d); return [debtTypeLabel(d.type), d.creditor, M(d.initial), M(s.remaining), M(d.monthly), d.interest ? { v: d.interest, s: 'num' } : '', d.dueDay ? I(d.dueDay) : '', d.endDate ? D(d.endDate) : '', P(s.paidPct), d.note || '']; })],
  });

  sheets.push({
    name: tr('Plăți datorii'), freeze: 1, cols: [12, 24, 14],
    rows: [H('Data', 'Datorie', 'Sumă'),
      ...state.debtPayments.filter(p => inR(p.date)).sort(byDate).map(p => [D(p.date), state.debts.find(d => d.id === p.debtId)?.creditor || '', M(p.amount)])],
  });

  sheets.push({
    name: tr('Bani de primit'), freeze: 1, cols: [20, 14, 12, 12, 28],
    rows: [H('Persoană', 'Sumă', 'Data', 'Status', 'Notă'),
      ...state.receivables.filter(r => inR(r.date)).sort(byDate).map(r => [r.person, M(r.amount), D(r.date), r.status === 'achitat' ? tr('Achitat') : tr('Neachitat'), r.note || ''])],
  });

  sheets.push({
    name: tr('Avere netă'), freeze: 1, cols: [18, 20, 20],
    rows: [H('Luna', 'Fără investiții', 'Cu investiții'),
      ...state.snapshots.filter(s => inRM(s.month)).map(s => [monthLabel(s.month), M(s.without), M(s.with)])],
  });

  sheets.push({
    name: tr('Rapoarte lunare'), freeze: 1, cols: [18, 14, 14, 14, 12, 14, 14, 14, 18, 18],
    rows: [H('Luna', 'Venituri', 'Cheltuieli', 'Rămas', 'Rata economisire', 'Abonamente', 'Datorii plătite', 'Investiții depuse', 'Avere netă (fără inv.)', 'Avere netă (cu inv.)'),
      ...state.reports.filter(r => inRM(r.month)).map(r => [monthLabel(r.month), M(r.income), M(r.expense), M(r.left), P(r.savingsRate),
        M(r.subscriptions), M(r.debts.paid), M(r.investments.deposited), M(r.networth.without), M(r.networth.with)])],
  });

  return sheets;
}

export function exportAll(range = {}) {
  return deliverFile(buildXlsx(buildAllSheets(range)), `${tr('finante')}_${today()}.xlsx`);
}

export function exportReport(r) {
  const rows = [
    [B('Raport lunar – {month}', { month: monthLabel(r.month) })], [],
    [B('Venituri'), M(r.income)], [B('Cheltuieli'), M(r.expense)], [B('Rămas'), M(r.left)], [B('Rata de economisire'), P(r.savingsRate)],
    [B('Plătit pe abonamente'), M(r.subscriptions)], [],
    H('Categorie', 'Luna aceasta', 'Luna trecută', 'Diferență %'),
    ...r.compare.map(c => [catById(c.id) ? catName(catById(c.id)) : c.label, M(c.cur), M(c.prev), c.prev > 0 ? P((c.cur - c.prev) / c.prev) : '']), [],
    H('Goal', 'Adăugat în lună', 'Strâns la final', 'Progres %'),
    ...r.goals.map(g => [g.name, M(g.added), M(g.savedEnd), P(g.pct)]), [],
    [B('Fond de urgență – început'), M(r.ef.start)], [B('Fond de urgență – final'), M(r.ef.end)],
    [B('Luni acoperite'), { v: Math.round(r.ef.covered * 10) / 10, s: 'dec1' }], [],
    [B('Datorii plătite'), M(r.debts.paid)], [B('Datorii rămase'), M(r.debts.remaining)], [],
    [B('Investiții depuse în lună'), M(r.investments.deposited)], [B('Valoare portofoliu – început'), M(r.investments.valueStart)],
    [B('Valoare portofoliu – final'), M(r.investments.valueEnd)], [],
    [B('Avere netă fără investiții'), M(r.networth.without)], [B('Avere netă cu investiții'), M(r.networth.with)],
    [B('Luna trecută – fără investiții'), M(r.networth.prevWithout)], [B('Luna trecută – cu investiții'), M(r.networth.prevWith)],
  ];
  const blob = buildXlsx([{ name: `${tr('Raport')} ${r.month}`, cols: [32, 16, 16, 14], rows }]);
  return deliverFile(blob, `${tr('raport')}_${r.month}.xlsx`);
}

export function exportYearReport(y) {
  const rows = [
    [B('Raport anual – {year}', { year: y.year })], [],
    [B('Venituri'), M(y.income)], [B('Cheltuieli'), M(y.expense)], [B('Rămas'), M(y.left)], [B('Rata de economisire'), P(y.savingsRate)],
    [B('Venit mediu pe lună'), M(y.avgIncome)], [B('Cheltuieli medii pe lună'), M(y.avgExpense)],
    [B('Plătit pe abonamente'), M(y.subscriptions)], [B('Datorii plătite'), M(y.debts.paid)], [B('Datorii rămase'), M(y.debts.remaining)],
    [B('Investiții depuse în an'), M(y.investments.deposited)], [B('Valoare portofoliu – început'), M(y.investments.valueStart)],
    [B('Valoare portofoliu – final'), M(y.investments.valueEnd)],
    [B('Avere netă fără investiții'), M(y.networth.without)], [B('Avere netă cu investiții'), M(y.networth.with)], [],
    H('Luna', 'Venituri', 'Cheltuieli', 'Rămas'),
    ...y.months.map(x => [monthLabel(x.m), M(x.income), M(x.expense), M(x.left)]), [],
    H('Categorie', 'Cheltuieli', 'Procent'),
    ...y.categories.map(c => [catById(c.id) ? catName(catById(c.id)) : c.label, M(c.value), P(y.expense ? c.value / y.expense : 0)]),
  ];
  const blob = buildXlsx([{ name: `${tr('Raport')} ${y.year}`, cols: [32, 16, 16, 16], rows }]);
  return deliverFile(blob, `${tr('raport')}_${y.year}.xlsx`);
}

export function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  return deliverFile(blob, `${tr('finante')}_backup_${today()}.json`);
}
