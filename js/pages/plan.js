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
  out.push({ id: 'fond', group: 'fond', name: tr('Fond de urgență'), sub: tr('{a} din {b} luni', { a: comma(ef.covered), b: ef.months }), need: null, full: ef.avg > 0 && ef.covered >= ef.months });
  if (modOn('investitii')) for (const b of state.brokers) out.push({ id: 'b:' + b.id, group: 'inv', name: b.name, sub: b.currency, need: null });
  for (const g of state.goals.filter(x => !x.done)) {
    const s = goalStats(g);
    out.push({ id: 'g:' + g.id, group: 'eco', name: `${g.icon || '🎯'} ${g.name}`, sub: s.left > 0 ? tr('lipsesc {sum}', { sum: lei(s.left, s.cur) }) : tr('atins'),
      need: s.perMonth ? round2(convert(s.perMonth, s.cur, base())) : null });
  }
  for (const f of state.funds) out.push({ id: 'f:' + f.id, group: 'eco', name: `${f.icon || '💰'} ${f.name}`, sub: tr('fond'), need: null });
  return out;
}

// Prioritate implicită: fondul și obiectivele cu termen sus, investițiile la mijloc, fondurile de economii jos.
const defaultPrio = d => (d.group === 'fond' || d.need ? 3 : d.group === 'inv' || d.group === 'eco' && d.id.startsWith('g:') ? 2 : 1);
const prioOf = d => calc().prio[d.id] || defaultPrio(d);

// Recomandat: fiecare destinație bifată primește părți după prioritate (Mare 3, Medie 2, Mică 1);
// fondul de urgență nu mai primește nimic când a ajuns la țintă. Procentele sunt rotunjite la 5.
function recommend(list) {
  const c = calc(), on = list.filter(d => c.on.includes(d.id));
  const get = on.filter(d => !d.full);
  const w = get.map(prioOf), wsum = w.reduce((a, b) => a + b, 0) || 1;
  c.pct = {};
  on.forEach(d => { c.pct[d.id] = 0; });
  get.forEach((d, i) => { c.pct[d.id] = Math.round(100 * w[i] / wsum / 5) * 5; });
  fixRound(on.map(d => d.id));
}
function equal(list) {
  const c = calc(), ids = list.filter(d => c.on.includes(d.id)).map(d => d.id);
  c.pct = {};
  ids.forEach(id => { c.pct[id] = Math.round(100 / ids.length / 5) * 5; });
  fixRound(ids);
}
// Rotunjirea la 5% poate lăsa ±5%: diferența merge la rândul cel mai mare.
function fixRound(ids) {
  const c = calc();
  if (!ids.length) return;
  const tot = ids.reduce((a, id) => a + (c.pct[id] || 0), 0);
  const big = ids.reduce((m, id) => ((c.pct[id] || 0) > (c.pct[m] || 0) ? id : m), ids[0]);
  c.pct[big] = Math.max(0, (c.pct[big] || 0) + 100 - tot);
}
// Când tragi de o bară, celelalte se ajustează proporțional, ca totalul să rămână 100%.
function setPct(ids, id, v) {
  const c = calc(), others = ids.filter(x => x !== id);
  if (!others.length) { c.pct[id] = 100; return; }
  c.pct[id] = v;
  const rest = 100 - v, cur = others.reduce((a, o) => a + (c.pct[o] || 0), 0);
  let given = 0;
  others.forEach((o, i) => {
    if (i === others.length - 1) { c.pct[o] = Math.max(0, rest - given); return; }
    c.pct[o] = Math.max(0, Math.round(rest * (cur ? (c.pct[o] || 0) / cur : 1 / others.length) / 5) * 5);
    given += c.pct[o];
  });
  const tot = ids.reduce((a, o) => a + c.pct[o], 0);
  if (tot !== 100) { const big = others.reduce((m, o) => (c.pct[o] > c.pct[m] ? o : m), others[0]); c.pct[big] += 100 - tot; }
}

const verdict = (cls, mark, title, text) => h('div', { class: `pv ${cls}` }, h('span', { class: 'pv-mark' }, mark), h('span', {}, h('b', {}, title), h('small', {}, text)));
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
  if (!Array.isArray(c.on)) { c.on = list.map(d => d.id); recommend(list); }
  c.on = c.on.filter(id => list.some(d => d.id === id)); // destinații șterse între timp
  const fixed = fixedMonthly(), usual = usualSpend();

  /* --- 1. Planul lunii --- */
  const incInput = amountInput(c.inc, { placeholder: tr('ex. {n}', { n: '7.800' }) });
  const planOut = h('div', {});
  let pickOpen = false;
  incInput.addEventListener('input', () => { c.inc = incInput.value; save(); paintPlan(); });

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
      const v = n.saveAmt * (c.pct[r.d.id] || 0) / 100;
      r.slider.value = c.pct[r.d.id] || 0; r.pct.textContent = `${c.pct[r.d.id] || 0}%`; r.amt.textContent = lei(v);
      r.hint.replaceChildren(r.d.need ? (v >= r.d.need ? h('span', { class: 'pos' }, ` · ${tr('la timp')}`) : ` · ${tr('ținta cere {sum}/lună', { sum: lei(r.d.need) })}`) : '');
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
        onclick: () => { c.on = c.on.includes(d.id) ? c.on.filter(x => x !== d.id) : [...c.on, d.id]; recommend(list); save(); paintPlan(); },
      }, h('i', {}, c.on.includes(d.id) ? '✓' : ''), d.group === 'fond' ? tr('Fond de urgență') : d.name)))) : null;
    };
    const R = { saveLbl: h('span', {}), stack: [0, 1, 2].map(i => h('i', { style: { background: ['#B48CFF', '#6FA8FF', '#5DD3A6'][i] } })),
      spend: h('b', {}), perDay: h('small', {}), saveVal: h('b', {}), rows: [] };
    R.rows = list.filter(d => c.on.includes(d.id)).map(d => ({
      d, amt: h('b', {}), pct: h('b', {}), hint: h('span', {}),
      slider: range(0, 100, 5, c.pct[d.id] || 0, val => { setPct(ids, d.id, val); save(); refresh(); }),
    }));
    let spentBox = null;
    if (usual > 0) {
      R.spentOf = h('span', {}); R.spentBar = h('i', {}); R.spentMsg = h('small', {});
      spentBox = R.spent = h('div', { class: 'p-spent' }, h('div', { class: 'p-slh' }, h('span', {}, tr('Cheltui de obicei')), R.spentOf),
        h('div', { class: 'p-bar' }, R.spentBar), R.spentMsg, h('small', { class: 'sub' }, tr('media pe 3 luni, fără plăți fixe')));
    }
    planOut.replaceChildren(
      h('div', { class: 'p-slh' }, h('span', {}, tr('Economisesc')), R.saveLbl),
      range(0, 60, 5, c.save, v => { c.save = v; save(); refresh(); }),
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
          h('button', { type: 'button', class: 'pd-link', onclick: () => openPlanPriorities(() => { recommend(list); save(); refresh(); }) }, `${tr('Priorități')} ›`)) : null,
        ids.length ? h('div', { class: 'pd-btns' },
          h('button', { type: 'button', onclick: () => { recommend(list); save(); refresh(); } }, `✨ ${tr('Recomandat')}`),
          h('button', { type: 'button', onclick: () => { equal(list); save(); refresh(); } }, tr('Egal'))) : null,
        ...R.rows.map(r => h('div', { class: 'pd-row' },
          h('div', { class: 'pd-top' }, h('span', {}, h('b', {}, r.d.name), h('small', {}, r.d.sub, r.hint)), r.amt),
          h('div', { class: 'pd-sl' }, r.slider, r.pct))),
        ids.length ? h('p', { class: 'pd-stat' }, `✓ ${tr('Totul împărțit')}`) : null));
    refs = R;
    refresh();
  }

  /* --- 2. Neprevăzute --- */
  const ef = efStats(), monthlySave = usualSaving() || 0;
  const emInput = amountInput(c.em || '', { placeholder: tr('ex. {n}', { n: '2.000' }) });
  const emOut = h('div', {});
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
  const buyOut = h('div', {});
  priceInput.addEventListener('input', () => { c.price = priceInput.value; buyName = ''; save(); paintBuy(); });
  const wishes = modOn('dorinte') ? state.wishes.filter(w => !w.done && w.price > 0).slice(0, 6) : [];
  const wishRow = wishes.length ? h('div', { class: 'p-wish' }, wishes.map(w => h('button', {
    type: 'button', onclick: () => { const p = round2(convert(w.price, w.currency || base(), base())); c.price = forInput(p); priceInput.value = c.price; buyName = w.name; save(); paintBuy(); },
  }, `🎁 ${w.name}`))) : null;
  const modeSeg = h('div', { class: 'seg' });
  const monthsBox = h('div', {});
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
