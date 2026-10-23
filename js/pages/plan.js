// Calculatorul de bani, în pași: 1 cât am, 2 cât pun deoparte, 3 unde pun banii (sume în lei, pe destinațiile alese),
// plus „Îmi permit?” (din cont, din fond, în rate). Ce scrii tu se ține minte în Setări.

import { state, save, modOn } from '../store.js';
import { currentMonth, addMonths } from '../dates.js';
import { moneyShort, parseAmount, forInput, plural, CURRENCIES } from '../fmt.js';
import { round2, convert, subTotals, debtTotals, efStats, goalStats, dailyAllowance, monthTotals, bucketIn, bucketOut, bucketCurrency, brokerOfAsset } from '../calc.js';
import { h, btn, amountInput, segmented } from '../ui.js';
import { openGoalForm } from '../forms.js';
import { t as tr } from '../i18n.js';

const base = () => state.settings.currency;
const lei = (v, cur = base()) => `${moneyShort(v)} ${CURRENCIES[cur] || cur}`;
const comma = v => String(Math.round(v * 10) / 10).replace('.', state.settings.numberFormat === 'en' ? '.' : ',');

// Ce ai ales în calculator: venit, procent economisit, destinații bifate, cât pui la fiecare (în moneda implicită).
function calc() {
  const st = state.settings;
  if (!st.calc) st.calc = {};
  const c = st.calc;
  // completează doar ce lipsește, pe același obiect (altfel modificările s-ar face pe o copie)
  for (const [k, v] of Object.entries({ inc: '', save: 20, on: null, amt: null })) if (!(k in c)) c[k] = v;
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

// Cât ai pus deja luna asta într-o destinație (în moneda implicită): transferuri intrate minus retrase,
// iar la brokeri contribuțiile. Așa planul pentru restul lunii nu dă altora banii pe care i-ai pus deja.
function putThisMonth(id) {
  const cm = currentMonth();
  if (id.startsWith('b:')) {
    const bid = id.slice(2);
    return round2(state.contributions.filter(x => x.date.startsWith(cm)).reduce((acc, x) => {
      const a = state.assets.find(y => y.id === x.assetId), b = a && brokerOfAsset(a);
      return b && b.id === bid ? acc + convert(x.amount, b.currency, base()) : acc;
    }, 0));
  }
  const bucket = id === 'fond' ? 'urgenta' : id, cur = bucketCurrency(bucket);
  let net = 0;
  for (const t of state.transactions) {
    if (t.type !== 'transfer' || !t.date.startsWith(cm)) continue;
    if (t.toAccountId === 'economii' && (t.toBucket || '') === bucket) net += bucketIn(t);
    if (t.accountId === 'economii' && (t.fromBucket || '') === bucket) net -= bucketOut(t);
  }
  return Math.max(0, round2(convert(net, cur, base())));
}

// Unde pot merge economiile. cap = cât îi mai trebuie (fondul până la țintă, obiectivul până la sumă);
// brokerii și fondurile de economii n-au limită. need = cât cere pe lună un obiectiv cu termen.
function destinations() {
  const out = [];
  const ef = efStats();
  out.push({ id: 'fond', group: 'fond', name: tr('Fond de urgență'), sub: tr('{a} din {b} luni', { a: comma(ef.covered), b: ef.months }), need: null,
    cap: ef.avg > 0 ? Math.max(0, round2(ef.target - ef.balance)) : null });
  if (modOn('investitii')) for (const b of state.brokers) out.push({ id: 'b:' + b.id, group: 'inv', name: b.name, sub: b.currency, need: null, cap: null });
  for (const g of state.goals.filter(x => !x.done)) {
    const s = goalStats(g);
    out.push({ id: 'g:' + g.id, group: 'eco', name: `${g.icon || '🎯'} ${g.name}`, sub: s.left > 0 ? tr('lipsesc {sum}', { sum: lei(s.left, s.cur) }) : tr('atins'),
      need: s.perMonth ? round2(convert(s.perMonth, s.cur, base())) : null, cap: round2(convert(s.left, s.cur, base())) });
  }
  for (const f of state.funds) out.push({ id: 'f:' + f.id, group: 'eco', name: `${f.icon || '💰'} ${f.name}`, sub: tr('fond'), need: null, cap: null });
  out.forEach(d => { d.put = putThisMonth(d.id); });
  return out;
}

// Limita pentru planul curent: la „Restul lunii” se socotește ca la începutul lunii (cât îi lipsea + ce ai pus deja luna asta),
// ca un obiectiv completat între timp să-și păstreze partea; la „Luna viitoare” e cât îi lipsește acum.
const capOf = d => (d.cap == null ? null : calc().period === 'next' ? d.cap : round2(d.cap + d.put));

const verdict = (cls, mark, title, text) => h('div', { class: `pv pv-${cls}` }, h('span', { class: 'pv-mark' }, mark), h('span', {}, h('b', {}, title), h('small', {}, text)));
const range = (min, max, step, value, oninput) => {
  const r = h('input', { type: 'range', min, max, step, value });
  r.addEventListener('input', () => oninput(Number(r.value), r));
  return r;
};
const step = (n, title) => h('h2', { class: 'p-step' }, h('i', {}, String(n)), title);

/* ---------- Pagina ---------- */

export function planPage() {
  const c = calc();
  const list = destinations();
  const byId = id => list.find(d => d.id === id);
  const saveNow = () => round2((parseAmount(c.inc) || 0) * c.save / 100);
  // Prima deschidere: toate destinațiile alese, nimic împărțit. Din versiunile cu procente se păstrează împărțirea, în lei.
  if (!Array.isArray(c.on)) c.on = list.map(d => d.id);
  if (!c.amt) {
    c.amt = {};
    if (c.pct) for (const [id, p] of Object.entries(c.pct)) c.amt[id] = Math.round(saveNow() * p / 100 / 10) * 10;
  }
  delete c.pct; delete c.prio;
  c.on = c.on.filter(id => byId(id)); // destinații șterse între timp
  const chosen = () => list.filter(d => c.on.includes(d.id));
  const amt = id => c.amt[id] || 0;
  const sum = () => chosen().reduce((x, d) => x + amt(d.id), 0);
  const left = () => round2(saveNow() - sum());
  // Nimeni nu primește peste cât îi mai trebuie, iar dacă scade suma pusă deoparte, se taie de jos în sus.
  function fit() {
    for (const d of chosen()) if (capOf(d) != null && amt(d.id) > capOf(d)) c.amt[d.id] = capOf(d);
    for (const d of [...chosen()].reverse()) {
      const over = round2(sum() - saveNow());
      if (over <= 0) break;
      c.amt[d.id] = Math.max(0, round2(amt(d.id) - over));
    }
  }
  fit();

  // Restul lunii: se scad doar plățile fixe încă neplătite până la salariu / final de lună, pe zilele rămase.
  // Luna viitoare: toate plățile fixe ale unei luni, pe 30 de zile.
  const usualMonth = usualSpend(), now = dailyAllowance();
  function numbers() {
    const inc = parseAmount(c.inc) || 0, rest = c.period !== 'next';
    const fixed = rest ? now.committed : fixedMonthly(), days = rest ? Math.max(1, now.daysLeft) : 30;
    const usual = rest ? round2(usualMonth * days / 30) : usualMonth;
    const saveAmt = saveNow(), spend = Math.max(0, round2(inc - fixed - saveAmt));
    return { inc, rest, fixed, days, usual, saveAmt, spend, ok: usual <= spend,
      fitPct: inc > 0 ? Math.floor((inc - fixed - usual) / inc * 100 / 5) * 5 : 0 };
  }

  /* --- 1. Cât am --- */
  const incInput = amountInput(c.inc, { placeholder: tr('ex. {n}', { n: '7.800' }) });
  const incLbl = h('span', { class: 'field-label' }), planSub = h('p', { class: 'muted p-sub' });
  const paintHead = () => {
    const rest = c.period !== 'next';
    incLbl.textContent = rest ? tr('Cât am acum') : tr('Venit luna viitoare');
    planSub.textContent = rest ? tr('Se scad doar plățile fixe încă neplătite.') : '';
    planSub.hidden = !rest;
  };
  paintHead();
  const periodSeg = segmented([{ value: 'rest', label: tr('Restul lunii') }, { value: 'next', label: tr('Luna viitoare') }], c.period === 'next' ? 'next' : 'rest',
    v => { c.period = v; paintHead(); fit(); save(); paintAll(); });
  incInput.addEventListener('input', () => { c.inc = incInput.value; fit(); save(); paintAll(); });

  /* --- 2. Cât pun deoparte --- */
  const R = { saveLbl: h('span', {}), spend: h('b', { class: 'p-big' }), perDay: h('small', { class: 'muted' }), ok: h('div', {}) };
  const card2 = h('section', { class: 'card' }, step(2, tr('Cât pun deoparte')),
    h('div', { class: 'p-slh' }, h('span', {}, tr('Economisesc')), R.saveLbl),
    range(0, 60, 5, c.save, v => { c.save = v; fit(); save(); refresh(); }),
    h('div', { class: 'p-res' }, h('small', { class: 'muted' }, tr('Îmi rămân de cheltuit')), R.spend, R.perDay), R.ok);

  /* --- 3. Unde pun banii --- */
  let pickOpen = false, rows = [], blocked = false;
  const card3 = h('section', { class: 'card' });
  function paint3() {
    const names = chosen().map(d => d.name);
    const group = (g, title) => {
      const ds = list.filter(d => d.group === g);
      return ds.length ? h('div', { class: 'pd-group' }, h('small', {}, title), h('div', { class: 'pd-tags' }, ds.map(d => h('button', {
        type: 'button', class: c.on.includes(d.id) ? 'on' : '',
        // debifată, destinația își dă banii înapoi în „Mai ai de împărțit”
        onclick: () => { if (c.on.includes(d.id)) { c.on = c.on.filter(x => x !== d.id); delete c.amt[d.id]; } else c.on = [...c.on, d.id]; save(); paint3(); },
      }, h('i', {}, c.on.includes(d.id) ? '✓' : ''), d.group === 'fond' ? tr('Fond de urgență') : d.name)))) : null;
    };
    rows = chosen().map(d => {
      const r = { d, v: h('b', {}), sub: h('small', {}), hint: h('span', {}) };
      r.slider = range(0, 10, 10, amt(d.id), (val, el) => {
        // la capătul barei se ia limita exactă (ex. 52 lei), nu multiplul de 10 dinainte
        if (val + 10 > Number(el.max)) val = Number(el.max);
        const lim = Math.min(capOf(d) ?? Infinity, round2(amt(d.id) + left()));
        c.amt[d.id] = Math.max(0, Math.min(val, lim));
        // bara s-a oprit pentru că nu mai sunt bani: spune de ce
        blocked = val > lim && lim < (capOf(d) ?? Infinity);
        save(); refresh();
      });
      r.max = h('button', { type: 'button', class: 'pd-max', onclick: () => { c.amt[d.id] = round2(Math.min(capOf(d) ?? Infinity, amt(d.id) + left())); save(); refresh(); } }, tr('Max'));
      return r;
    });
    R.title3 = h('span', {}); R.pill = h('div', { class: 'pd-left' }); R.bar = h('i', {});
    card3.replaceChildren(step(3, R.title3),
      h('button', { type: 'button', class: 'pd-pick' + (pickOpen ? ' open' : ''), onclick: () => { pickOpen = !pickOpen; paint3(); } },
        h('span', {}, h('small', {}, tr('Destinații')), names.length ? names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '') : tr('Alege unde pui banii')),
        h('i', {}, '›')),
      ...(pickOpen ? [h('div', { class: 'pd-panel' }, group('fond', tr('Fond')), group('inv', tr('Investiții')), group('eco', tr('Economii')),
        h('small', { class: 'muted' }, tr('Doar ce bifezi apare mai jos.')))] : []),
      ...(rows.length ? [R.pill, h('div', { class: 'pd-lbar' }, R.bar)] : []),
      ...rows.map(r => h('div', { class: 'pd-row' },
        h('div', { class: 'pd-top' }, h('span', {}, h('b', {}, r.d.name), h('small', {}, r.d.sub, r.hint)), h('span', { class: 'pd-v' }, r.v, r.sub)),
        h('div', { class: 'pd-sl' }, r.slider, r.max))),
      ...(rows.length ? [h('div', { class: 'pd-btns' },
        h('button', { type: 'button', onclick: () => { autoFill(); save(); refresh(); } }, `✨ ${tr('Împarte restul')}`),
        h('button', { type: 'button', onclick: () => { chosen().forEach(d => { c.amt[d.id] = 0; }); save(); refresh(); } }, tr('Golește')))] : []));
    refresh();
  }
  // „Împarte restul”: ce n-ai împărțit se dă egal (rotunjit la 10) la destinațiile alese care mai au loc.
  function autoFill() {
    let rest = left();
    for (let k = 0; k < 8 && rest >= 1; k++) {
      const open = chosen().filter(d => capOf(d) == null || amt(d.id) < capOf(d));
      if (!open.length) break;
      const share = Math.floor(rest / open.length / 10) * 10 || rest;
      for (const d of open) {
        const g = round2(Math.min(share, (capOf(d) ?? Infinity) - amt(d.id), rest));
        c.amt[d.id] = round2(amt(d.id) + g); rest = round2(rest - g);
      }
    }
  }

  // refresh doar actualizează cifrele, ca barele să poată fi trase fără să fie refăcute.
  function refresh() {
    const n = numbers(), l = left(), wasBlocked = blocked;
    blocked = false; // mesajul ține doar până la următoarea schimbare
    R.saveLbl.textContent = `${c.save}% · ${lei(n.saveAmt)}`;
    R.spend.textContent = lei(n.spend);
    R.perDay.textContent = tr('{a} pe zi · {n} zile · plăți fixe {b} scăzute', { a: lei(n.spend / n.days), n: n.days, b: lei(n.fixed) });
    R.ok.replaceChildren(n.usual > 0 ? h('div', { class: `p-ok${n.ok ? '' : ' bad'}` }, n.ok
      ? `✓ ${n.rest ? tr('Ajunge: cheltui de obicei ~{sum} în {n} zile', { sum: lei(n.usual), n: n.days }) : tr('Ajunge: cheltui de obicei ~{sum} pe lună', { sum: lei(n.usual) })}`
      : `✕ ${tr('Nu ajunge: cheltui de obicei ~{a} · lipsesc {b}', { a: lei(n.usual), b: lei(n.usual - n.spend) })}` + (n.fitPct > 0 ? ` · ${tr('economisește {p}% ca să ajungă', { p: n.fitPct })}` : '')) : '');
    if (!R.title3) return;
    R.title3.textContent = tr('Unde pun cei {sum}', { sum: lei(n.saveAmt) });
    R.pill.className = 'pd-left' + (wasBlocked ? ' warn' : l <= 0.5 ? ' done' : '');
    R.pill.replaceChildren(h('span', {}, l > 0.5 ? tr('Mai ai de împărțit') : wasBlocked ? tr('Totul e împărțit · scade întâi la altceva') : `✓ ${tr('Totul împărțit')}`),
      h('b', {}, lei(l > 0.5 ? l : n.saveAmt)));
    R.bar.style.width = `${n.saveAmt > 0 ? Math.min(100, sum() / n.saveAmt * 100) : 0}%`;
    for (const r of rows) {
      const cap = capOf(r.d), v = amt(r.d.id), full = cap != null && v >= cap - 0.5;
      r.slider.max = Math.max(10, cap == null ? n.saveAmt : Math.min(cap, n.saveAmt)); r.slider.value = v;
      r.v.textContent = lei(v);
      r.sub.className = full ? 'pos' : 'muted';
      r.sub.textContent = full ? tr('plin ✓') : cap != null ? tr('din {sum}', { sum: lei(cap) }) : '';
      r.max.disabled = full || l <= 0.5;
      const parts = [];
      if (!full && r.d.need) parts.push(v >= r.d.need ? h('span', { class: 'pos' }, ` · ${tr('la timp')}`) : ` · ${tr('ținta cere {sum}/lună', { sum: lei(r.d.need) })}`);
      // Restul lunii: ce ai pus deja luna asta face parte din plan; vezi cât mai ai de pus.
      if (n.rest && r.d.put > 0.5) parts.push(v - r.d.put > 0.5
        ? ` · ${tr('pus deja {a}, mai pui {b}', { a: lei(r.d.put), b: lei(v - r.d.put) })}`
        : Math.abs(v - r.d.put) <= 0.5 ? h('span', { class: 'pos' }, ` · ${tr('pus deja {sum} ✓', { sum: lei(r.d.put) })}`)
          : ` · ${tr('pus deja {sum} luna asta', { sum: lei(r.d.put) })}`);
      r.hint.replaceChildren(...parts);
    }
  }
  // Pașii 2 și 3 apar după ce scrii suma.
  function paintAll() {
    const has = numbers().inc > 0;
    card2.hidden = card3.hidden = !has;
    if (has) paint3();
  }

  /* --- Îmi permit? (din cont, din fond = neprevăzute, în rate) --- */
  const ef = efStats(), monthlySave = usualSaving() || 0;
  const a = now;
  const SRC = { cont: [tr('Din cont'), tr('O cumpărătură din banii de cheltuit.')], fond: [tr('Din fond'), tr('Neprevăzute: reparații, amenzi, doctor…')], rate: [tr('În rate'), tr('Cât te costă pe lună.')] };
  let src = SRC[c.buySrc] ? c.buySrc : 'cont', months = 6, buyName = '';
  const priceInput = amountInput(c.price || '', { placeholder: tr('ex. {n}', { n: '1.299' }) });
  const buyOut = h('div', { class: 'p-out' }), buySub = h('p', { class: 'muted p-sub' }), monthsBox = h('div', { class: 'p-out' });
  priceInput.addEventListener('input', () => { c.price = priceInput.value; buyName = ''; save(); paintBuy(); });
  const wishes = modOn('dorinte') ? state.wishes.filter(w => !w.done && w.price > 0).slice(0, 6) : [];
  const wishRow = wishes.length ? h('div', { class: 'p-wish' }, wishes.map(w => h('button', {
    type: 'button', onclick: () => { const p = round2(convert(w.price, w.currency || base(), base())); c.price = forInput(p); priceInput.value = c.price; buyName = w.name; save(); paintBuy(); },
  }, `🎁 ${w.name}`))) : null;
  const srcSeg = segmented(Object.entries(SRC).map(([value, [label]]) => ({ value, label })), src, v => { src = v; c.buySrc = v; save(); paintSrc(); });
  function paintSrc() {
    buySub.textContent = SRC[src][1];
    const lbl = h('span', {}, String(months));
    monthsBox.replaceChildren(...(src === 'rate' ? [h('div', { class: 'p-slh' }, h('span', {}, tr('Rate')), lbl),
      range(2, 36, 1, months, v => { months = v; lbl.textContent = String(v); paintBuy(); })] : []));
    paintBuy();
  }
  function paintBuy() {
    const price = parseAmount(c.price) || 0;
    if (!(price > 0)) { buyOut.replaceChildren(); return; }
    const until = state.settings.salaryDay ? tr('până la salariu') : tr('până la final de lună');
    if (src === 'cont') {
      const freeAfter = a.free - price, perDay = Math.max(0, freeAfter / a.daysLeft), before = Math.max(0, a.free / a.daysLeft);
      if (freeAfter >= 0 && perDay >= before / 2) buyOut.replaceChildren(verdict('ok', '✓', tr('Îți permiți'), tr('Rămân {a} în cont · {b}/zi {until}', { a: lei(a.available - price), b: lei(perDay), until })));
      else if (freeAfter >= 0) buyOut.replaceChildren(verdict('mid', '!', tr('Strâns'), tr('Doar {a}/zi {until} (acum {b})', { a: lei(perDay), b: lei(before), until })));
      else {
        const m = monthlySave > 0 ? Math.ceil(-freeAfter / monthlySave) : null;
        buyOut.replaceChildren(
          verdict('no', '✕', tr('Nu acum'), tr('Lipsesc {sum}', { sum: lei(-freeAfter) }) + (m ? ` · ${tr('îi strângi în {n}', { n: plural(m, tr('lună'), tr('luni')) })}` : '')),
          btn(tr('Fă-l obiectiv'), () => openGoalForm(null, { name: buyName, target: round2(price) })));
      }
    } else if (src === 'fond') {
      const rest = ef.balance - price, m = ef.avg > 0 ? rest / ef.avg : 0;
      const back = monthlySave > 0 ? Math.ceil(price / (monthlySave / 2)) : null;
      buyOut.replaceChildren(rest >= 0
        ? verdict(m >= 2 ? 'ok' : 'mid', '🛡️', tr('Acoperit'), tr('Din fond: rămân {a} luni (acum {b})', { a: comma(m), b: comma(ef.covered) }) + (back ? ` · ${tr('îl refaci în {n}', { n: plural(back, tr('lună'), tr('luni')) })}` : ''))
        : verdict('no', '✕', tr('Neacoperit'), tr('Fondul nu ajunge · lipsesc {sum}', { sum: lei(-rest) })));
    } else {
      const r = price / months, after = monthlySave - r;
      buyOut.replaceChildren(after >= monthlySave / 2 ? verdict('ok', '✓', `${lei(r)}/${tr('lună')}`, tr('Mai economisești {sum}/lună', { sum: lei(after) }))
        : after >= 0 ? verdict('mid', '!', `${lei(r)}/${tr('lună')}`, tr('Ia peste jumătate din economii · rămân {sum}', { sum: lei(after) }))
          : verdict('no', '✕', `${lei(r)}/${tr('lună')}`, tr('Rata e mai mare decât economiile tale')));
    }
  }

  paintAll(); paintSrc();
  const node = h('div', { class: 'page plan' },
    h('section', { class: 'card p-c1' }, step(1, tr('Cât am')), planSub, periodSeg, h('label', { class: 'field' }, incLbl, incInput)),
    card2, card3,
    h('section', { class: 'card p-c4' }, h('h2', { class: 'p-h' }, tr('Îmi permit?')), buySub, priceInput, wishRow, srcSeg, monthsBox, buyOut));
  card2.classList.add('p-c2'); card3.classList.add('p-c3');
  return { title: tr('Calculator bani'), node };
}
