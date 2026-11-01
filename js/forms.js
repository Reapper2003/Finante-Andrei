// Formulare comune (bottom sheets): tranzacție, mutare bani în goal / fond, goal, export.

import { state, uid, commit, save, catById, PALETTE, accountName, modOn } from './store.js';
import { today, monthLabel, fmtDate, dayLabel, addDays } from './dates.js';
import { money, moneyRound, moneyShort, parseAmount, plural, forInput, amountPlaceholder, CURRENCIES } from './fmt.js';
import { budgetStats, voucherBalance, voucherCat, txBucketAmt, round2, convert, bucketBalance, bucketOptions, bucketName, bucketCurrency, bucketIn, bucketOut, goalStats, brokerOfAsset, tripForDate, accountBalance } from './calc.js';
import {
  h, icon, openSheet, toast, confirmDialog, btn, field, amountInput, textInput, dateInput, selectInput, segmented,
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

const TYPES = () => [{ value: 'cheltuiala', label: tr('Cheltuială') }, { value: 'venit', label: tr('Venit') }, { value: 'transfer', label: tr('Transfer') }];

/* ---------- Tranzacție ---------- */

// Formularul se completează pe rânduri: suma sus, apoi Categorie → Cont → (Din / În ce economii) → Data → (Călătorie) → Notă.
// La o tranzacție nouă pașii se deschid pe rând (alegi, se închide, se deschide următorul); dacă atingi tu un rând,
// se deschide doar el și șirul se oprește. La transfer: Din → În → (Activul) → Data → Notă.
export function openTxForm(existing, preset = {}) {
  const isEdit = !!existing;
  const tx = isEdit ? { ...existing } : { type: 'cheltuiala', date: today(), accountId: 'curent', ...preset };
  if (tx.type === 'transfer' && !tx.toAccountId) tx.toAccountId = tx.accountId === 'curent' ? 'economii' : 'curent';
  // Cheltuielile / veniturile vechi din Economii n-aveau loc ales: sunt la „Alte economii”.
  if (tx.type !== 'transfer' && tx.accountId === 'economii' && tx.bucket == null && isEdit) tx.bucket = '';

  const base = state.settings.currency;
  // Cheltuielile și veniturile pot fi introduse în euro sau dolari; în lei se salvează convertite cu cursul din Setări.
  let txCur = tx.type !== 'transfer' && tx.origCurrency ? tx.origCurrency : base;
  const amount = amountInput(txCur !== base ? tx.origAmount : tx.amount, { 'aria-label': tr('Sumă'), enterkeyhint: 'done', placeholder: amountPlaceholder() });
  const fxHint = h('span', { class: 'tf-fx' });
  const paintFx = () => {
    const v = parseAmount(amount.value);
    fxHint.textContent = tx.type === 'transfer' || txCur === base ? ''
      : v > 0 ? tr('≈ {sum} la cursul din Setări', { sum: money(convert(v, txCur, base), { show: true }) })
        : tr('1 {cur} = {rate} lei', { cur: txCur, rate: forInput(state.settings.rates[txCur]) });
    fxHint.hidden = !fxHint.textContent;
  };
  // Moneda: un buton care deschide o listă sub el.
  const CUR_INFO = { RON: tr('Lei'), EUR: tr('Euro'), USD: tr('Dolari') };
  const curLabel = c => (c === 'RON' ? 'lei' : CURRENCIES[c]);
  const curBtn = h('button', { type: 'button', class: 'tf-cur', 'aria-haspopup': 'listbox' });
  const curMenu = h('div', { class: 'tf-cur-menu', role: 'listbox' });
  curMenu.hidden = true;
  const paintCur = () => {
    curBtn.textContent = `${curLabel(txCur)} ▾`;
    curBtn.hidden = tx.type === 'transfer';
    curMenu.replaceChildren(...Object.keys(CURRENCIES).map(c => h('button', {
      type: 'button', role: 'option', class: c === txCur ? 'on' : '', 'aria-selected': String(c === txCur),
      onclick: e => { e.stopPropagation(); txCur = c; curMenu.hidden = true; paintCur(); paintFx(); },
    }, h('span', { class: 'tf-sym' }, curLabel(c)),
      h('span', {}, h('b', {}, CUR_INFO[c]), h('small', {}, c === base ? `${c} · ${tr('moneda ta')}` : `${c} · 1 ${curLabel(c)} = ${forInput(state.settings.rates[c])} lei`)),
      h('span', { class: 'tf-ok' }, c === txCur ? '✓' : ''))));
  };
  curBtn.addEventListener('click', e => { e.stopPropagation(); curMenu.hidden = !curMenu.hidden; });
  amount.addEventListener('input', paintFx);
  const amountBox = h('div', { class: 'tf-amount' }, amount, h('span', { class: 'tf-cur-wrap' }, curBtn, curMenu));

  // Călătoria: aleasă singură după dată (cât timp n-o alegi tu); se poate lega și o cheltuială din afara perioadei (ex. biletul de avion).
  let tripId = isEdit ? tx.tripId || '' : tripForDate(tx.date)?.id || '', tripTouched = isEdit;
  const tripsOpen = () => state.trips.filter(x => x.status !== 'done' || x.id === tripId);
  // Călătoria e un pas doar la cheltuieli și doar dacă ai o călătorie planificată sau în curs.
  const hasTrip = () => tx.type === 'cheltuiala' && tripsOpen().length > 0;

  /* --- rândurile și pașii --- */
  let open = null, flow = !isEdit;
  const done = new Set();
  const withV = () => modOn('bonuri') && (tx.type === 'venit' || voucherCat(tx.categoryId) || tx.accountId === 'bonuri');
  // Locurile între care se poate face un transfer: Curent, fiecare loc din Economii, Investiții.
  const places = () => [{ acc: 'curent', bucket: null }, ...bucketOptions(tx.fromBucket ?? tx.toBucket).map(o => ({ acc: 'economii', bucket: o.value })), { acc: 'investitii', bucket: null }];
  const placeName = (acc, bucket) => (acc === 'economii' ? bucketName(bucket || '') : accountName(acc));
  const placeKey = (acc, bucket) => `${acc}|${acc === 'economii' ? bucket || '' : ''}`;
  const order = () => (tx.type === 'transfer'
    ? ['from', 'to', ...(tx.toAccountId === 'investitii' && state.assets.length ? ['asset'] : []), 'date', 'note']
    : ['cat', 'acc', ...(tx.accountId === 'economii' ? ['bucket'] : []), 'date', ...(hasTrip() ? ['trip'] : []), 'note']);
  if (isEdit) order().forEach(k => done.add(k));
  else open = tx.type === 'transfer' ? 'from' : 'cat';

  function stepDone(k) {
    done.add(k);
    if (flow) { const o = order(); open = o[o.indexOf(k) + 1] || null; if (!open) flow = false; } else open = null;
    paint();
  }
  // Lista de opțiuni mici (cont, dată): butoane pe un rând.
  const opts = (list, cur, onPick) => h('div', { class: 'tf-opts' }, list.map(([v, label]) => h('button', {
    type: 'button', class: v === cur ? 'on' : '', onclick: () => onPick(v),
  }, label)));
  // Lista de locuri (economii, transfer): rânduri cu sold și bifă.
  const placeList = (items, isOn, onPick) => h('div', { class: 'tf-places' }, items.map(it => h('button', {
    type: 'button', class: 'tf-place' + (isOn(it) ? ' on' : ''), onclick: () => onPick(it),
  }, h('span', { class: 'cat-ic neutral' }, icon(it.acc === 'economii' ? 'wallet' : it.acc === 'investitii' ? 'trend' : 'card', 18)),
    h('span', { class: 'tf-place-m' }, h('b', {}, placeName(it.acc, it.bucket)),
      h('small', {}, it.acc === 'economii' ? money(bucketBalance(it.bucket || ''), { cur: bucketCurrency(it.bucket || '') }) : money(accountBalance(it.acc)))),
    h('span', { class: 'tf-chk' }, isOn(it) ? '✓' : ''))));

  function rows() {
    const c = catById(tx.categoryId);
    const out = [];
    if (tx.type === 'transfer') {
      const all = places();
      out.push(['from', h('span', { class: 'cat-ic neutral' }, icon('upload', 18)), tr('Din'), placeName(tx.accountId, tx.fromBucket),
        () => placeList(all, it => placeKey(it.acc, it.bucket) === placeKey(tx.accountId, tx.fromBucket), it => {
          tx.accountId = it.acc; tx.fromBucket = it.acc === 'economii' ? it.bucket : undefined; stepDone('from');
        })]);
      out.push(['to', h('span', { class: 'cat-ic neutral' }, icon('download', 18)), tr('În'), placeName(tx.toAccountId, tx.toBucket),
        () => placeList(all.filter(it => placeKey(it.acc, it.bucket) !== placeKey(tx.accountId, tx.fromBucket)),
          it => placeKey(it.acc, it.bucket) === placeKey(tx.toAccountId, tx.toBucket), it => {
            tx.toAccountId = it.acc; tx.toBucket = it.acc === 'economii' ? it.bucket : undefined;
            if (it.acc !== 'investitii') delete tx.assetId;
            stepDone('to');
          })]);
      if (tx.toAccountId === 'investitii' && state.assets.length) {
        const a = state.assets.find(x => x.id === tx.assetId);
        out.push(['asset', h('span', { class: 'cat-ic neutral' }, icon('trend', 18)), tr('Contribuție la activul'), a ? a.name : tr('— Niciun activ —'),
          () => opts([['', tr('— Niciun activ —')], ...state.assets.map(x => [x.id, `${x.name} · ${brokerOfAsset(x)?.name || ''}`])], tx.assetId || '',
            v => { tx.assetId = v || undefined; stepDone('asset'); })]);
      }
    } else {
      out.push(['cat', c ? catIcon(c, 36) : h('span', { class: 'cat-ic neutral' }, icon('tag', 18)), tr('Categorie'), c ? catName(c) : tr('Alege categoria'), () =>
        h('div', { class: 'cat-grid' }, state.categories.filter(x => x.type === tx.type).map(x => h('button', {
          type: 'button', class: 'cat-btn' + (x.id === tx.categoryId ? ' on' : ''),
          onclick: () => {
            tx.categoryId = x.id;
            // La mâncare, cu bani pe bonuri, se alege singur „Bonuri” (cât timp n-ai ales tu contul); altfel nu se poate plăti cu bonuri.
            if (tx.type === 'cheltuiala' && voucherCat(x.id) && !done.has('acc') && !isEdit && modOn('bonuri') && voucherBalance() > 0) tx.accountId = 'bonuri';
            else if (tx.type === 'cheltuiala' && !voucherCat(x.id) && tx.accountId === 'bonuri') tx.accountId = 'curent';
            stepDone('cat');
          },
        }, catIcon(x, 42), h('span', {}, catName(x)))))]);
      const accOpts = [['curent', accountName('curent')], ['economii', accountName('economii')], ...(withV() ? [['bonuri', `🎫 ${tr('Bonuri')}`]] : [])];
      out.push(['acc', h('span', { class: 'cat-ic neutral' }, icon(tx.accountId === 'economii' ? 'wallet' : 'card', 18)), tr('Cont'),
        tx.accountId === 'bonuri' ? `🎫 ${tr('Bonuri de masă')}` : accountName(tx.accountId), () => opts(accOpts, tx.accountId, v => {
          // alegi Economii: urmează „Din ce economii?”, chiar dacă ai deschis rândul de mână
          if (v === 'economii' && tx.accountId !== 'economii') { tx.accountId = v; tx.bucket = undefined; done.delete('bucket'); done.add('acc'); open = 'bucket'; paint(); return; }
          if (v !== 'economii') { delete tx.bucket; done.delete('bucket'); }
          tx.accountId = v; stepDone('acc');
        })]);
      if (tx.accountId === 'economii') {
        out.push(['bucket', h('span', { class: 'cat-ic neutral' }, icon('wallet', 18)), tx.type === 'venit' ? tr('În ce economii?') : tr('Din ce economii?'),
          tx.bucket == null ? tr('Alege') : bucketName(tx.bucket), () => placeList(bucketOptions(tx.bucket).map(o => ({ acc: 'economii', bucket: o.value })),
            it => tx.bucket != null && (tx.bucket || '') === it.bucket, it => { tx.bucket = it.bucket; stepDone('bucket'); })]);
      }
    }
    const t0 = today(), y = addDays(t0, -1);
    out.push(['date', h('span', { class: 'cat-ic neutral' }, icon('calendar', 18)), tr('Data'), dayLabel(tx.date), () => {
      const pick = dateInput(tx.date, { max: t0, 'aria-label': tr('Alege data') });
      pick.addEventListener('change', () => { if (pick.value) setDate(pick.value); });
      return h('div', { class: 'tf-date' }, opts([[t0, dayLabel(t0)], [y, dayLabel(y)]], tx.date, setDate), pick);
    }]);
    // Călătoria: doar la cheltuieli, dacă ai una planificată sau în curs (aleasă singură după dată, o poți schimba).
    if (hasTrip()) {
      const trip = state.trips.find(x => x.id === tripId);
      out.push(['trip', h('span', { class: 'cat-ic neutral' }, icon('globe', 18)), tr('Călătorie'), trip ? `${trip.icon || '✈️'} ${trip.name}` : tr('Niciuna'),
        () => opts([['', tr('Niciuna')], ...tripsOpen().map(x => [x.id, `${x.icon || '✈️'} ${x.name}`])], tripId, v => { tripId = v; tripTouched = true; stepDone('trip'); })]);
    }
    out.push(['note', h('span', { class: 'cat-ic neutral' }, icon('pen', 18)), tr('Notă'), tx.note || tr('Opțional'), () => {
      const inp = textInput(tx.note, { placeholder: tr('ex. Lidl'), maxlength: 140, enterkeyhint: 'done' });
      inp.addEventListener('input', () => { tx.note = inp.value; });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); stepDone('note'); } });
      setTimeout(() => inp.focus({ preventScroll: true }), 50);
      return h('div', { class: 'tf-note' }, inp, h('button', { type: 'button', class: 'btn secondary', onclick: () => stepDone('note') }, tr('Gata')));
    }]);
    return out;
  }
  function setDate(v) {
    tx.date = v;
    if (!tripTouched) tripId = tripForDate(v)?.id || '';
    stepDone('date');
  }

  // Sub rânduri: ce rămâne pe bonuri, moneda la transferuri în alt fel de economii, explicația transferului.
  const hint = h('p', { class: 'hint tf-hint' });
  const paintHint = () => {
    const parts = [];
    if (tx.type !== 'transfer' && tx.accountId === 'bonuri') {
      const bal = voucherBalance() + (isEdit && existing.accountId === 'bonuri' ? (existing.type === 'cheltuiala' ? existing.amount : -existing.amount) : 0);
      const after = round2(bal - (parseAmount(amount.value) || 0));
      parts.push(tx.type === 'venit' ? tr('Pe bonuri ai {sum}.', { sum: money(bal) })
        : after >= 0 ? tr('Pe bonuri ai {a}. După plată rămân {b}.', { a: money(bal), b: money(after) })
          : tr('Pe bonuri ai doar {a}: lipsesc {b}.', { a: money(bal), b: money(-after) }));
      hint.classList.toggle('warn-text', tx.type === 'cheltuiala' && after < 0);
    } else hint.classList.remove('warn-text');
    if (tx.type === 'transfer') {
      const foreign = [tx.accountId === 'economii' && (tx.fromBucket || ''), tx.toAccountId === 'economii' && (tx.toBucket || '')]
        .filter(b => b !== false).map(bucketCurrency).find(c => c !== base);
      if (foreign) parts.push(tr('Suma e în {base}; pentru compartimentul în {cur} se convertește cu cursul din Setări.', { base, cur: foreign }));
      parts.push(tr('Transferurile nu apar la cheltuieli.'));
    }
    hint.textContent = parts.join(' ');
    hint.hidden = !parts.length;
  };
  amount.addEventListener('input', paintHint);

  const list = h('div', { class: 'tf-list' });
  function paint() {
    const o = order(), cur = o.indexOf(open);
    list.replaceChildren(...rows().flatMap(([k, ic, label, value, body]) => {
      // în timpul pașilor, cei care urmează sunt mai șterși, ca să se vadă unde ești
      const todo = flow && cur >= 0 && o.indexOf(k) > cur && !done.has(k);
      const isOpen = open === k;
      const row = h('button', {
        type: 'button', class: 'tf-row' + (isOpen ? ' open' : '') + (todo ? ' todo' : '') + (done.has(k) ? ' done' : ''), 'aria-expanded': String(isOpen),
        onclick: () => { flow = false; open = isOpen ? null : k; paint(); },
      }, ic, h('span', { class: 'tf-row-m' }, h('small', {}, label), h('b', {}, value)),
        h('span', { class: 'tf-chev' }, done.has(k) && !isOpen ? '✓' : icon('chevR', 18)));
      return isOpen ? [row, h('div', { class: 'tf-exp' }, body())] : [row];
    }));
    paintHint();
  }

  const typeSeg = segmented(TYPES(), tx.type, v => {
    tx.type = v;
    if (v === 'transfer') {
      if (tx.accountId === 'bonuri') tx.accountId = 'curent';
      if (!tx.toAccountId || tx.toAccountId === tx.accountId) tx.toAccountId = tx.accountId === 'curent' ? 'economii' : 'curent';
    } else {
      if (tx.accountId === 'investitii') tx.accountId = 'curent';
      if (catById(tx.categoryId)?.type !== v) tx.categoryId = null;
    }
    // alt tip: pașii o iau de la capăt
    flow = true; done.clear(); open = order()[0];
    paintCur(); paintFx(); paint();
  });
  paintCur(); paintFx(); paint();

  function submit() {
    const amt = parseAmount(amount.value);
    if (!(amt > 0)) return invalid(amount, tr('Introdu o sumă mai mare ca 0'));
    if (!tx.date) { open = 'date'; paint(); return toast(tr('Alege data')); }
    const out = { id: tx.id, type: tx.type, amount: round2(amt), date: tx.date, note: (tx.note || '').trim() };
    if (tx.subscriptionId) out.subscriptionId = tx.subscriptionId;
    if (tx.debtId) out.debtId = tx.debtId;
    if (tx.type === 'transfer') {
      const sameBucket = (tx.fromBucket || '') === (tx.toBucket || '');
      if (tx.accountId === tx.toAccountId && !(tx.accountId === 'economii' && !sameBucket)) { open = 'to'; paint(); return toast(tr('Alege conturi diferite')); }
      Object.assign(out, { accountId: tx.accountId, toAccountId: tx.toAccountId });
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
      if (!tx.categoryId) { open = 'cat'; paint(); return toast(tr('Alege o categorie')); }
      out.categoryId = tx.categoryId;
      out.accountId = ['economii', 'bonuri'].includes(tx.accountId) ? tx.accountId : 'curent';
      if (tx.type === 'cheltuiala' && tripId && state.trips.some(x => x.id === tripId)) out.tripId = tripId;
      if (txCur !== base) {
        // Păstrăm conversia veche dacă suma și moneda nu s-au schimbat (cursul din Setări poate fi între timp altul).
        const same = isEdit && existing.origCurrency === txCur && existing.origAmount === out.amount;
        out.origAmount = out.amount;
        out.origCurrency = txCur;
        out.amount = same ? existing.amount : round2(convert(out.amount, txCur, base));
      }
      // Din / în ce economii: suma se scade (sau se adaugă) exact acolo, în moneda acelui loc.
      if (out.accountId === 'economii') {
        if (tx.bucket == null) { open = 'bucket'; paint(); return toast(tx.type === 'venit' ? tr('Alege în ce economii') : tr('Alege din ce economii')); }
        out.bucket = tx.bucket || '';
        const bcur = bucketCurrency(out.bucket);
        if (bcur !== base) out.bucketAmt = out.origCurrency === bcur ? out.origAmount : round2(convert(out.amount, base, bcur));
        if (tx.type === 'venit' && out.bucket.startsWith('g:')) {
          const prev = isEdit && existing.type === 'venit' && existing.accountId === 'economii' && (existing.bucket || '') === out.bucket ? txBucketAmt(existing) : 0;
          const room = goalRoom(out.bucket, prev);
          if (room != null && txBucketAmt(out) > room + 0.001) return invalid(amount, roomMsg(room, bcur));
        }
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
  amount.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); amount.blur(); } });

  const body = h('div', { class: 'tf' }, typeSeg, amountBox, fxHint, list, hint);
  // lista monedelor se închide la orice atingere în afara ei
  body.addEventListener('click', e => { if (!e.target.closest('.tf-cur-wrap')) curMenu.hidden = true; });
  const sh = openSheet({
    title: isEdit ? tr('Editează tranzacția') : tr('Tranzacție nouă'),
    body,
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
