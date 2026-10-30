// Călătorii (ca „Trips” din Revolut): strângi bani pentru ea, la plecare banii trec în Curent ca rezervă,
// cheltuielile din perioada ei se iau din rezervă, iar la final ce rămâne devine un fond de economii (vezi runTrips în actions.js).

import { state, uid, commit, PALETTE } from '../store.js';
import { today, fmtDate } from '../dates.js';
import { money, parseAmount, plural } from '../fmt.js';
import { round2, tripStats, bucketBalance } from '../calc.js';
import { h, card, sectionHead, linkBtn, btn, go, openSheet, field, textInput, amountInput, dateInput, invalid, toast, confirmDialog, emojiPicker, progress, emptyState } from '../ui.js';
import { openBucketMove } from '../forms.js';
import { txRow } from '../components.js';
import { runAutomations, deleteGoal } from '../actions.js';
import { t as tr } from '../i18n.js';

const EMOJIS = ['✈️', '🏖️', '🏔️', '🏙️', '🚗', '⛺', '🎿', '🌴', '🚢', '🚆', '🗺️', '🎡'];
const goalOf = trip => state.goals.find(g => g.id === trip.goalId);
const period = trip => `${fmtDate(trip.start)} – ${fmtDate(trip.end)}`;

/* ---------- Formular ---------- */

export function openTripForm(existing) {
  const trip = existing ? { ...existing } : { icon: '✈️' };
  const name = textInput(trip.name, { placeholder: tr('ex. Grecia'), maxlength: 40 });
  const start = dateInput(trip.start), end = dateInput(trip.end);
  const budget = amountInput(trip.budget || '');
  // După plecare, bugetul nu mai schimbă nimic (banii strânși au trecut deja în rezervă).
  const planned = !existing || existing.status === 'planned';
  const sh = openSheet({
    title: existing ? tr('Editează călătoria') : tr('Călătorie nouă'),
    body: h('div', {},
      field(tr('Unde mergi?'), name),
      h('div', { class: 'two' }, field(tr('Plecare'), start), field(tr('Întoarcere'), end)),
      planned ? field(tr('Buget'), budget, tr('Cât vrei să strângi și să cheltui în călătorie.')) : null,
      field(tr('Iconiță'), emojiPicker(EMOJIS, trip.icon, v => { trip.icon = v; })),
      existing ? null : h('p', { class: 'hint' }, tr('Strângi bani pentru ea ca pentru un obiectiv. În ziua plecării, banii strânși trec în Curent, rezervați pentru călătorie, iar cheltuielile din perioada ei se iau de acolo. La final, ce rămâne devine un fond de economii.'))),
    footer: btn(existing ? tr('Salvează') : tr('Creează călătoria'), () => {
      if (!name.value.trim()) return invalid(name, tr('Scrie un nume'));
      if (!start.value) return invalid(start, tr('Alege data'));
      if (!end.value) return invalid(end, tr('Alege data'));
      if (end.value < start.value) return invalid(end, tr('Întoarcerea nu poate fi înainte de plecare'));
      const b = planned ? parseAmount(budget.value) : trip.budget;
      if (planned && !(b > 0)) return invalid(budget, tr('Introdu o sumă mai mare ca 0'));
      const out = { ...trip, name: name.value.trim(), start: start.value, end: end.value, budget: round2(b) };
      if (existing) {
        Object.assign(state.trips.find(x => x.id === trip.id), out);
        const g = goalOf(out);
        if (g) Object.assign(g, { name: out.name, icon: out.icon, deadline: out.start, ...(planned ? { target: out.budget } : {}) });
      } else {
        const id = uid(), goalId = uid();
        state.goals.push({ id: goalId, name: out.name, icon: out.icon, color: PALETTE[state.goals.length % PALETTE.length], target: out.budget, initial: 0,
          currency: state.settings.currency, deadline: out.start, done: false, createdAt: today(), tripId: id });
        state.trips.push({ ...out, id, goalId, status: 'planned', createdAt: today() });
      }
      runAutomations(); // dacă plecarea e azi sau a trecut, rezerva se face pe loc
      commit();
      sh.close();
      toast(existing ? tr('Călătorie actualizată') : tr('Călătorie creată'));
    }),
  });
  if (!existing) name.focus({ preventScroll: true });
}

async function removeTrip(trip, after) {
  const ok = await confirmDialog({
    title: tr('Ștergi călătoria {name}?', { name: trip.name }),
    message: tr('Cheltuielile rămân, doar nu mai sunt legate de călătorie. Banii strânși sau rămași nu se pierd.'),
  });
  if (!ok) return;
  for (const t of state.transactions) if (t.tripId === trip.id) delete t.tripId;
  const g = goalOf(trip);
  state.trips = state.trips.filter(x => x.id !== trip.id);
  // Un goal gol dispare; unul cu bani strânși rămâne ca obiectiv obișnuit.
  if (g && bucketBalance('g:' + g.id) <= 0) deleteGoal(g.id);
  else { if (g) delete g.tripId; commit(); }
  toast(tr('Călătorie ștearsă'));
  after?.();
}

/* ---------- Card (Economii și Acasă) ---------- */

function status(trip, st) {
  if (trip.status === 'planned') {
    return {
      line: tr('Strâns {a} din {b}', { a: money(st.saved), b: money(trip.budget) }),
      pct: trip.budget ? st.saved / trip.budget : 0,
      sub: st.daysTo > 0 ? tr('Pleci în {n}', { n: plural(st.daysTo, tr('zi'), tr('zile')) }) : tr('Pleci azi'),
    };
  }
  if (trip.status === 'active') {
    const left = tr('încă {n}', { n: plural(Math.max(1, st.daysLeft), tr('zi'), tr('zile')) });
    if (!trip.reserved) return { line: tr('Cheltuit {sum}', { sum: money(st.spent) }), pct: 0, sub: `${left} · ${tr('fără bani strânși: cheltuielile vin din bugetul obișnuit')}` };
    return {
      line: st.over > 0 ? tr('Ai depășit rezerva cu {sum}', { sum: money(st.over) }) : tr('Mai ai {sum}', { sum: money(st.reserveLeft) }),
      pct: trip.reserved ? st.reserveLeft / trip.reserved : 0, warn: st.over > 0,
      sub: st.over > 0 ? `${left} · ${tr('diferența vine din bugetul obișnuit')}` : `${left} · ${tr('din {sum} rezervați', { sum: money(trip.reserved) })}`,
    };
  }
  return {
    line: tr('Te-a costat {a} din {b}', { a: money(st.spent), b: money(trip.budget) }),
    pct: trip.budget ? Math.min(1, st.spent / trip.budget) : 0,
    sub: trip.leftover > 0 ? tr('Rămași {sum}, puși deoparte', { sum: money(trip.leftover) }) : plural(st.days, tr('zi'), tr('zile')),
  };
}

export function tripCard(trip) {
  const st = tripStats(trip), s = status(trip, st);
  return h('button', { type: 'button', class: 'card trip-card' + (trip.status === 'done' ? ' faded' : ''), onclick: () => go(`#/economii/c/${trip.id}`) },
    h('div', { class: 'tc-head' }, h('span', { class: 'tc-ic' }, trip.icon || '✈️'),
      h('span', { class: 'tc-t' }, h('b', {}, trip.name), h('small', {}, period(trip)))),
    h('div', { class: 'tc-line' + (s.warn ? ' warn' : '') }, s.line),
    progress(s.pct, s.warn ? 'var(--warn)' : null),
    h('small', { class: 'muted' }, s.sub));
}

// Secțiunea de pe Economii: călătoriile viitoare și în desfășurare; cele încheiate, pliate.
export function tripsSection() {
  const open = state.trips.filter(x => x.status !== 'done').sort((a, b) => a.start.localeCompare(b.start));
  const done = state.trips.filter(x => x.status === 'done').sort((a, b) => b.end.localeCompare(a.end));
  return [
    sectionHead(tr('Călătorii'), linkBtn(tr('Adaugă'), () => openTripForm())),
    open.length ? h('div', { class: 'stack' }, open.map(tripCard))
      : done.length ? null : card(emptyState(tr('Pleci undeva? Strânge bani pentru călătorie, iar cheltuielile din perioada ei se adună singure.'), tr('Adaugă călătorie'), () => openTripForm())),
    done.length ? h('details', { class: 'done-goals' }, h('summary', {}, tr('Încheiate ({n})', { n: done.length })), h('div', { class: 'stack' }, done.map(tripCard))) : null,
  ];
}

// Pe Acasă: călătoria în desfășurare, cea care începe în cel mult 14 zile, sau rezumatul uneia tocmai încheiate.
export function homeTripCard() {
  const t = today();
  const active = state.trips.find(x => x.status === 'active');
  const soon = state.trips.filter(x => x.status === 'planned').sort((a, b) => a.start.localeCompare(b.start)).find(x => tripStats(x).daysTo <= 14);
  const trip = active || soon;
  if (trip) return tripCard(trip);
  const ended = state.trips.find(x => x.status === 'done' && !x.summarySeen);
  if (!ended) return null;
  const fund = state.funds.find(f => f.id === ended.fundId);
  return h('section', { class: 'card trip-card trip-done' },
    h('div', { class: 'tc-head' }, h('span', { class: 'tc-ic' }, ended.icon || '✈️'),
      h('span', { class: 'tc-t' }, h('b', {}, tr('{name} s-a terminat', { name: ended.name })), h('small', {}, period(ended))),
      h('button', { type: 'button', class: 'icon-btn tc-x', 'aria-label': tr('Ascunde'), onclick: () => { ended.summarySeen = true; commit(); } }, '✕')),
    h('div', { class: 'tc-line' }, tr('Te-a costat {a} din {b}', { a: money(ended.spent || 0), b: money(ended.budget) })),
    fund ? h('p', { class: 'muted' }, tr('{sum} au trecut în fondul „{name}”.', { sum: money(ended.leftover), name: fund.name })) : null,
    h('div', { class: 'btn-row' },
      btn(tr('Vezi călătoria'), () => go(`#/economii/c/${ended.id}`), 'secondary'),
      fund ? btn(tr('Mută banii rămași'), () => { ended.summarySeen = true; commit(); go(`#/economii/f/${fund.id}`); }) : null));
}

/* ---------- Pagina călătoriei ---------- */

export function tripPage(id) {
  const trip = state.trips.find(x => x.id === id);
  // Călătorie ștearsă (sau link vechi): înapoi la Economii, de unde se deschide.
  if (!trip) { location.replace('#/economii'); return { title: tr('Economii'), node: h('div', { class: 'page' }) }; }
  const st = tripStats(trip), s = status(trip, st);
  const g = goalOf(trip), fund = state.funds.find(f => f.id === trip.fundId);
  const txs = [...st.txs].sort((a, b) => b.date.localeCompare(a.date));
  const node = h('div', { class: 'page' },
    h('section', { class: 'card summary trip-hero' },
      h('span', { class: 'label' }, `${period(trip)} · ${plural(st.days, tr('zi'), tr('zile'))}`),
      h('strong', { class: 'big' + (s.warn ? ' warn' : '') }, trip.status === 'planned' ? money(st.saved) : trip.status === 'active' && trip.reserved ? money(st.reserveLeft) : money(st.spent)),
      h('p', { class: 'muted' }, s.line),
      progress(s.pct, s.warn ? 'var(--warn)' : null),
      h('small', { class: 'muted' }, s.sub)),
    trip.status === 'planned' && g ? h('div', { class: 'btn-row' },
      st.saved > 0 ? btn(tr('Retrage bani'), () => openBucketMove({ bucket: 'g:' + g.id, dir: 'out' }), 'secondary') : null,
      btn(tr('Adaugă bani'), () => openBucketMove({ bucket: 'g:' + g.id, dir: 'in' }))) : null,
    trip.status === 'done' && fund ? card(
      h('p', {}, tr('{sum} au trecut în fondul „{name}”.', { sum: money(trip.leftover), name: fund.name })),
      btn(tr('Mută banii rămași'), () => go(`#/economii/f/${fund.id}`))) : null,
    trip.status === 'planned' ? h('p', { class: 'hint' }, tr('Pe {date}, banii strânși trec în Curent, rezervați pentru călătorie. Nu intră în „Azi mai poți cheltui”.', { date: fmtDate(trip.start) })) : null,
    sectionHead(tr('Cheltuieli · {sum}', { sum: money(st.spent) })),
    txs.length ? h('div', { class: 'list' }, txs.map(t => txRow(t, { showDate: true })))
      : h('p', { class: 'hint' }, tr('Cheltuielile puse între {a} și {b} apar aici singure. Poți lega și altele (de exemplu biletul de avion), din formularul cheltuielii.', { a: fmtDate(trip.start), b: fmtDate(trip.end) })),
    h('div', { class: 'btn-row' },
      btn(tr('Șterge'), () => removeTrip(trip, () => go('#/economii')), 'ghost danger-text'),
      btn(tr('Editează'), () => openTripForm(trip), 'secondary')));
  return { title: `${trip.icon || '✈️'} ${trip.name}`, back: '#/economii', node };
}
