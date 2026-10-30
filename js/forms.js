// Formulare comune (bottom sheets): tranzacție, mutare bani în goal / fond, goal, export.

import { state, uid, commit, save, catById, ACCOUNTS, PALETTE, accountName, modOn } from './store.js';
import { today, monthLabel, fmtDate } from './dates.js';
import { money, moneyRound, moneyShort, parseAmount, plural, forInput, CURRENCIES } from './fmt.js';
import { budgetStats, round2, convert, bucketBalance, bucketOptions, bucketName, bucketCurrency, bucketIn, bucketOut, goalStats, brokerOfAsset, tripForDate, accountBalance } from './calc.js';
import {
  h, openSheet, toast, confirmDialog, btn, field, amountInput, textInput, dateInput, selectInput, segmented,
  invalid, catIcon, emojiPicker, colorPicker, progress,
} from './ui.js';
import { saveTx, deleteGoal, goalSnapshot, goalsReached, convertBucketHistory } from './actions.js';
import { confetti } from './confetti.js';
import { txRow, confirmDeleteTx } from './components.js';
import { exportAll } from './exporter.js';
import { t as tr, catName } from './i18n.js';

// Confetti + mesaj când un goal își atinge ținta.
function celebrate(goals) {
  if (!goals.length) return;
  confetti();
  toast(tr('Felicitări! Ai atins ținta pentru {name} 🎉', { name: goals.map(g => g.name).join(', ') }));
}

const TYPES = () => [{ value: 'venit', label: tr('Venit') }, { value: 'cheltuiala', label: tr('Cheltuială') }, { value: 'transfer', label: tr('Transfer') }];

/* ---------- Tranzacție ---------- */

export function openTxForm(existing, preset = {}) {
  const isEdit = !!existing;
  const tx = isEdit ? { ...existing } : { type: 'cheltuiala', date: today(), accountId: 'curent', ...preset };
  if (tx.type === 'transfer' && !tx.toAccountId) tx.toAccountId = tx.accountId === 'curent' ? 'economii' : 'curent';

  const base = state.settings.currency;
  // Cheltuielile și veniturile pot fi introduse în euro sau dolari; în lei se salvează convertite cu cursul din Setări.
  let txCur = tx.type !== 'transfer' && tx.origCurrency ? tx.origCurrency : base;
  const amount = amountInput(txCur !== base ? tx.origAmount : tx.amount, { 'aria-label': tr('Sumă'), enterkeyhint: 'done' });
  const fxHint = h('span', { class: 'fx-hint' });
  const paintFx = () => {
    const v = parseAmount(amount.value);
    fxHint.textContent = txCur === base ? ''
      : v > 0 ? tr('≈ {sum} la cursul din Setări', { sum: money(convert(v, txCur, base), { show: true }) })
        : tr('1 {cur} = {rate} lei', { cur: txCur, rate: forInput(state.settings.rates[txCur]) });
  };
  const curRow = h('div', { class: 'cur-row' },
    segmented(Object.keys(CURRENCIES).map(c => ({ value: c, label: c === 'RON' ? 'lei' : CURRENCIES[c] })), txCur, v => { txCur = v; paintFx(); }, 'seg-sm'),
    fxHint);
  curRow.hidden = tx.type === 'transfer';
  amount.addEventListener('input', paintFx);
  paintFx();
  const date = dateInput(tx.date);
  const note = textInput(tx.note, { placeholder: tr('Opțional'), maxlength: 140, enterkeyhint: 'done' });
  const dyn = h('div');
  // Călătoria: aleasă singură după dată (cât timp n-o alegi tu); se poate lega și o cheltuială din afara perioadei (ex. biletul de avion).
  let tripId = isEdit ? tx.tripId || '' : tripForDate(tx.date)?.id || '', tripTouched = isEdit;
  const tripBox = h('div');
  const paintTrip = () => {
    const trips = state.trips.filter(x => x.status !== 'done' || x.id === tripId);
    if (tx.type !== 'cheltuiala' || !trips.length) { tripBox.replaceChildren(); return; }
    const sel = selectInput([{ value: '', label: tr('— Nu ține de o călătorie —') }, ...trips.map(x => ({ value: x.id, label: `${x.icon || '✈️'} ${x.name}` }))], tripId);
    sel.addEventListener('change', () => { tripId = sel.value; tripTouched = true; });
    tripBox.replaceChildren(field(tr('Călătorie'), sel));
  };
  date.addEventListener('change', () => { if (!tripTouched) { tripId = tripForDate(date.value)?.id || ''; paintTrip(); } });

  const typeSeg = segmented(TYPES(), tx.type, v => {
    tx.type = v;
    curRow.hidden = v === 'transfer';
    if (v === 'transfer') {
      if (!tx.toAccountId || tx.toAccountId === tx.accountId) tx.toAccountId = tx.accountId === 'curent' ? 'economii' : 'curent';
    } else {
      if (tx.accountId === 'investitii') tx.accountId = 'curent';
      if (catById(tx.categoryId)?.type !== v) tx.categoryId = null;
    }
    paint();
    paintTrip();
  });

  function paint() {
    if (tx.type !== 'transfer') {
      const grid = h('div', { class: 'cat-grid' }, state.categories.filter(c => c.type === tx.type).map(c =>
        h('button', {
          type: 'button', class: 'cat-btn' + (c.id === tx.categoryId ? ' on' : ''),
          onclick: e => { tx.categoryId = c.id; grid.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('on', b === e.currentTarget)); },
        }, catIcon(c, 42), h('span', {}, catName(c)))));
      dyn.replaceChildren(
        field(tr('Categorie'), grid),
        field(tr('Cont'), segmented([{ value: 'curent', label: accountName('curent') }, { value: 'economii', label: accountName('economii') }],
          tx.accountId === 'economii' ? 'economii' : 'curent', v => { tx.accountId = v; })));
      return;
    }
    const opts = ACCOUNTS.map(a => ({ value: a.id, label: accountName(a.id) }));
    const from = selectInput(opts, tx.accountId), to = selectInput(opts, tx.toAccountId);
    from.addEventListener('change', () => { tx.accountId = from.value; paint(); });
    to.addEventListener('change', () => { tx.toAccountId = to.value; paint(); });
    const rows = [h('div', { class: 'two' }, field(tr('Din contul'), from), field(tr('În contul'), to))];
    if (tx.accountId === 'economii') {
      const sel = selectInput(bucketOptions(tx.fromBucket), tx.fromBucket || '');
      sel.addEventListener('change', () => { tx.fromBucket = sel.value; });
      rows.push(field(tr('Din economii'), sel));
    }
    if (tx.toAccountId === 'economii') {
      const sel = selectInput(bucketOptions(tx.toBucket), tx.toBucket || '');
      sel.addEventListener('change', () => { tx.toBucket = sel.value; });
      rows.push(field(tr('Pune în'), sel));
    }
    if (tx.toAccountId === 'investitii' && state.assets.length) {
      const sel = selectInput([{ value: '', label: tr('— Niciun activ —') }, ...state.assets.map(a => ({ value: a.id, label: `${a.name} · ${brokerOfAsset(a)?.name || ''}` }))], tx.assetId || '');
      sel.addEventListener('change', () => { tx.assetId = sel.value; });
      rows.push(field(tr('Contribuție la activul'), sel, tr('Se adaugă automat la contribuțiile activului.')));
    }
    const foreign = [tx.accountId === 'economii' && (tx.fromBucket || ''), tx.toAccountId === 'economii' && (tx.toBucket || '')]
      .filter(b => b !== false).map(bucketCurrency).find(c => c !== state.settings.currency);
    if (foreign) rows.push(h('p', { class: 'hint' }, tr('Suma e în {base}; pentru compartimentul în {cur} se convertește cu cursul din Setări.', { base: state.settings.currency, cur: foreign })));
    rows.push(h('p', { class: 'hint' }, tr('Transferurile nu apar la cheltuieli.')));
    dyn.replaceChildren(...rows);
  }
  paint();
  paintTrip();

  function submit() {
    const amt = parseAmount(amount.value);
    if (!(amt > 0)) return invalid(amount, tr('Introdu o sumă mai mare ca 0'));
    if (!date.value) return invalid(date, tr('Alege data'));
    const out = { id: tx.id, type: tx.type, amount: round2(amt), date: date.value, note: note.value.trim() };
    if (tx.subscriptionId) out.subscriptionId = tx.subscriptionId;
    if (tx.debtId) out.debtId = tx.debtId;
    if (tx.type === 'transfer') {
      const sameBucket = (tx.fromBucket || '') === (tx.toBucket || '');
      if (tx.accountId === tx.toAccountId && !(tx.accountId === 'economii' && !sameBucket)) return toast(tr('Alege conturi diferite'));
      Object.assign(out, { accountId: tx.accountId, toAccountId: tx.toAccountId });
      const base = state.settings.currency;
      // Suma în moneda compartimentului: o păstrăm dacă nu s-au schimbat suma și compartimentul, altfel o convertim.
      const bucketAmt = (side, bucket) => {
        const cur = bucketCurrency(bucket);
        if (cur === base) return undefined;
        const same = isEdit && existing.amount === out.amount && (existing[side + 'Bucket'] || '') === bucket && existing[side + 'Amount'] != null;
        return same ? existing[side + 'Amount'] : round2(convert(out.amount, base, cur));
      };
      if (tx.accountId === 'economii') { out.fromBucket = tx.fromBucket || ''; const v = bucketAmt('from', out.fromBucket); if (v != null) out.fromAmount = v; }
      if (tx.toAccountId === 'economii') { out.toBucket = tx.toBucket || ''; const v = bucketAmt('to', out.toBucket); if (v != null) out.toAmount = v; }
      if (out.toBucket?.startsWith('g:')) {
        const prev = isEdit && (existing.toBucket || '') === out.toBucket ? (existing.toAmount ?? existing.amount) : 0;
        const room = goalRoom(out.toBucket, prev), put = out.toAmount ?? out.amount;
        if (room != null && put > room + 0.001) return invalid(amount, roomMsg(room, bucketCurrency(out.toBucket)));
      }
      if (tx.toAccountId === 'investitii' && tx.assetId) out.assetId = tx.assetId;
    } else {
      if (!tx.categoryId) return toast(tr('Alege o categorie'));
      out.categoryId = tx.categoryId;
      out.accountId = tx.accountId === 'economii' ? 'economii' : 'curent';
      if (tx.type === 'cheltuiala' && tripId && state.trips.some(x => x.id === tripId)) out.tripId = tripId;
      if (txCur !== base) {
        // Păstrăm conversia veche dacă suma și moneda nu s-au schimbat (cursul din Setări poate fi între timp altul).
        const same = isEdit && existing.origCurrency === txCur && existing.origAmount === out.amount;
        out.origAmount = out.amount;
        out.origCurrency = txCur;
        out.amount = same ? existing.amount : round2(convert(out.amount, txCur, base));
      }
    }
    const reached = saveTx(out);
    sh.close();
    // Cheltuială pe o categorie cu buget: toast-ul arată cât s-a folosit din limită.
    const bud = out.type === 'cheltuiala' && modOn('bugete') ? budgetStats(out.date.slice(0, 7)).find(b => b.id === out.categoryId) : null;
    if (bud) toast(tr('{cat}: {a} din {b}', { cat: catName(bud.cat), a: moneyShort(bud.spent), b: moneyRound(bud.limit) }), { warn: bud.pct >= 0.85 });
    else toast(isEdit ? tr('Tranzacție actualizată') : tr('Tranzacție adăugată'));
    celebrate(reached);
  }
  amount.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

  const sh = openSheet({
    title: isEdit ? tr('Editează tranzacția') : tr('Tranzacție nouă'),
    body: h('div', {}, typeSeg, field(tr('Sumă'), amount), curRow, dyn, h('div', { class: 'two' }, field(tr('Data'), date), field(tr('Notă'), note)), tripBox),
    footer: h('div', { class: 'btn-row' },
      isEdit ? btn(tr('Șterge'), () => confirmDeleteTx(existing, () => sh.close()), 'ghost danger-text') : null,
      btn(isEdit ? tr('Salvează') : tr('Adaugă'), submit)),
  });
  if (!isEdit) amount.focus({ preventScroll: true });
}

// Tranzacțiile unei categorii dintr-o lună (folosită și în panoul unui buget).
export function categoryTxList(catId, m, type = 'cheltuiala') {
  const txs = state.transactions.filter(t => t.type === type && (t.categoryId || '') === (catId || '') && t.date.startsWith(m))
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = txs.reduce((a, t) => a + t.amount, 0);
  return h('div', {},
    h('p', { class: 'muted' }, `${monthLabel(m)} · ${plural(txs.length, tr('tranzacție'), tr('tranzacții'))} · ${money(total)}`),
    txs.length ? h('div', { class: 'list' }, txs.map(t => txRow(t, { showDate: true }))) : null);
}

// Tap pe o categorie din legenda graficului: tranzacțiile ei din lună.
export function openCategoryTxSheet(catId, m, type = 'cheltuiala') {
  openSheet({ title: catName(catById(catId)), body: categoryTxList(catId, m, type) });
}

/* ---------- Bani în / din goal sau fond de urgență ---------- */

// Cât mai încape într-un obiectiv (în moneda lui): ținta minus ce e deja strâns. `minus` = suma veche a
// tranzacției editate, ca să nu se numere de două ori. null = nu e obiectiv (fondurile n-au limită).
function goalRoom(bucket, minus = 0) {
  if (!bucket || !bucket.startsWith('g:')) return null;
  const g = state.goals.find(x => 'g:' + x.id === bucket);
  if (!g) return null;
  return Math.max(0, round2(g.target - (bucketBalance(bucket) - minus)));
}
const roomMsg = (room, cur) => (room > 0 ? tr('Obiectivului îi mai lipsesc doar {sum}', { sum: money(room, { cur, show: true }) }) : tr('Obiectivul e deja atins'));

// Bani pe care îi aveai deja, adăugați fără tranzacție: cresc suma de pornire a compartimentului (în moneda lui).
function addOwned(bucket, amt) {
  const add = (o, k) => { o[k] = round2((o[k] || 0) + amt); };
  if (bucket.startsWith('g:')) add(state.goals.find(g => 'g:' + g.id === bucket), 'initial');
  else if (bucket.startsWith('f:')) add(state.funds.find(f => 'f:' + f.id === bucket), 'initial');
  else if (bucket === 'urgenta') add(state.emergency, 'initial');
  else add(state.settings.opening, 'economii');
}

export function openBucketMove({ bucket, dir, existing }) {
  const isEdit = !!existing;
  const label = bucketName(bucket);
  const base = state.settings.currency, cur = bucketCurrency(bucket);
  const prevAmt = existing ? (dir === 'in' ? bucketIn(existing) : bucketOut(existing)) : null;
  // Suma se poate scrie în orice monedă (ex. euro pentru o călătorie în lei); se convertește cu cursul din Setări.
  let entryCur = cur;
  const amount = amountInput(prevAmt);
  // Echivalentul în moneda implicită (calculat, dar se poate corecta dacă banca a folosit alt curs).
  const baseAmt = amountInput(existing && cur !== base ? existing.amount : '');
  const baseField = field(tr('Echivalent în {cur}', { cur: base }), baseAmt, tr('Calculat cu cursul din Setări; îl poți corecta dacă banca a folosit alt curs.'));
  let baseEdited = isEdit, useMax = false;
  const paintBase = () => {
    baseField.hidden = (entryCur === base && cur === base) || other.value === 'extern';
    if (baseEdited) return;
    const v = parseAmount(amount.value);
    baseAmt.value = !(v > 0) ? '' : forInput(entryCur === base ? v : round2(convert(v, entryCur, base)));
  };
  amount.addEventListener('input', () => { useMax = false; paintBase(); });
  baseAmt.addEventListener('input', () => { baseEdited = true; useMax = false; });
  const curSeg = segmented(Object.keys(CURRENCIES).map(c => ({ value: c, label: c === 'RON' ? 'lei' : CURRENCIES[c] })), entryCur, v => {
    const n = parseAmount(amount.value);
    if (n > 0) amount.value = forInput(round2(convert(n, entryCur, v)));
    entryCur = v; baseEdited = false;
    paintBase(); paintMax();
  }, 'seg-sm');

  const date = dateInput(existing?.date || today());
  const isTrip = bucket.startsWith('g:') && state.goals.find(g => 'g:' + g.id === bucket)?.tripId;
  const defaultNote = isTrip ? tr('Călătorie: {name}', { name: label }) : bucket.startsWith('g:') ? tr('Goal: {name}', { name: label }) : label;
  const note = textInput(existing?.note ?? defaultNote, { maxlength: 140 });
  // De unde vin / unde merg banii: contul Curent sau orice alt loc din Economii (alte economii, fond de urgență,
  // fonduri, obiective, călătorii). Valorile: 'curent' sau 'sav:<compartiment>'.
  const prevOther = !existing ? 'curent'
    : dir === 'in' ? (existing.accountId === 'economii' ? 'sav:' + (existing.fromBucket || '') : 'curent')
      : (existing.toAccountId === 'economii' ? 'sav:' + (existing.toBucket || '') : 'curent');
  // „Fără transfer”: bani pe care îi aveai deja în afara aplicației (ex. cash) intră direct în sold, fără tranzacție.
  const otherOpts = [{ value: 'curent', label: tr('Cont Curent') },
    ...(dir === 'in' && !isEdit ? [{ value: 'extern', label: tr('Fără transfer (bani din afara aplicației)') }] : []),
    ...bucketOptions(prevOther.startsWith('sav:') ? prevOther.slice(4) : null).filter(o => o.value !== bucket).map(o => ({ value: 'sav:' + o.value, label: o.label }))];
  const other = selectInput(otherOpts, prevOther);
  other.addEventListener('change', () => { useMax = false; paintMax(); paintBase(); paintMode(); });
  const sel = () => { const sav = other.value.startsWith('sav:'); return { sav, ob: sav ? other.value.slice(4) : null, extern: other.value === 'extern' }; };
  const ownRoom = () => goalRoom(bucket, isEdit ? prevAmt : 0);
  const destRoom = ob => goalRoom(ob, isEdit && (existing.toBucket || '') === ob ? bucketIn(existing) : 0);

  // Cât se poate muta acum, în moneda compartimentului: ce e în sursă și cât mai încape în destinație (dacă e un obiectiv).
  // Limitele, fiecare în moneda ei: [sumă, monedă].
  function limits() {
    const { sav, ob, extern } = sel(), out = [];
    if (dir === 'in') {
      if (extern) { /* nu vine din niciun cont: limita e doar cât mai încape */ } else if (sav) {
        const prevOut = isEdit && existing.accountId === 'economii' && (existing.fromBucket || '') === ob ? bucketOut(existing) : 0;
        out.push([bucketBalance(ob) + prevOut, bucketCurrency(ob)]);
      } else out.push([accountBalance('curent') + (isEdit && existing.accountId === 'curent' ? existing.amount : 0), base]);
      const room = ownRoom();
      if (room != null) out.push([room, cur]);
    } else {
      out.push([bucketBalance(bucket) + (isEdit ? prevAmt : 0), cur]);
      const r = ob?.startsWith('g:') ? destRoom(ob) : null;
      if (r != null) out.push([r, bucketCurrency(ob)]);
    }
    return out;
  }
  // Maximul într-o monedă: fiecare limită se convertește direct din moneda ei (fără drum dus-întors, deci fără bani pierduți la rotunjire).
  const maxIn = c => { const l = limits(); return l.length ? Math.max(0, round2(Math.min(...l.map(([a, lc]) => (lc === c ? a : convert(a, lc, c)))))) : Infinity; };
  const maxMove = () => maxIn(cur);
  const maxHint = h('div', { class: 'max-hint' });
  function paintMax() {
    const mx = maxMove(), inEntry = maxIn(entryCur);
    if (mx === Infinity) { maxHint.replaceChildren(); return; } // fără limită (bani din afara aplicației, într-un fond)
    if (!(mx > 0)) {
      maxHint.replaceChildren(h('span', {}, dir === 'in' && ownRoom() === 0 ? tr('Obiectivul e deja atins') : tr('Nu sunt bani de mutat de aici')));
      return;
    }
    maxHint.replaceChildren(
      h('span', {}, (o => (sel().extern ? tr('Poți adăuga maxim {sum}', o) : tr('Poți muta maxim {sum}', o)))({ sum: money(inEntry, { cur: entryCur, show: true }) }),
        entryCur !== cur ? ` (${money(mx, { cur, show: true })})` : ''),
      h('button', { type: 'button', class: 'max-btn', onclick: () => { amount.value = forInput(inEntry); baseEdited = false; paintBase(); useMax = true; } }, tr('Max')));
  }

  function submit() {
    const v = parseAmount(amount.value);
    if (!(v > 0)) return invalid(amount, tr('Introdu o sumă mai mare ca 0'));
    // suma în moneda implicită și în moneda compartimentului
    let baseValue = entryCur === base ? v : convert(v, entryCur, base);
    if (!baseField.hidden && baseAmt.value.trim()) baseValue = parseAmount(baseAmt.value);
    if (!(baseValue > 0)) return invalid(baseAmt, tr('Introdu o sumă mai mare ca 0'));
    let amt = entryCur === cur ? v : cur === base ? baseValue : convert(baseValue, base, cur);
    const mx = maxMove(), { sav, ob } = sel();
    if (useMax) amt = mx; // „Max” = exact cât se poate, fără diferențe de rotunjire la conversie
    if (amt > mx + 0.005) {
      // spunem de ce nu se poate: destinația e aproape plină sau sursa n-are destui bani
      const r = dir === 'in' ? ownRoom() : ob?.startsWith('g:') ? destRoom(ob) : null;
      const rCur = dir === 'in' ? cur : bucketCurrency(ob);
      if (r != null && convert(r, rCur, cur) <= mx + 0.005) return invalid(amount, roomMsg(r, rCur));
      if (dir === 'out') return invalid(amount, tr('Poți retrage cel mult {sum}', { sum: money(mx, { cur }) }));
      if (sav) return invalid(amount, tr('În {name} sunt doar {sum}', { name: bucketName(ob), sum: money(round2(convert(mx, cur, bucketCurrency(ob))), { cur: bucketCurrency(ob), show: true }) }));
      return invalid(amount, tr('Poți muta maxim {sum}', { sum: money(mx, { cur, show: true }) }));
    }
    amt = round2(amt);
    if (sel().extern) {
      const before = goalSnapshot();
      addOwned(bucket, amt);
      commit();
      sh.close();
      toast(tr('Bani adăugați în {name}', { name: label }));
      celebrate(goalsReached(before));
      return;
    }
    if (useMax && !baseEdited) baseValue = entryCur === base ? v : cur === base ? amt : round2(convert(amt, cur, base));
    // celălalt compartiment poate fi în altă monedă: suma lui se convertește din suma în moneda implicită
    const obCur = sav ? bucketCurrency(ob) : base;
    const obAmt = obCur === base ? null : obCur === cur ? amt : round2(convert(baseValue, base, obCur));
    const tx = { id: existing?.id, type: 'transfer', amount: round2(baseValue), date: date.value || today(), note: note.value.trim() };
    if (dir === 'in') Object.assign(tx, { accountId: sav ? 'economii' : 'curent', toAccountId: 'economii', toBucket: bucket },
      sav ? { fromBucket: ob } : {}, obAmt != null ? { fromAmount: obAmt } : {}, cur !== base ? { toAmount: amt } : {});
    else Object.assign(tx, { accountId: 'economii', fromBucket: bucket, toAccountId: sav ? 'economii' : 'curent' },
      sav ? { toBucket: ob } : {}, obAmt != null ? { toAmount: obAmt } : {}, cur !== base ? { fromAmount: amt } : {});
    const reached = saveTx(tx);
    sh.close();
    toast(dir === 'in' ? tr('Bani adăugați în {name}', { name: label }) : tr('Bani retrași din {name}', { name: label }));
    celebrate(reached);
  }

  const dateNote = h('div', { class: 'two' }, field(tr('Data'), date), field(tr('Notă'), note));
  const modeHint = h('p', { class: 'hint' });
  function paintMode() {
    const extern = other.value === 'extern';
    dateNote.hidden = extern;
    modeHint.textContent = extern ? tr('Suma se adaugă direct în sold: nu apare în tranzacții și nu scade din niciun cont.')
      : tr('Se înregistrează ca transfer, nu ca cheltuială.');
  }
  paintBase(); paintMax(); paintMode();
  const sh = openSheet({
    title: `${dir === 'in' ? tr('Adaugă bani') : tr('Retrage bani')} · ${label}`,
    body: h('div', {},
      field(dir === 'in' ? tr('Din') : tr('Către'), other),
      field(tr('Sumă'), amount),
      h('div', { class: 'cur-row' }, curSeg),
      maxHint,
      baseField,
      dateNote,
      modeHint),
    footer: btn(dir === 'in' ? tr('Adaugă') : tr('Retrage'), submit),
  });
  if (!isEdit) amount.focus({ preventScroll: true });
}

/* ---------- Goal-uri ---------- */

export function currencySeg(value, onChange) {
  return segmented(Object.keys(CURRENCIES).map(c => ({ value: c, label: c })), value, onChange);
}

const GOAL_EMOJIS = ['🎯', '✈️', '🏖️', '🚗', '🏠', '💻', '📱', '💍', '🎓', '🛋️', '🚲', '🎸', '🐶', '👶', '🏥', '💰'];

// onCreated(goal): apelat după ce un obiectiv nou a fost salvat (ex. o dorință mutată la obiective).
export function openGoalForm(existing, prefill = null, onCreated = null) {
  const g = existing ? { ...existing } : { icon: '🎯', color: PALETTE[state.goals.length % PALETTE.length], ...prefill };
  const oldCur = g.currency || state.settings.currency;
  let cur = oldCur;
  const name = textInput(g.name, { placeholder: tr('ex. Vacanță'), maxlength: 40 });
  const target = amountInput(g.target);
  const initial = amountInput(g.initial || '');
  const deadline = dateInput(g.deadline);
  // La schimbarea monedei, sumele din formular se convertesc pe loc, ca să vezi noile valori.
  const curSeg = currencySeg(cur, v => {
    for (const inp of [target, initial]) {
      const n = parseAmount(inp.value);
      if (n > 0) inp.value = forInput(round2(convert(n, cur, v)));
    }
    cur = v;
  });

  function submit() {
    if (!name.value.trim()) return invalid(name, tr('Scrie un nume'));
    const t = parseAmount(target.value);
    if (!(t > 0)) return invalid(target, tr('Ținta trebuie să fie mai mare ca 0'));
    const init = initial.value.trim() ? parseAmount(initial.value) : 0;
    if (!(init >= 0)) return invalid(initial, tr('Suma trebuie să fie pozitivă'));
    const out = { ...g, name: name.value.trim(), target: round2(t), initial: round2(init), deadline: deadline.value || null, currency: cur };
    const before = goalSnapshot();
    if (existing) convertBucketHistory('g:' + g.id, oldCur, cur);
    if (existing) state.goals[state.goals.findIndex(x => x.id === g.id)] = out;
    const created = existing ? null : { ...out, id: uid(), done: false, createdAt: today() };
    if (created) state.goals.push(created);
    onCreated?.(created);
    commit();
    sh.close();
    toast(existing ? tr('Goal actualizat') : tr('Goal creat'));
    if (existing) celebrate(goalsReached(before));
  }

  const sh = openSheet({
    title: existing ? tr('Editează goal-ul') : tr('Goal nou'),
    body: h('div', {},
      field(tr('Nume'), name),
      field(tr('Monedă'), curSeg, existing ? tr('La schimbarea monedei, sumele se convertesc cu cursul din Setări.') : null),
      h('div', { class: 'two' }, field(tr('Sumă țintă'), target), field(tr('Strâns deja'), initial)),
      field(tr('Termen limită (opțional)'), deadline),
      field(tr('Iconiță'), emojiPicker(GOAL_EMOJIS, g.icon, v => { g.icon = v; })),
      field(tr('Culoare'), colorPicker(PALETTE, g.color, v => { g.color = v; }))),
    footer: btn(existing ? tr('Salvează') : tr('Creează goal'), submit),
  });
  if (!existing) name.focus({ preventScroll: true });
}

export function openGoalActions(g) {
  const st = goalStats(g);
  const act = (fn) => () => { sh.close(); setTimeout(fn, 0); };
  // Notițele se salvează pe măsură ce scrii; lista se reîmprospătează la închidere.
  let notesChanged = false;
  const notes = h('textarea', {
    class: 'goal-notes', rows: 3, maxlength: 2000, placeholder: tr('Scrie aici idei, linkuri sau pași pentru acest goal'),
    oninput: () => { g.note = notes.value.trim(); notesChanged = true; },
    onchange: () => save(),
  });
  notes.value = g.note || '';
  const sh = openSheet({
    title: `${g.icon || '🎯'} ${g.name}`,
    onClose: () => { if (notesChanged) commit(); },
    body: h('div', {},
      h('div', { class: 'goal-sum' },
        h('strong', { class: 'big-sm' }, money(st.saved, { cur: st.cur })), h('span', { class: 'muted' }, ` ${tr('din')} ${money(g.target, { cur: st.cur })}`)),
      progress(st.pct, g.color),
      h('p', { class: 'muted' }, tr('{pct}% completat', { pct: Math.round(st.pct * 100) }) + (g.deadline ? ` · ${tr('termen {date}', { date: fmtDate(g.deadline) })}` : '')),
      field(tr('Notițe'), notes),
      h('div', { class: 'action-list' },
        btn(tr('Adaugă bani'), act(() => openBucketMove({ bucket: 'g:' + g.id, dir: 'in' })), 'primary'),
        st.saved > 0 ? btn(tr('Retrage bani'), act(() => openBucketMove({ bucket: 'g:' + g.id, dir: 'out' })), 'secondary') : null,
        btn(tr('Editează'), act(() => openGoalForm(g)), 'secondary'),
        btn(g.done ? tr('Reactivează') : tr('Marchează ca finalizat'), act(() => {
          g.done = !g.done;
          commit();
          toast(g.done ? tr('Felicitări! Goal finalizat 🎉') : tr('Goal reactivat'));
          if (g.done) confetti();
        }), 'secondary'),
        btn(tr('Șterge'), act(() => confirmDialog({
          title: tr('Ștergi goal-ul?'),
          message: st.saved > 0 ? tr('Banii strânși ({sum}) rămân în Economii, la „Alte economii”.', { sum: money(st.saved, { cur: st.cur }) }) : tr('Acțiunea nu poate fi anulată.'),
        }).then(ok => { if (ok) { deleteGoal(g.id); toast(tr('Goal șters')); } })), 'ghost danger-text'))),
  });
}

/* ---------- Ziua salariului ---------- */

export function openSalaryDay() {
  const st = state.settings;
  const day = h('input', { type: 'text', inputmode: 'numeric', value: st.salaryDay ? String(st.salaryDay) : '', placeholder: tr('ex. 10'), 'aria-label': tr('Ziua salariului') });
  const sh = openSheet({
    title: tr('Ziua salariului'),
    body: h('div', {},
      field(tr('În ce zi a lunii îți intră salariul?'), day,
        tr('Dacă pică sâmbătă sau duminică, se consideră vinerea dinainte. Salariul nu se adaugă automat; îl treci tu ca venit.')),
      h('p', { class: 'hint' }, tr('„Cât pot cheltui azi” împarte banii până în ziua dinaintea salariului.'))),
    footer: h('div', { class: 'btn-row' },
      st.salaryDay ? btn(tr('Fără zi de salariu'), () => { st.salaryDay = null; commit(); sh.close(); toast(tr('Se împarte până la final de lună')); }, 'ghost') : null,
      btn(tr('Salvează'), () => {
        const d = parseInt(day.value, 10);
        if (!(d >= 1 && d <= 31)) return invalid(day, tr('Ziua trebuie să fie între 1 și 31'));
        st.salaryDay = d;
        commit();
        sh.close();
        toast(tr('Ziua salariului salvată'));
      })),
  });
  day.focus({ preventScroll: true });
}

/* ---------- Export Excel ---------- */

export function openExportSheet() {
  let mode = 'all';
  const from = dateInput(''), to = dateInput(today());
  const range = h('div', { class: 'two', hidden: true }, field(tr('De la'), from), field(tr('Până la'), to));
  const sh = openSheet({
    title: tr('Exportă în Excel'),
    body: h('div', {},
      segmented([{ value: 'all', label: tr('Toate datele') }, { value: 'range', label: tr('O perioadă') }], mode, v => { mode = v; range.hidden = v !== 'range'; }),
      range,
      h('p', { class: 'hint' }, tr('Fișierul are foi separate pentru tranzacții, categorii, investiții, abonamente, goal-uri, fond de urgență, datorii, avere netă și rapoarte.'))),
    footer: btn(tr('Exportă'), async () => {
      if (mode === 'range' && from.value && to.value && from.value > to.value) return toast(tr('Data de început e după data de final'));
      const r = mode === 'range' ? { from: from.value || null, to: to.value || null } : {};
      sh.close();
      try {
        await exportAll(r);
        toast(tr('Fișier Excel generat'));
      } catch {
        toast(tr('Exportul nu a reușit'));
      }
    }),
  });
}
