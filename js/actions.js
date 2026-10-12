// Modificări ale datelor care țin legăturile în ordine
// (tranzacție ↔ contribuție la investiții, tranzacție ↔ plată datorie).

import { state, uid, commit, save, catByName } from './store.js';
import { today, addMonthsDate } from './dates.js';
import { t as tr } from './i18n.js';
import { round2, convert, brokerOfAsset, FREQ, ensureSnapshots, ensureReports, bucketBalance } from './calc.js';

const base = () => state.settings.currency;
const assetById = id => state.assets.find(a => a.id === id);

// Cât e strâns acum în fiecare goal, ca să vedem după o modificare dacă vreunul și-a atins ținta.
export const goalSnapshot = () => new Map(state.goals.map(g => [g.id, bucketBalance('g:' + g.id)]));
export const goalsReached = before => state.goals.filter(g =>
  !g.done && g.target > 0 && (before.get(g.id) ?? 0) < g.target && bucketBalance('g:' + g.id) >= g.target);

// Întoarce goal-urile care și-au atins ținta prin această tranzacție.
export function saveTx(tx) {
  const before = goalSnapshot();
  tx.amount = round2(tx.amount);
  if (!tx.id) {
    tx.id = uid();
    state.transactions.push(tx);
  } else {
    const i = state.transactions.findIndex(t => t.id === tx.id);
    if (i >= 0) state.transactions[i] = tx; else state.transactions.push(tx);
  }

  // Transfer către investiții cu activ ales = contribuție la acel activ.
  const linked = state.contributions.find(c => c.txId === tx.id);
  const asset = tx.type === 'transfer' && tx.toAccountId === 'investitii' && tx.assetId ? assetById(tx.assetId) : null;
  if (asset) {
    const amount = round2(convert(tx.amount, base(), brokerOfAsset(asset)?.currency || base()));
    if (linked) Object.assign(linked, { assetId: asset.id, date: tx.date, amount });
    else state.contributions.push({ id: uid(), assetId: asset.id, date: tx.date, amount, txId: tx.id });
  } else if (linked) {
    state.contributions = state.contributions.filter(c => c !== linked);
  }

  const pay = state.debtPayments.find(p => p.txId === tx.id);
  if (pay) {
    if (tx.type === 'cheltuiala') Object.assign(pay, { amount: tx.amount, date: tx.date });
    else state.debtPayments = state.debtPayments.filter(p => p !== pay);
  }
  commit();
  return goalsReached(before);
}

export function deleteTx(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  state.contributions = state.contributions.filter(c => c.txId !== id);
  state.debtPayments = state.debtPayments.filter(p => p.txId !== id);
  commit();
}

export function saveContribution(c, fromCurrent) {
  const asset = assetById(c.assetId);
  const baseAmount = round2(convert(c.amount, brokerOfAsset(asset)?.currency || base(), base()));
  if (!c.id) { c.id = uid(); state.contributions.push(c); }
  else { const i = state.contributions.findIndex(x => x.id === c.id); state.contributions[i] = c; }
  const tx = c.txId && state.transactions.find(t => t.id === c.txId);
  if (tx) Object.assign(tx, { amount: baseAmount, date: c.date, assetId: c.assetId });
  else if (fromCurrent) {
    const t = { id: uid(), type: 'transfer', date: c.date, amount: baseAmount, accountId: 'curent', toAccountId: 'investitii', assetId: c.assetId, note: tr('Contribuție {name}', { name: asset?.name || '' }).trim() };
    state.transactions.push(t);
    c.txId = t.id;
  }
  commit();
}

export function deleteContribution(id) {
  const c = state.contributions.find(x => x.id === id);
  state.contributions = state.contributions.filter(x => x.id !== id);
  if (c?.txId) state.transactions = state.transactions.filter(t => t.id !== c.txId);
  commit();
}

export function saveDebtPayment(p, asExpense, categoryId) {
  const debt = state.debts.find(d => d.id === p.debtId);
  if (!p.id) { p.id = uid(); state.debtPayments.push(p); }
  else { const i = state.debtPayments.findIndex(x => x.id === p.id); state.debtPayments[i] = p; }
  const tx = p.txId && state.transactions.find(t => t.id === p.txId);
  if (tx) Object.assign(tx, { amount: p.amount, date: p.date });
  else if (asExpense) {
    const t = { id: uid(), type: 'cheltuiala', date: p.date, amount: p.amount, accountId: 'curent', categoryId, note: tr('Plată {name}', { name: debt?.creditor || tr('datorie') }), debtId: p.debtId };
    state.transactions.push(t);
    p.txId = t.id;
  }
  commit();
}

export function deleteDebtPayment(id) {
  const p = state.debtPayments.find(x => x.id === id);
  state.debtPayments = state.debtPayments.filter(x => x.id !== id);
  if (p?.txId) state.transactions = state.transactions.filter(t => t.id !== p.txId);
  commit();
}

export function deleteDebt(id) {
  state.debts = state.debts.filter(d => d.id !== id);
  state.debtPayments = state.debtPayments.filter(p => p.debtId !== id);
  for (const t of state.transactions) if (t.debtId === id) delete t.debtId;
  commit();
}

// Banii strânși într-un goal șters rămân în Economii, la „alte economii”.
export function deleteGoal(id) {
  const g = state.goals.find(x => x.id === id);
  if (!g) return;
  state.settings.opening.economii = round2((state.settings.opening.economii || 0) + (g.initial || 0));
  const b = 'g:' + id;
  for (const t of state.transactions) {
    if (t.toBucket === b) t.toBucket = '';
    if (t.fromBucket === b) t.fromBucket = '';
  }
  state.goals = state.goals.filter(x => x.id !== id);
  commit();
}

// Transferurile făcute rămân în istoric; doar legătura cu activul dispare.
function unlinkAssets(ids) {
  state.contributions = state.contributions.filter(c => !ids.includes(c.assetId));
  state.assetValues = state.assetValues.filter(v => !ids.includes(v.assetId));
  for (const t of state.transactions) if (ids.includes(t.assetId)) delete t.assetId;
}

export function deleteAsset(id) {
  unlinkAssets([id]);
  state.assets = state.assets.filter(a => a.id !== id);
  commit();
}

export function deleteBroker(id) {
  const ids = state.assets.filter(a => a.brokerId === id).map(a => a.id);
  unlinkAssets(ids);
  state.assets = state.assets.filter(a => a.brokerId !== id);
  state.brokers = state.brokers.filter(b => b.id !== id);
  commit();
}

export function deleteCategory(id) {
  state.categories = state.categories.filter(c => c.id !== id);
  for (const t of state.transactions) if (t.categoryId === id) t.categoryId = null;
  for (const s of state.subscriptions) if (s.categoryId === id) s.categoryId = null;
  commit();
}

// La pornire / revenire în aplicație: plăți automate de abonamente, snapshot-uri, rapoarte.
export function runAutomations() {
  let changed = false;
  const t = today();
  for (const sub of state.subscriptions) {
    if (!sub.autoRecord || !sub.nextPayment) continue;
    let guard = 0;
    while (sub.nextPayment <= t && guard++ < 120) {
      state.transactions.push({
        id: uid(), type: 'cheltuiala', date: sub.nextPayment, amount: sub.amount, accountId: 'curent',
        categoryId: sub.categoryId || catByName('Abonamente', 'cheltuiala')?.id || null, note: sub.name, subscriptionId: sub.id,
      });
      sub.nextPayment = addMonthsDate(sub.nextPayment, FREQ[sub.frequency] || 1, sub.anchorDay);
      changed = true;
    }
  }
  if (ensureSnapshots()) changed = true;
  if (ensureReports()) changed = true;
  if (changed) save();
  return changed;
}
