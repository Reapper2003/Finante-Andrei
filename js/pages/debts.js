import { state, uid, commit, catByName } from '../store.js';
import { today, fmtDate, currentMonth } from '../dates.js';
import { money, pct, parseAmount, plural, forInput } from '../fmt.js';
import { round2, debtStats, debtTotals, receivablesOpen, debtTypeOptions, debtTypeLabel, rebuildSnapshots } from '../calc.js';
import {
  h, card, sectionHead, linkBtn, stat, btn, go, app, emptyState, progress, openSheet, field, textInput, amountInput, dateInput,
  segmented, selectInput, switchRow, invalid, toast, confirmDialog, swipeRow, icon,
} from '../ui.js';
import { listRow, exportButton } from '../components.js';
import { saveDebtPayment, deleteDebtPayment, deleteDebt } from '../actions.js';
import { t as tr, catName } from '../i18n.js';

let tab = 'mine';

const monthsLeftText = n => tr('Termini de plătit în {n}', { n: plural(n, tr('lună'), tr('luni')) });

/* ---------- Formulare ---------- */

function openDebtForm(existing) {
  const d = existing ? { ...existing } : { type: 'credit' };
  const type = selectInput(debtTypeOptions(), d.type);
  const creditor = textInput(d.creditor, { placeholder: tr('ex. Banca Transilvania'), maxlength: 50 });
  const initial = amountInput(d.initial);
  const remaining = amountInput(existing ? d.remainingStart ?? d.initial : '', { placeholder: tr('La fel ca suma inițială') });
  const monthly = amountInput(d.monthly || '');
  const interest = h('input', { type: 'text', inputmode: 'decimal', value: d.interest ? forInput(d.interest) : '', placeholder: tr('Opțional') });
  const dueDay = h('input', { type: 'text', inputmode: 'numeric', value: d.dueDay ? String(d.dueDay) : '', placeholder: tr('ex. 15') });
  const endDate = dateInput(d.endDate);
  const note = textInput(d.note, { placeholder: tr('Opțional'), maxlength: 140 });
  // Rata lunii curente poate fi deja plătită (ex. datoria e adăugată după scadență): atunci nu se mai scade
  // din banii de cheltuit și nu apare la „Urmează”. Nu creează nicio cheltuială și nu schimbă soldul.
  const cm = currentMonth();
  const paidNowRecorded = existing && state.debtPayments.some(p => p.debtId === d.id && p.date.startsWith(cm));
  let paidNow = !!(d.paidThrough && d.paidThrough >= cm);
  const sh = openSheet({
    title: existing ? tr('Editează datoria') : tr('Datorie nouă'),
    body: h('div', {},
      field(tr('Tip'), type),
      field(tr('Nume sau creditor'), creditor),
      h('div', { class: 'two' }, field(tr('Sumă inițială'), initial), field(existing ? tr('Sold la adăugare') : tr('Sold rămas acum'), remaining)),
      h('div', { class: 'two' }, field(tr('Rată lunară'), monthly), field(tr('Dobândă % (opțional)'), interest)),
      h('div', { class: 'two' }, field(tr('Ziua scadenței'), dueDay), field(tr('Data finală'), endDate)),
      field(tr('Notă'), note),
      paidNowRecorded ? null : h('div', { class: 'list' }, switchRow(tr('Rata de luna asta e deja plătită'), paidNow, v => { paidNow = v; },
        tr('Nu se scade din banii de cheltuit și nu apare la „Urmează”. Nu se înregistrează nicio cheltuială.'))),
      existing ? h('p', { class: 'hint' }, tr('Soldul rămas actual = sold la adăugare − plățile înregistrate.')) : null),
    footer: btn(existing ? tr('Salvează') : tr('Adaugă datoria'), () => {
      if (!creditor.value.trim()) return invalid(creditor, tr('Scrie numele creditorului'));
      const ini = parseAmount(initial.value);
      if (!(ini > 0)) return invalid(initial, tr('Suma inițială trebuie să fie mai mare ca 0'));
      const rem = remaining.value.trim() ? parseAmount(remaining.value) : ini;
      if (!(rem >= 0)) return invalid(remaining, tr('Soldul trebuie să fie pozitiv'));
      if (rem > ini) return invalid(remaining, tr('Soldul nu poate depăși suma inițială'));
      const mon = monthly.value.trim() ? parseAmount(monthly.value) : 0;
      if (!(mon >= 0)) return invalid(monthly, tr('Rata trebuie să fie pozitivă'));
      const intr = interest.value.trim() ? parseAmount(interest.value) : null;
      if (intr != null && !(intr >= 0)) return invalid(interest, tr('Dobânda trebuie să fie pozitivă'));
      const day = dueDay.value.trim() ? parseInt(dueDay.value, 10) : null;
      if (day != null && !(day >= 1 && day <= 31)) return invalid(dueDay, tr('Ziua trebuie să fie între 1 și 31'));
      const out = {
        ...d, type: type.value, creditor: creditor.value.trim(), initial: round2(ini), remainingStart: round2(rem), monthly: round2(mon),
        interest: intr, dueDay: day, endDate: endDate.value || null, note: note.value.trim(),
        paidThrough: paidNowRecorded ? d.paidThrough ?? null : paidNow ? cm : d.paidThrough && d.paidThrough < cm ? d.paidThrough : null,
      };
      if (existing) Object.assign(state.debts.find(x => x.id === d.id), out);
      else state.debts.push({ ...out, id: uid(), startDate: today() });
      commit();
      sh.close();
      toast(existing ? tr('Datorie actualizată') : tr('Datorie adăugată'));
    }),
  });
  if (!existing) creditor.focus({ preventScroll: true });
}

function openPaymentForm(debt, existing) {
  const amount = amountInput(existing?.amount ?? (debt.monthly || ''));
  const date = dateInput(existing?.date || today());
  let asExpense = true;
  const cats = state.categories.filter(c => c.type === 'cheltuiala');
  const cat = selectInput(cats.map(c => ({ value: c.id, label: `${c.icon} ${catName(c)}` })), catByName('Rate credite', 'cheltuiala')?.id || cats[0]?.id);
  const catField = field(tr('Categorie'), cat);
  const sh = openSheet({
    title: existing ? tr('Editează plata') : `${tr('Plată')} · ${debt.creditor}`,
    body: h('div', {},
      field(tr('Sumă'), amount, tr('Sold rămas: {sum}', { sum: money(debtStats(debt).remaining + (existing?.amount || 0)) })),
      field(tr('Data'), date),
      existing
        ? h('p', { class: 'hint' }, existing.txId ? tr('Legată de o cheltuială din contul Curent; se actualizează și ea.') : tr('Nu e legată de o cheltuială.'))
        : [switchRow(tr('Înregistrează și ca cheltuială din Curent'), true, v => { asExpense = v; catField.hidden = !v; }), catField]),
    footer: btn(tr('Salvează plata'), () => {
      const v = parseAmount(amount.value);
      if (!(v > 0)) return invalid(amount, tr('Introdu o sumă mai mare ca 0'));
      saveDebtPayment({ ...(existing || {}), debtId: debt.id, date: date.value || today(), amount: round2(v) }, !existing && asExpense, cat.value);
      sh.close();
      toast(existing ? tr('Plată actualizată') : tr('Plată înregistrată'));
    }),
  });
  if (!existing) amount.focus({ preventScroll: true });
}

function openReceivableForm(existing) {
  const r = existing ? { ...existing } : { status: 'neachitat', date: today() };
  const person = textInput(r.person, { placeholder: tr('ex. Andrei'), maxlength: 40 });
  const amount = amountInput(r.amount);
  const date = dateInput(r.date);
  const note = textInput(r.note, { placeholder: tr('Opțional'), maxlength: 140 });
  const status = segmented([{ value: 'neachitat', label: tr('Neachitat') }, { value: 'achitat', label: tr('Achitat') }], r.status);
  const sh = openSheet({
    title: existing ? tr('Editează') : tr('Bani de primit'),
    body: h('div', {}, field(tr('Persoană'), person), h('div', { class: 'two' }, field(tr('Sumă'), amount), field(tr('Data'), date)), field(tr('Notă'), note), field(tr('Status'), status)),
    footer: h('div', { class: 'btn-row' },
      existing ? btn(tr('Șterge'), () => confirmDeleteReceivable(existing, () => sh.close()), 'ghost danger-text') : null,
      btn(tr('Salvează'), () => {
        if (!person.value.trim()) return invalid(person, tr('Scrie numele persoanei'));
        const a = parseAmount(amount.value);
        if (!(a > 0)) return invalid(amount, tr('Introdu o sumă mai mare ca 0'));
        const out = { ...r, person: person.value.trim(), amount: round2(a), date: date.value || today(), note: note.value.trim(), status: status.get() };
        if (existing) Object.assign(state.receivables.find(x => x.id === r.id), out);
        else state.receivables.push({ ...out, id: uid() });
        commit();
        sh.close();
        toast(tr('Salvat'));
      })),
  });
  if (!existing) person.focus({ preventScroll: true });
}

function confirmDeleteReceivable(r, after) {
  confirmDialog({ title: tr('Ștergi înregistrarea?'), message: `${r.person} · ${money(r.amount)}` }).then(ok => {
    if (!ok) return;
    state.receivables = state.receivables.filter(x => x.id !== r.id);
    commit();
    toast(tr('Șters'));
    after?.();
  });
}

function confirmDeleteDebt(d, after) {
  confirmDialog({ title: tr('Ștergi {name}?', { name: d.creditor }), message: tr('Se șterge și istoricul plăților. Cheltuielile înregistrate rămân în tranzacții.') }).then(ok => {
    if (!ok) return;
    deleteDebt(d.id);
    toast(tr('Datorie ștearsă'));
    after?.();
  });
}

/* ---------- Pagini ---------- */

function debtCard(d) {
  const st = debtStats(d);
  const est = st.remaining <= 0 ? tr('Achitată complet 🎉') : st.monthsLeft ? monthsLeftText(st.monthsLeft) : tr('Adaugă rata lunară pentru estimare');
  const content = h('div', { class: 'debt' },
    h('div', { class: 'top-line' }, h('span', { class: 'row-title' }, d.creditor), h('b', {}, money(st.remaining))),
    h('div', { class: 'row-sub' }, [debtTypeLabel(d.type), d.monthly ? tr('rată {sum}', { sum: money(d.monthly) }) : null, d.dueDay ? tr('scadență pe {d}', { d: d.dueDay }) : null].filter(Boolean).join(' · ')),
    progress(st.paidPct),
    h('div', { class: 'row-sub' }, `${tr('Achitat {pct}', { pct: pct(st.paidPct, 0) })} · ${est}`));
  return swipeRow(content, { onTap: () => go(`#/datorii/${d.id}`), onEdit: () => openDebtForm(d), onDelete: () => confirmDeleteDebt(d) });
}

export function debtsPage() {
  const seg = segmented([{ value: 'mine', label: tr('Datoriile mele') }, { value: 'others', label: tr('Mi se datorează') }], tab, v => { tab = v; app.rerender(); });
  let content;
  if (tab === 'mine') {
    const tot = debtTotals();
    content = [
      h('section', { class: 'card summary' },
        h('span', { class: 'label' }, tr('Total datorii rămase')),
        h('strong', { class: 'big' }, money(tot.remaining)),
        h('div', { class: 'stats2' }, stat(tr('Rate lunare'), money(tot.monthly)), stat(tr('Datorii'), String(state.debts.length)))),
      sectionHead(tr('Datorii'), linkBtn(tr('Adaugă'), () => openDebtForm())),
      state.debts.length
        ? h('div', { class: 'list' }, state.debts.map(debtCard))
        : card(emptyState(tr('Nu ai nicio datorie înregistrată. 🎉'), tr('Adaugă datorie'), () => openDebtForm())),
    ];
  } else {
    const list = [...state.receivables].sort((a, b) => (a.status === 'achitat') - (b.status === 'achitat') || b.date.localeCompare(a.date));
    content = [
      h('section', { class: 'card summary' },
        h('span', { class: 'label' }, tr('Neachitat')),
        h('strong', { class: 'big' }, money(receivablesOpen()))),
      h('div', { class: 'list' }, switchRow(tr('Include în averea netă'), state.settings.includeReceivables, v => {
        state.settings.includeReceivables = v;
        rebuildSnapshots();
        commit();
      })),
      sectionHead(tr('Persoane'), linkBtn(tr('Adaugă'), () => openReceivableForm())),
      list.length
        ? h('div', { class: 'list' }, list.map(r => {
          const paid = r.status === 'achitat';
          const row = h('div', { class: 'row' + (paid ? ' faded' : '') },
            h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, r.person), h('div', { class: 'row-sub' }, [fmtDate(r.date), r.note].filter(Boolean).join(' · '))),
            h('div', { class: 'row-right' }, h('span', { class: 'amt' }, money(r.amount)),
              h('button', {
                type: 'button', class: 'tag ' + (paid ? 'ok' : 'warn'),
                onclick: e => { e.stopPropagation(); r.status = paid ? 'neachitat' : 'achitat'; commit(); toast(paid ? tr('Marcat neachitat') : tr('Marcat achitat')); },
              }, paid ? tr('Achitat') : tr('Neachitat'))));
          return swipeRow(row, { onTap: () => openReceivableForm(r), onEdit: () => openReceivableForm(r), onDelete: () => confirmDeleteReceivable(r) });
        }))
        : card(emptyState(tr('Nimeni nu îți datorează bani acum.'), tr('Adaugă'), () => openReceivableForm())),
    ];
  }
  return { title: tr('Datorii'), back: '#/acasa', node: h('div', { class: 'page' }, seg, ...content) };
}

export function debtPage(id) {
  const d = state.debts.find(x => x.id === id);
  if (!d) return null;
  const st = debtStats(d);
  const payments = state.debtPayments.filter(p => p.debtId === id).sort((a, b) => b.date.localeCompare(a.date));
  const info = (label, value) => value ? h('div', { class: 'bd-row' }, h('span', {}, label), h('b', {}, value)) : null;
  const node = h('div', { class: 'page' },
    h('section', { class: 'card summary' },
      h('span', { class: 'label' }, tr('Sold rămas')),
      h('strong', { class: 'big' }, money(st.remaining)),
      progress(st.paidPct),
      h('p', { class: 'muted' }, tr('Achitat {pct} din {sum}', { pct: pct(st.paidPct, 0), sum: money(d.initial) })),
      h('p', {}, st.remaining <= 0 ? tr('Achitată complet 🎉') : st.monthsLeft ? `${monthsLeftText(st.monthsLeft)}.` : tr('Adaugă rata lunară pentru o estimare.'))),
    card(
      info(tr('Tip'), debtTypeLabel(d.type)),
      info(tr('Rată lunară'), d.monthly ? money(d.monthly) : null),
      info(tr('Dobândă'), d.interest != null ? `${forInput(d.interest)}%` : null),
      info(tr('Scadență lunară'), d.dueDay ? tr('ziua {d}', { d: d.dueDay }) : null),
      d.paidThrough && d.paidThrough >= currentMonth() && !payments.some(p => p.date.startsWith(currentMonth()))
        ? info(tr('Rata de luna asta'), tr('plătită înainte de adăugare')) : null,
      info(tr('Data finală'), d.endDate ? fmtDate(d.endDate) : null),
      d.note ? h('p', { class: 'muted' }, d.note) : null),
    btn(tr('Înregistrează plată'), () => openPaymentForm(d)),
    sectionHead(tr('Plăți')),
    payments.length
      ? h('div', { class: 'list' }, payments.map(p => swipeRow(
        listRow({ iconEl: h('span', { class: 'cat-ic neutral' }, icon('check', 20)), title: money(p.amount), sub: [fmtDate(p.date), p.txId ? tr('cheltuială din Curent') : null].filter(Boolean).join(' · ') }),
        {
          onTap: () => openPaymentForm(d, p), onEdit: () => openPaymentForm(d, p),
          onDelete: () => confirmDialog({ title: tr('Ștergi plata?'), message: `${money(p.amount)} · ${fmtDate(p.date)}${p.txId ? '. ' + tr('Cheltuiala legată se șterge și ea.') : ''}` })
            .then(ok => { if (ok) { deleteDebtPayment(p.id); toast(tr('Plată ștearsă')); } }),
        })))
      : h('p', { class: 'muted' }, tr('Nicio plată înregistrată încă.')),
    h('div', { class: 'btn-row' },
      btn(tr('Editează'), () => openDebtForm(d), 'secondary'),
      btn(tr('Șterge'), () => confirmDeleteDebt(d, () => go('#/datorii')), 'ghost danger-text')));
  return { title: d.creditor, back: '#/datorii', node };
}
