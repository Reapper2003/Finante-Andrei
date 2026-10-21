// Calculatorul de bani: planul lunii (cât pui deoparte, cât poți cheltui, unde merg economiile),
// neprevăzute și „Îmi permit?”. Ce scrii tu (venit, procente, destinații, priorități) se ține minte în Setări.

import { state, save, modOn } from '../store.js';
import { currentMonth, addMonths } from '../dates.js';
import { moneyShort, parseAmount, forInput, plural, CURRENCIES } from '../fmt.js';
import { round2, convert, subTotals, debtTotals, efStats, goalStats, dailyAllowance, monthTotals } from '../calc.js';
import { h, openSheet, btn, amountInput } from '../ui.js';
import { openGoalForm } from '../forms.js';
import { t as tr } from '../i18n.js';

const base = () => state.settings.currency;
const lei = (v, cur = base()) => `${moneyShort(v)} ${CURRENCIES[cur] || cur}`;
const comma = v => String(Math.round(v * 10) / 10).replace('.', state.settings.numberFormat === 'en' ? '.' : ',');

// Ce ai ales în calculator: venit, procent economisit, destinații bifate, procente pe destinații, priorități.
function calc() {
  const st = state.settings;
  if (!st.calc) st.calc = {};
  const c = st.calc;
  // completează doar ce lipsește, pe același obiect (altfel modificările s-ar face pe o copie)
  for (const [k, v] of Object.entries({ inc: '', save: 20, on: null, pct: {}, prio: {} })) if (!(k in c)) c[k] = v;
  return c;
}

/* ---------- Cifrele din aplicație ---------- */

// Plăți fixe pe lună: abonamente (lunar echivalent) + ratele datoriilor active.
const fixedMonthly = () => round2(subTotals().monthly + debtTotals().monthly);

// Ultimele 3 luni încheiate (fără luna curentă).
const lastMonths = () => [1, 2, 3].map(i => addMonths(currentMonth(), -i));

// Cât cheltui de obicei pe lună, fără abonamente și rate (media lunilor încheiate cu cheltuieli).
function usualSpend() {
  const vals = lastMonths().map(m => state.transactions
    .filter(t => t.type === 'cheltuiala' && t.date.startsWith(m) && !t.subscriptionId && !t.debtId)
    .reduce((acc, t) => acc + t.amount, 0)).filter(v => v > 0);
  return vals.length ? round2(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

// Cât economisești de obicei pe lună (venit − cheltuieli, media lunilor încheiate pe plus).
function usualSaving() {
  const vals = lastMonths().map(m => monthTotals(m).left).filter(v => v > 0);
  return vals.length ? round2(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}

// Unde pot merge economiile: [id, grupă, nume, detaliu, cât cere pe lună (obiective cu termen, în moneda implicită)]
function destinations() {
  const out = [];
  const ef = efStats();
  // cap = cât îi mai trebuie (fondul până la țintă, obiectivul până la sumă); brokerii și fondurile de economii n-au limită.
  out.push({ id: 'fond', group: 'fond', name: tr('Fond de urgență'), sub: tr('{a} din {b} luni', { a: comma(ef.covered), b: ef.months }), need: null,
    cap: ef.avg > 0 ? Math.max(0, round2(ef.target - ef.balance)) : null });
  if (modOn('investitii')) for (const b of state.brokers) out.push({ id: 'b:' + b.id, group: 'inv', name: b.name, sub: b.currency, need: null });
  for (const g of state.goals.filter(x => !x.done)) {
    const s = goalStats(g);
    out.push({ id: 'g:' + g.id, group: 'eco', name: `${g.icon || '🎯'} ${g.name}`, sub: s.left > 0 ? tr('lipsesc {sum}', { sum: lei(s.left, s.cur) }) : tr('atins'),
      need: s.perMonth ? round2(convert(s.perMonth, s.cur, base())) : null, cap: round2(convert(s.left, s.cur, base())) });
  }
  for (const f of state.funds) out.push({ id: 'f:' + f.id, group: 'eco', name: `${f.icon || '💰'} ${f.name}`, sub: tr('fond'), need: null, cap: null });
  return out;
}

// Prioritate implicită: fondul și obiectivele cu termen sus, investițiile la mijloc, fondurile de economii jos.
const defaultPrio = d => (d.group === 'fond' || d.need ? 3 : d.group === 'inv' || d.group === 'eco' && d.id.startsWith('g:') ? 2 : 1);
const prioOf = d => calc().prio[d.id] || defaultPrio(d);

// Limita unei destinații, în procente din suma pusă deoparte (ex. un obiectiv căruia îi lipsesc 50 lei din 1.960 = 2,55%).
const limitPct = (d, saveAmt) => (d.cap == null || !(saveAmt > 0) ? 100 : Math.min(100, d.cap / saveAmt * 100));

// Împarte `total` procente între destinații după greutăți, fără ca vreuna să treacă de limita ei;
// ce nu încape la una pline merge la celelalte. Ce nu încape nicăieri rămâne neîmpărțit.
function fill(list, total, weight, saveAmt) {
  const res = {};
  list.forEach(d => { res[d.id] = 0; });
  let open = list.filter(d => limitPct(d, saveAmt) > 1e-6), rest = total;
  while (open.length && rest > 1e-6) {
    const ws = open.map(d => Math.max(0, weight(d))), wsum = ws.reduce((x, y) => x + y, 0);
    const share = new Map(open.map((d, i) => [d.id, rest * (wsum > 0 ? ws[i] / wsum : 1 / open.length)]));
    const full = open.filter(d => share.get(d.id) >= limitPct(d, saveAmt) - res[d.id] - 1e-9);
    if (!full.length) { open.forEach(d => { res[d.id] += share.get(d.id); }); break; }
    full.forEach(d => { rest -= limitPct(d, saveAmt) - res[d.id]; res[d.id] = limitPct(d, saveAmt); });
    open = open.filter(d => !full.includes(d));
  }
  return res;
}

// Rotunjește la 5% doar destinațiile care nu și-au atins limita (cele pline rămân exact la limită);
// diferența de rotunjire merge la cea mai mare dintre ele, fără să-i treacă limita.
function round5(res, list, saveAmt) {
  const before = Object.values(res).reduce((x, y) => x + y, 0);
  const free = list.filter(d => res[d.id] < limitPct(d, saveAmt) - 1e-6);
  free.forEach(d => { res[d.id] = Math.min(limitPct(d, saveAmt), Math.round(res[d.id] / 5) * 5); });
  const diff = before - Object.values(res).reduce((x, y) => x + y, 0);
  if (Math.abs(diff) > 1e-6 && free.length) {
    const big = free.reduce((m, d) => (res[d.id] > res[m.id] ? d : m), free[0]);
    res[big.id] = Math.max(0, Math.min(limitPct(big, saveAmt), res[big.id] + diff));
  }
  return res;
}

const chosenList = list => list.filter(d => calc().on.includes(d.id));

// Recomandat: părți după prioritate (Mare 3, Medie 2, Mică 1), fiecare până la limita ei.
function recommend(list, saveAmt) {
  const on = chosenList(list);
  calc().pct = round5(fill(on, 100, prioOf, saveAmt), on, saveAmt);
}
function equal(list, saveAmt) {
  const on = chosenList(list);
  calc().pct = round5(fill(on, 100, () => 1, saveAmt), on, saveAmt);
}
// Când se schimbă suma pusă deoparte, limitele (în procente) se schimbă: împărțirea se păstrează cât se poate.
function clampAll(list, saveAmt) {
  const c = calc(), on = chosenList(list);
  const cur = on.reduce((x, d) => x + (c.pct[d.id] || 0), 0);
  c.pct = round5(fill(on, 100, d => (cur > 0 ? c.pct[d.id] || 0 : prioOf(d)), saveAmt), on, saveAmt);
}
// Când tragi de o bară, celelalte se ajustează proporțional, ca totalul să rămână 100% (cât permit limitele).
function setPct(list, id, v, saveAmt) {
  const c = calc(), on = chosenList(list), d = on.find(x => x.id === id);
  const val = Math.min(v, limitPct(d, saveAmt));
  const others = on.filter(x => x.id !== id);
  const cur = others.reduce((x, o) => x + (c.pct[o.id] || 0), 0);
  const res = round5(fill(others, 100 - val, o => (cur > 0 ? c.pct[o.id] || 0 : 1), saveAmt), others, saveAmt);
  c.pct = { ...res, [id]: val };
}

const verdict = (cls, mark, title, text) => h('div', { class: `pv pv-${cls}` }, h('span', { class: 'pv-mark' }, mark), h('span', {}, h('b', {}, title), h('small', {}, text)));
const range = (min, max, step, value, oninput) => {
  const r = h('input', { type: 'range', min, max, step, value });
  r.addEventListener('input', () => oninput(Number(r.value)));
  return r;
};

/* ---------- Priorități (fereastră; din calculator și din Setări) ---------- */

export function openPlanPriorities(onChange) {
  const list = destinations();
  const LEVELS = [[3, tr('Mare')], [2, tr('Medie')], [1, tr('Mică')]];
  const body = h('div', {});
  const paint = () => {
    const grp = (g, title) => {
      const rows = list.filter(d => d.group === g);
      return rows.length ? [h('small', { class: 'pr-gh' }, title), ...rows.map(d => h('div', { class: 'pr-row' }, h('span', {}, d.name),
        h('div', { class: 'pr-seg' }, LEVELS.map(([v, l]) => h('button', {
          type: 'button', class: prioOf(d) === v ? 'on' : '',
          onclick: () => { calc().prio[d.id] = v; save(); paint(); onChange?.(); },
        }, l)))))] : [];
    };
    body.replaceChildren(h('p', { class: 'muted' }, tr('„Recomandat” dă mai mult la prioritate mare: Mare = 3 părți, Medie = 2, Mică = 1.')),
      ...grp('fond', tr('Fond')), ...grp('inv', tr('Investiții')), ...grp('eco', tr('Economii')));
  };
  paint();
  const sh = openSheet({ title: tr('Priorități'), body, footer: btn(tr('Gata'), () => sh.close()) });
}

/* ---------- Pagina ---------- */

export function planPage() {
  const c = calc();
  const list = destinations();
  const saveNow = () => round2((parseAmount(c.inc) || 0) * c.save / 100);
  if (!Array.isArray(c.on)) { c.on = list.map(d => d.id); recommend(list, saveNow()); }
  c.on = c.on.filter(id => list.some(d => d.id === id)); // destinații șterse între timp
  if (saveNow() > 0) clampAll(list, saveNow()); // nimeni nu primește peste cât îi mai trebuie
  const fixed = fixedMonthly(), usual = usualSpend();

  /* --- 1. Planul lunii --- */
  const incInput = amountInput(c.inc, { placeholder: tr('ex. {n}', { n: '7.800' }) });
  const planOut = h('div', { class: 'p-out' });
  let pickOpen = false;
  incInput.addEventListener('input', () => { c.inc = incInput.value; clampAll(list, saveNow()); save(); paintPlan(); });

  // paintPlan construiește cardul (la venit nou, destinații bifate, panou deschis);
  // refresh doar actualizează cifrele, ca barele să poată fi trase fără să fie refăcute.
  let refs = null;
  function numbers() {
    const inc = parseAmount(c.inc) || 0;
    const saveAmt = round2(inc * c.save / 100), spend = Math.max(0, round2(inc - fixed - saveAmt));
    return { inc, saveAmt, spend, total: Math.max(inc, fixed + saveAmt), ok: usual <= spend, fitPct: Math.floor((inc - fixed - usual) / inc * 100 / 5) * 5 };
  }
  function refresh() {
    if (!refs) return;
    const n = numbers();
    refs.saveLbl.textContent = `${c.save}% · ${lei(n.saveAmt)}`;
    [n.spend, fixed, n.saveAmt].forEach((v, i) => { refs.stack[i].style.width = `${v / n.total * 100}%`; });
    refs.spend.textContent = lei(n.spend); refs.perDay.textContent = ` · ${lei(n.spend / 30)}/${tr('zi')}`; refs.saveVal.textContent = lei(n.saveAmt);
    if (refs.spent) {
      refs.spent.classList.toggle('over', !n.ok);
      refs.spentOf.textContent = tr('{a} din {b}', { a: lei(usual), b: lei(n.spend) });
      refs.spentBar.style.width = `${Math.min(100, n.spend > 0 ? usual / n.spend * 100 : 100)}%`;
      refs.spentMsg.textContent = n.ok ? tr('Ajunge · rămân ~{sum}', { sum: lei(n.spend - usual) })
        : tr('Lipsesc {sum}', { sum: lei(usual - n.spend) }) + (n.fitPct > 0 ? ` · ${tr('economisește {p}% ca să ajungă', { p: n.fitPct })}` : '');
    }
    for (const r of refs.rows) {
      const p = c.pct[r.d.id] || 0, v = n.saveAmt * p / 100, full = r.d.cap != null && v >= r.d.cap - 0.5;
      r.slider.value = p; r.pct.textContent = `${Math.round(p)}%`; r.amt.textContent = lei(v);
      r.hint.replaceChildren(full ? h('span', { class: 'pos' }, ` · ${tr('acoperit complet')}`)
        : r.d.need ? (v >= r.d.need ? h('span', { class: 'pos' }, ` · ${tr('la timp')}`) : ` · ${tr('ținta cere {sum}/lună', { sum: lei(r.d.need) })}`) : '');
    }
    if (refs.stat) {
      const used = refs.rows.reduce((x, r) => x + (c.pct[r.d.id] || 0), 0), left = n.saveAmt * (100 - used) / 100;
      refs.stat.className = 'pd-stat' + (left > 0.5 ? ' left' : '');
      refs.stat.textContent = left > 0.5 ? tr('Neîmpărțit: {sum} · toate destinațiile alese sunt pline', { sum: lei(left) }) : `✓ ${tr('Totul împărțit')}`;
    }
  }

  function paintPlan() {
    refs = null;
    const n = numbers();
    if (!(n.inc > 0)) { planOut.replaceChildren(); return; }
    const ids = list.filter(d => c.on.includes(d.id)).map(d => d.id);
    const names = list.filter(d => c.on.includes(d.id)).map(d => d.name);
    const chosen = names.length ? names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '') : tr('Alege');
    const group = (g, title) => {
      const rows = list.filter(d => d.group === g);
      return rows.length ? h('div', { class: 'pd-group' }, h('small', {}, title), h('div', { class: 'pd-tags' }, rows.map(d => h('button', {
        type: 'button', class: c.on.includes(d.id) ? 'on' : '',
        onclick: () => { c.on = c.on.includes(d.id) ? c.on.filter(x => x !== d.id) : [...c.on, d.id]; recommend(list, n.saveAmt); save(); paintPlan(); },
      }, h('i', {}, c.on.includes(d.id) ? '✓' : ''), d.group === 'fond' ? tr('Fond de urgență') : d.name)))) : null;
    };
    const R = { saveLbl: h('span', {}), stack: [0, 1, 2].map(i => h('i', { style: { background: ['#B48CFF', '#6FA8FF', '#5DD3A6'][i] } })),
      spend: h('b', {}), perDay: h('small', {}), saveVal: h('b', {}), rows: [] };
    R.rows = list.filter(d => c.on.includes(d.id)).map(d => ({
      d, amt: h('b', {}), pct: h('b', {}), hint: h('span', {}),
      slider: range(0, 100, 5, c.pct[d.id] || 0, val => { setPct(list, d.id, val, numbers().saveAmt); save(); refresh(); }),
    }));
    let spentBox = null;
    if (usual > 0) {
      R.spentOf = h('span', {}); R.spentBar = h('i', {}); R.spentMsg = h('small', {});
      spentBox = R.spent = h('div', { class: 'p-spent' }, h('div', { class: 'p-slh' }, h('span', {}, tr('Cheltui de obicei')), R.spentOf),
        h('div', { class: 'p-bar' }, R.spentBar), R.spentMsg, h('small', { class: 'sub' }, tr('media pe 3 luni, fără plăți fixe')));
    }
    planOut.replaceChildren(
      h('div', { class: 'p-slh' }, h('span', {}, tr('Economisesc')), R.saveLbl),
      range(0, 60, 5, c.save, v => { c.save = v; clampAll(list, numbers().saveAmt); save(); refresh(); }),
      h('div', { class: 'p-stack' }, R.stack),
      h('div', { class: 'p-lg' },
        h('div', {}, h('i', { style: { background: '#B48CFF' } }), h('span', {}, h('b', {}, tr('De cheltuit')), R.perDay), R.spend),
        h('div', {}, h('i', { style: { background: '#6FA8FF' } }), h('span', {}, tr('Plăți fixe')), h('b', {}, lei(fixed))),
        h('div', {}, h('i', { style: { background: '#5DD3A6' } }), h('span', {}, tr('Economii')), R.saveVal)),
      spentBox,
      h('div', { class: 'pd' },
        h('h3', {}, tr('Unde merg economiile')),
        h('button', { type: 'button', class: 'pd-pick' + (pickOpen ? ' open' : ''), onclick: () => { pickOpen = !pickOpen; paintPlan(); } },
          h('span', {}, h('small', {}, tr('Destinații')), chosen), h('i', {}, '›')),
        pickOpen ? h('div', { class: 'pd-panel' }, group('fond', tr('Fond')), group('inv', tr('Investiții')), group('eco', tr('Economii')),
          h('button', { type: 'button', class: 'pd-link', onclick: () => openPlanPriorities(() => { recommend(list, numbers().saveAmt); save(); refresh(); }) }, `${tr('Priorități')} ›`)) : null,
        ids.length ? h('div', { class: 'pd-btns' },
          h('button', { type: 'button', onclick: () => { recommend(list, numbers().saveAmt); save(); refresh(); } }, `✨ ${tr('Recomandat')}`),
          h('button', { type: 'button', onclick: () => { equal(list, numbers().saveAmt); save(); refresh(); } }, tr('Egal'))) : null,
        ...R.rows.map(r => h('div', { class: 'pd-row' },
          h('div', { class: 'pd-top' }, h('span', {}, h('b', {}, r.d.name), h('small', {}, r.d.sub, r.hint)), r.amt),
          h('div', { class: 'pd-sl' }, r.slider, r.pct))),
        R.stat = ids.length ? h('p', { class: 'pd-stat' }) : null));
    refs = R;
    refresh();
  }

  /* --- 2. Neprevăzute --- */
  const ef = efStats(), monthlySave = usualSaving() || 0;
  const emInput = amountInput(c.em || '', { placeholder: tr('ex. {n}', { n: '2.000' }) });
  const emOut = h('div', { class: 'p-out' });
  emInput.addEventListener('input', () => { c.em = emInput.value; save(); paintEm(); });
  function paintEm() {
    const amt = parseAmount(c.em) || 0;
    if (!(amt > 0)) { emOut.replaceChildren(); return; }
    const left = ef.balance - amt, months = ef.avg > 0 ? left / ef.avg : 0;
    const back = monthlySave > 0 ? Math.ceil(amt / (monthlySave / 2)) : null;
    emOut.replaceChildren(left >= 0
      ? verdict(months >= 2 ? 'ok' : 'mid', '🛡️', tr('Acoperit'), tr('Din fond: rămân {a} luni (acum {b})', { a: comma(months), b: comma(ef.covered) }) + (back ? ` · ${tr('îl refaci în {n}', { n: plural(back, tr('lună'), tr('luni')) })}` : ''))
      : verdict('no', '✕', tr('Neacoperit'), tr('Fondul nu ajunge · lipsesc {sum}', { sum: lei(-left) })));
  }

  /* --- 3. Îmi permit? --- */
  const a = dailyAllowance();
  let rate = false, months = 6, buyName = '';
  const priceInput = amountInput(c.price || '', { placeholder: tr('ex. {n}', { n: '1.299' }) });
  const buyOut = h('div', { class: 'p-out' });
  priceInput.addEventListener('input', () => { c.price = priceInput.value; buyName = ''; save(); paintBuy(); });
  const wishes = modOn('dorinte') ? state.wishes.filter(w => !w.done && w.price > 0).slice(0, 6) : [];
  const wishRow = wishes.length ? h('div', { class: 'p-wish' }, wishes.map(w => h('button', {
    type: 'button', onclick: () => { const p = round2(convert(w.price, w.currency || base(), base())); c.price = forInput(p); priceInput.value = c.price; buyName = w.name; save(); paintBuy(); },
  }, `🎁 ${w.name}`))) : null;
  const modeSeg = h('div', { class: 'seg' });
  const monthsBox = h('div', { class: 'p-out' });
  function paintMode() {
    modeSeg.replaceChildren(...[[false, tr('Acum')], [true, tr('În rate')]].map(([v, l]) => h('button', {
      type: 'button', class: rate === v ? 'on' : '', onclick: () => { rate = v; paintMode(); paintBuy(); },
    }, l)));
    const lbl = h('span', {}, String(months));
    monthsBox.replaceChildren(...(rate ? [h('div', { class: 'p-slh' }, h('span', {}, tr('Rate')), lbl),
      range(2, 36, 1, months, v => { months = v; lbl.textContent = String(v); paintBuy(); })] : []));
  }
  function paintBuy() {
    const price = parseAmount(c.price) || 0;
    if (!(price > 0)) { buyOut.replaceChildren(); return; }
    const until = state.settings.salaryDay ? tr('până la salariu') : tr('până la final de lună');
    if (!rate) {
      const freeAfter = a.free - price, perDay = Math.max(0, freeAfter / a.daysLeft), before = Math.max(0, a.free / a.daysLeft);
      if (freeAfter >= 0 && perDay >= before / 2) buyOut.replaceChildren(verdict('ok', '✓', tr('Îți permiți'), tr('Rămân {a} în cont · {b}/zi {until}', { a: lei(a.available - price), b: lei(perDay), until })));
      else if (freeAfter >= 0) buyOut.replaceChildren(verdict('mid', '!', tr('Strâns'), tr('Doar {a}/zi {until} (acum {b})', { a: lei(perDay), b: lei(before), until })));
      else {
        const m = monthlySave > 0 ? Math.ceil(-freeAfter / monthlySave) : null;
        buyOut.replaceChildren(
          verdict('no', '✕', tr('Nu acum'), tr('Lipsesc {sum}', { sum: lei(-freeAfter) }) + (m ? ` · ${tr('îi strângi în {n}', { n: plural(m, tr('lună'), tr('luni')) })}` : '')),
          btn(tr('Fă-l obiectiv'), () => openGoalForm(null, { name: buyName, target: round2(price) })));
      }
    } else {
      const r = price / months, after = monthlySave - r;
      buyOut.replaceChildren(after >= monthlySave / 2 ? verdict('ok', '✓', `${lei(r)}/${tr('lună')}`, tr('Mai economisești {sum}/lună', { sum: lei(after) }))
        : after >= 0 ? verdict('mid', '!', `${lei(r)}/${tr('lună')}`, tr('Ia peste jumătate din economii · rămân {sum}', { sum: lei(after) }))
          : verdict('no', '✕', `${lei(r)}/${tr('lună')}`, tr('Rata e mai mare decât economiile tale')));
    }
  }

  paintPlan(); paintEm(); paintMode(); paintBuy();
  const node = h('div', { class: 'page plan' },
    h('section', { class: 'card' }, h('h2', { class: 'p-h' }, tr('Planul lunii')), h('p', { class: 'muted p-sub' }, tr('Merge și înainte de salariu.')),
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, tr('Venit luna asta')), incInput), planOut),
    h('section', { class: 'card' }, h('h2', { class: 'p-h' }, tr('Neprevăzute')), h('p', { class: 'muted p-sub' }, tr('Reparații, amenzi, doctor…')), emInput, emOut),
    h('section', { class: 'card' }, h('h2', { class: 'p-h' }, tr('Îmi permit?')), h('p', { class: 'muted p-sub' }, tr('Scrie prețul.')), priceInput, wishRow, modeSeg, monthsBox, buyOut));
  return { title: tr('Calculator'), node };
}
