// Formulare comune (bottom sheets): tranzacție, mutare bani în goal / fond, goal, export.

import { state, uid, commit, catById, ACCOUNTS, PALETTE, accountName } from './store.js';
import { today, monthLabel, fmtDate } from './dates.js';
import { money, parseAmount, plural, forInput, CURRENCIES } from './fmt.js';
import { round2, convert, bucketBalance, bucketOptions, bucketName, bucketCurrency, bucketIn, bucketOut, goalStats, brokerOfAsset } from './calc.js';
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

const TYPES = () => [{ value: 'cheltuiala', label: tr('Cheltuială') }, { value: 'venit', label: tr('Venit') }, { value: 'transfer', label: tr('Transfer') }];

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
      if (tx.toAccountId === 'investitii' && tx.assetId) out.assetId = tx.assetId;
    } else {
      if (!tx.categoryId) return toast(tr('Alege o categorie'));
      out.categoryId = tx.categoryId;
      out.accountId = tx.accountId === 'economii' ? 'economii' : 'curent';
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
    toast(isEdit ? tr('Tranzacție actualizată') : tr('Tranzacție adăugată'));
    celebrate(reached);
  }
  amount.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

  const sh = openSheet({
    title: isEdit ? tr('Editează tranzacția') : tr('Tranzacție nouă'),
    body: h('div', {}, typeSeg, field(tr('Sumă'), amount), curRow, dyn, h('div', { class: 'two' }, field(tr('Data'), date), field(tr('Notă'), note))),
    footer: h('div', { class: 'btn-row' },
      isEdit ? btn(tr('Șterge'), () => confirmDeleteTx(existing, () => sh.close()), 'ghost danger-text') : null,
      btn(isEdit ? tr('Salvează') : tr('Adaugă'), submit)),
  });
  if (!isEdit) amount.focus({ preventScroll: true });
}

// Tap pe o categorie din legenda graficului: tranzacțiile ei din lună.
export function openCategoryTxSheet(catId, m, type = 'cheltuiala') {
  const c = catById(catId);
  const txs = state.transactions.filter(t => t.type === type && (t.categoryId || '') === (catId || '') && t.date.startsWith(m))
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = txs.reduce((a, t) => a + t.amount, 0);
  openSheet({
    title: catName(c),
    body: h('div', {},
      h('p', { class: 'muted' }, `${monthLabel(m)} · ${plural(txs.length, tr('tranzacție'), tr('tranzacții'))} · ${money(total)}`),
      h('div', { class: 'list' }, txs.map(t => txRow(t, { showDate: true })))),
  });
}

/* ---------- Bani în / din goal sau fond de urgență ---------- */

export function openBucketMove({ bucket, dir, existing }) {
  const isEdit = !!existing;
  const label = bucketName(bucket);
  const base = state.settings.currency, cur = bucketCurrency(bucket), foreign = cur !== base;
  const prevAmt = existing ? (dir === 'in' ? bucketIn(existing) : bucketOut(existing)) : null;
  const amount = amountInput(prevAmt);
  // Pentru compartimente în altă monedă: echivalentul în moneda implicită (calculat, dar se poate corecta).
  const baseAmt = amountInput(foreign && existing ? existing.amount : '');
  let baseEdited = isEdit;
  amount.addEventListener('input', () => {
    if (baseEdited) return;
    const v = parseAmount(amount.value);
    baseAmt.value = v > 0 ? forInput(round2(convert(v, cur, base))) : '';
  });
  baseAmt.addEventListener('input', () => { baseEdited = true; });
  const date = dateInput(existing?.date || today());
  const defaultNote = bucket.startsWith('g:') ? tr('Goal: {name}', { name: label }) : label;
  const note = textInput(existing?.note ?? defaultNote, { maxlength: 140 });
  const otherIsSavings = existing ? (dir === 'in' ? existing.accountId === 'economii' : existing.toAccountId === 'economii') : false;
  const other = segmented([{ value: 'curent', label: tr('Cont Curent') }, { value: 'alte', label: tr('Alte economii') }], otherIsSavings ? 'alte' : 'curent');
  const balance = bucketBalance(bucket) + (isEdit && dir === 'out' ? prevAmt : 0);

  function submit() {
    const amt = parseAmount(amount.value);
    if (!(amt > 0)) return invalid(amount, tr('Introdu o sumă mai mare ca 0'));
    if (dir === 'out' && amt > balance + 0.001) return invalid(amount, tr('Poți retrage cel mult {sum}', { sum: money(balance, { cur }) }));
    let baseValue = amt;
    if (foreign) {
      baseValue = baseAmt.value.trim() ? parseAmount(baseAmt.value) : convert(amt, cur, base);
      if (!(baseValue > 0)) return invalid(baseAmt, tr('Introdu o sumă mai mare ca 0'));
    }
    const alte = other.get() === 'alte';
    const tx = { id: existing?.id, type: 'transfer', amount: round2(baseValue), date: date.value || today(), note: note.value.trim() };
    if (dir === 'in') Object.assign(tx, { accountId: alte ? 'economii' : 'curent', toAccountId: 'economii', toBucket: bucket }, alte ? { fromBucket: '' } : {}, foreign ? { toAmount: round2(amt) } : {});
    else Object.assign(tx, { accountId: 'economii', fromBucket: bucket, toAccountId: alte ? 'economii' : 'curent' }, alte ? { toBucket: '' } : {}, foreign ? { fromAmount: round2(amt) } : {});
    const reached = saveTx(tx);
    sh.close();
    toast(dir === 'in' ? tr('Bani adăugați în {name}', { name: label }) : tr('Bani retrași din {name}', { name: label }));
    celebrate(reached);
  }

  const sh = openSheet({
    title: `${dir === 'in' ? tr('Adaugă bani') : tr('Retrage bani')} · ${label}`,
    body: h('div', {},
      field(foreign ? tr('Sumă ({cur})', { cur }) : tr('Sumă'), amount, dir === 'out' ? tr('Disponibil: {sum}', { sum: money(balance, { cur }) }) : null),
      foreign ? field(tr('Echivalent în {cur}', { cur: base }), baseAmt, tr('Calculat cu cursul din Setări; îl poți corecta dacă banca a folosit alt curs.')) : null,
      field(dir === 'in' ? tr('Din') : tr('Către'), other),
      h('div', { class: 'two' }, field(tr('Data'), date), field(tr('Notă'), note)),
      h('p', { class: 'hint' }, tr('Se înregistrează ca transfer, nu ca cheltuială.'))),
    footer: btn(dir === 'in' ? tr('Adaugă') : tr('Retrage'), submit),
  });
  if (!isEdit) amount.focus({ preventScroll: true });
}

/* ---------- Goal-uri ---------- */

export function currencySeg(value, onChange) {
  return segmented(Object.keys(CURRENCIES).map(c => ({ value: c, label: c })), value, onChange);
}

const GOAL_EMOJIS = ['🎯', '✈️', '🏖️', '🚗', '🏠', '💻', '📱', '💍', '🎓', '🛋️', '🚲', '🎸', '🐶', '👶', '🏥', '💰'];

export function openGoalForm(existing) {
  const g = existing ? { ...existing } : { icon: '🎯', color: PALETTE[state.goals.length % PALETTE.length] };
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
    else state.goals.push({ ...out, id: uid(), done: false, createdAt: today() });
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
  const sh = openSheet({
    title: `${g.icon || '🎯'} ${g.name}`,
    body: h('div', {},
      h('div', { class: 'goal-sum' },
        h('strong', { class: 'big-sm' }, money(st.saved, { cur: st.cur })), h('span', { class: 'muted' }, ` ${tr('din')} ${money(g.target, { cur: st.cur })}`)),
      progress(st.pct, g.color),
      h('p', { class: 'muted' }, tr('{pct}% completat', { pct: Math.round(st.pct * 100) }) + (g.deadline ? ` · ${tr('termen {date}', { date: fmtDate(g.deadline) })}` : '')),
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
