// Calculatorul de bani, în pași: 1 cât am, 2 cât pun deoparte, 3 unde pun banii (doar economii: fond, investiții, fonduri, obiective),
// 4 cheltuieli extra în luna aceea (cadouri, cumpărături), care se scad din banii de cheltuit, nu din economii;
// la final, un rezumat cu toate sumele. Ce scrii tu se ține minte în Setări.

import { state, save, modOn } from '../store.js';
import { currentMonth, addMonths } from '../dates.js';
import { moneyShort, parseAmount, forInput, CURRENCIES } from '../fmt.js';
import { round2, convert, accountBalance, subTotals, subMonthly, debtTotals, debtRemaining, efStats, goalStats, dailyAllowance, bucketIn, bucketOut, bucketCurrency, brokerOfAsset } from '../calc.js';
import { h, icon, btn, amountInput, textInput, segmented, openSheet } from '../ui.js';
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
  for (const [k, v] of Object.entries({ inc: '', plus: '', save: 20, on: null, amt: null, extras: {} })) if (!(k in c)) c[k] = v;
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
  // Ce am: suma scrisă + banii în plus (ex. ce mai e în contul Curent), dacă i-ai adăugat.
  const income = () => round2((parseAmount(c.inc) || 0) + (c.plusOn ? parseAmount(c.plus) || 0 : 0));
  const saveNow = () => round2(income() * c.save / 100);
  // Cheltuielile extra țin de luna planului: luna curentă la „Restul lunii”, luna viitoare la „Luna viitoare”.
  const planMonth = () => (c.period === 'next' ? addMonths(currentMonth(), 1) : currentMonth());
  for (const m of Object.keys(c.extras)) if (m < currentMonth()) delete c.extras[m]; // lunile trecute nu mai contează
  const extras = () => c.extras[planMonth()] || [];
  const extraSum = () => round2(extras().reduce((x, e) => x + e.amt, 0));
  // Prima deschidere: toate destinațiile alese, nimic împărțit. Din versiunile cu procente se păstrează împărțirea, în lei.
  if (!Array.isArray(c.on)) c.on = list.map(d => d.id);
  if (!c.amt) {
    c.amt = {};
    if (c.pct) for (const [id, p] of Object.entries(c.pct)) c.amt[id] = Math.round(saveNow() * p / 100 / 10) * 10;
  }
  delete c.pct; delete c.prio;
  c.on = c.on.filter(id => byId(id)); // destinații șterse între timp
  // Un obiectiv mutat la „Cheltuieli extra” în luna planului nu mai ia și din banii puși deoparte.
  const inExtra = id => extras().some(e => e.goal && 'g:' + e.goal === id);
  const chosen = () => list.filter(d => c.on.includes(d.id) && !inExtra(d.id));
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
    const inc = income(), rest = c.period !== 'next', extra = extraSum();
    const fixed = rest ? now.committed : fixedMonthly(), days = rest ? Math.max(1, now.daysLeft) : 30;
    const usual = rest ? round2(usualMonth * days / 30) : usualMonth;
    const saveAmt = saveNow(), spend = Math.max(0, round2(inc - fixed - saveAmt - extra));
    return { inc, rest, fixed, extra, days, usual, saveAmt, spend, ok: usual <= spend,
      fitPct: inc > 0 ? Math.floor((inc - fixed - extra - usual) / inc * 100 / 5) * 5 : 0 };
  }

  /* --- 1. Cât am --- */
  // Sumele se țin exact cum le-ai scris (ex. „1742,5”), așa că intră în căsuță ca text, nu ca număr.
  const incInput = amountInput('', { placeholder: tr('ex. {n}', { n: '7.800' }) });
  incInput.value = c.inc || '';
  const incLbl = h('span', { class: 'field-label' }), planSub = h('p', { class: 'muted p-sub' });
  const paintHead = () => {
    const rest = c.period !== 'next';
    incLbl.textContent = rest ? tr('Cât am acum') : tr('Venit luna viitoare');
    planSub.textContent = rest ? tr('Se scad doar plățile fixe încă neplătite.') : '';
    planSub.hidden = !rest;
  };
  paintHead();
  const periodSeg = segmented([{ value: 'rest', label: tr('Restul lunii') }, { value: 'next', label: tr('Luna viitoare') }], c.period === 'next' ? 'next' : 'rest',
    v => { c.period = v; paintHead(); fit(); save(); paintAll(); refresh(); });
  incInput.addEventListener('input', () => { c.inc = incInput.value; fit(); save(); paintAll(); });
  // „+ Mai am bani”: o sumă în plus față de cea scrisă (ex. ce mai e în contul Curent).
  const plusInput = amountInput('', { placeholder: tr('ex. {n}', { n: '500' }) });
  plusInput.value = c.plus || '';
  plusInput.addEventListener('input', () => { c.plus = plusInput.value; fit(); save(); paintAll(); });
  const plusBox = h('div', { class: 'p-plus' }), totalLine = h('p', { class: 'muted p-total' });
  function paintPlus() {
    const cur = accountBalance('curent');
    plusBox.replaceChildren(...(c.plusOn ? [
      h('div', { class: 'p-plus-row' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, tr('În plus')), plusInput),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': tr('Scoate suma în plus'), onclick: () => { c.plusOn = false; c.plus = ''; plusInput.value = ''; fit(); save(); paintPlus(); paintAll(); } }, icon('x', 18))),
      cur > 0 ? h('button', { type: 'button', class: 'p-plus-chip', onclick: () => { c.plus = forInput(round2(cur)); plusInput.value = c.plus; fit(); save(); paintAll(); } },
        tr('Soldul din Curent: {sum}', { sum: lei(cur) })) : null,
    ].filter(Boolean) : [h('button', { type: 'button', class: 'p-plus-link', onclick: () => { c.plusOn = true; save(); paintPlus(); plusInput.focus(); } }, `+ ${tr('Mai am bani')}`)]));
  }
  paintPlus();

  /* --- 2. Cât pun deoparte --- */
  const R = { saveLbl: h('span', {}), spend: h('b', { class: 'p-big' }), perDay: h('small', { class: 'muted' }), ok: h('div', {}) };
  const card2 = h('section', { class: 'card' }, step(2, tr('Cât pun deoparte')),
    h('div', { class: 'p-slh' }, h('span', {}, tr('Economisesc')), R.saveLbl),
    range(0, 60, 5, c.save, v => { c.save = v; fit(); save(); refresh(); }),
    h('div', { class: 'p-res' }, h('small', { class: 'muted' }, tr('Îmi rămân de cheltuit')), R.spend, R.perDay), R.ok);

  /* --- 3. Unde pun banii --- */
  let rows = [], blocked = false;
  const card3 = h('section', { class: 'card' });
  // Fila în care apare o destinație în panou.
  const tabOf = d => (d.id.startsWith('b:') ? 'inv' : d.id.startsWith('g:') ? 'goal' : 'fond');
  let destTab = 'fond';
  function openDestSheet() {
    const TABS = [['fond', tr('Fonduri')], ['inv', tr('Investiții')], ['goal', tr('Obiective')]].filter(([t]) => list.some(d => tabOf(d) === t));
    if (!TABS.some(([t]) => t === destTab)) destTab = TABS[0][0];
    const body = h('div', { class: 'px-opts' });
    const paintBody = () => body.replaceChildren(...list.filter(d => tabOf(d) === destTab).map(d => {
      const moved = inExtra(d.id), on = c.on.includes(d.id) && !moved;
      return h('button', {
        type: 'button', class: 'px-opt' + (on ? ' on' : ''), disabled: moved,
        // debifată, destinația își dă banii înapoi în „Mai ai de împărțit”
        onclick: () => { if (on) { c.on = c.on.filter(x => x !== d.id); delete c.amt[d.id]; } else c.on = [...c.on, d.id]; save(); paint3(); paintBody(); },
      }, h('span', {}, h('b', {}, d.group === 'fond' ? `🛡️ ${tr('Fond de urgență')}` : d.name), h('small', {}, moved ? tr('e la Cheltuieli extra luna asta') : d.sub)),
        h('span', { class: 'px-chk' }, on ? '✓' : ''));
    }));
    paintBody();
    const sh = openSheet({
      title: tr('Unde pun banii'),
      body: h('div', { class: 'px-sheet' },
        TABS.length > 1 ? segmented(TABS.map(([value, label]) => ({ value, label })), destTab, v => { destTab = v; paintBody(); }) : null, body),
      footer: btn(tr('Gata'), () => sh.close()),
    });
  }
  function paint3() {
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
      ...(rows.length ? [R.pill] : [h('p', { class: 'muted px-empty' }, tr('Alege unde pui banii: fond, investiții sau obiective.'))]),
      ...rows.map(r => h('div', { class: 'pd-row' },
        h('div', { class: 'pd-top' }, h('span', {}, h('b', {}, r.d.name), h('small', {}, r.d.sub, r.hint)), h('span', { class: 'pd-v' }, r.v, r.sub)),
        h('div', { class: 'pd-sl' }, r.slider, r.max))),
      ...(rows.length ? [h('div', { class: 'pd-btns' },
        h('button', { type: 'button', onclick: () => { autoFill(); save(); refresh(); } }, `✨ ${tr('Împarte restul')}`),
        h('button', { type: 'button', onclick: () => { chosen().forEach(d => { c.amt[d.id] = 0; }); save(); refresh(); } }, tr('Golește')))] : []),
      h('button', { type: 'button', class: 'px-open', onclick: openDestSheet }, rows.length ? tr('Schimbă destinațiile') : `+ ${tr('Alege destinațiile')}`));
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
    R.perDay.textContent = tr('{a} pe zi · {n} zile · plăți fixe {b} scăzute', { a: lei(n.spend / n.days), n: n.days, b: lei(n.fixed) })
      + (n.extra > 0 ? ` · ${tr('extra {sum}', { sum: lei(n.extra) })}` : '');
    R.ok.replaceChildren(n.usual > 0 ? h('div', { class: `p-ok${n.ok ? '' : ' bad'}` }, n.ok
      ? `✓ ${n.rest ? tr('Ajunge: cheltui de obicei ~{sum} în {n} zile', { sum: lei(n.usual), n: n.days }) : tr('Ajunge: cheltui de obicei ~{sum} pe lună', { sum: lei(n.usual) })}`
      : `✕ ${tr('Nu ajunge: cheltui de obicei ~{a} · lipsesc {b}', { a: lei(n.usual), b: lei(n.usual - n.spend) })}` + (n.fitPct > 0 ? ` · ${tr('economisește {p}% ca să ajungă', { p: n.fitPct })}` : '')) : '');
    if (n.inc > 0) paintSum();
    if (!R.title3) return;
    R.title3.textContent = tr('Unde pun cei {sum}', { sum: lei(n.saveAmt) });
    R.pill.className = 'pd-left' + (wasBlocked ? ' warn' : l <= 0.5 ? ' done' : '');
    const done = n.saveAmt > 0 ? Math.min(100, sum() / n.saveAmt * 100) : 0;
    R.pill.replaceChildren(
      h('div', { class: 'pd-lrow' }, h('span', {}, l > 0.5 ? tr('Mai ai de împărțit') : wasBlocked ? tr('Totul e împărțit · scade întâi la altceva') : `✓ ${tr('Totul împărțit')}`),
        h('b', {}, lei(l > 0.5 ? l : n.saveAmt))),
      h('div', { class: 'pd-lbar' }, R.bar),
      h('small', { class: 'pd-lcap' }, tr('Împărțit {a} din {b} · {p}%', { a: lei(sum()), b: lei(n.saveAmt), p: Math.round(done) })));
    R.bar.style.width = `${done}%`;
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
  /* --- 4. Cheltuieli extra (cadouri, cumpărături): se scad din banii de cheltuit, nu din economii --- */
  const card4 = h('section', { class: 'card p-c5' });
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const wishesOpen = () => (modOn('dorinte') ? state.wishes.filter(w => !w.done && w.price > 0) : []);
  // Obiectivele care mai au nevoie de bani; suma propusă e cât cere pe lună ca să fie gata la timp, cel mult cât îi lipsește.
  const goalsOpen = () => list.filter(d => d.id.startsWith('g:') && d.cap > 0);
  const goalCap = gid => byId('g:' + gid)?.cap ?? Infinity;
  const setExtras = arr => { c.extras[planMonth()] = arr; save(); paint4(); paint3(); };
  const toggleExtra = (match, make) => setExtras(extras().some(match) ? extras().filter(e => !match(e)) : [...extras(), make()]);
  let exTab = 'wish';
  function openExtraSheet() {
    const TABS = [...(wishesOpen().length ? [['wish', tr('Dorințe')]] : []), ...(goalsOpen().length ? [['goal', tr('Obiective')]] : []), ['own', tr('Altceva')]];
    if (!TABS.some(([t]) => t === exTab)) exTab = TABS[0][0];
    const body = h('div', { class: 'px-opts' });
    const exName = textInput('', { placeholder: tr('ex. Cadou mama'), maxlength: 40 });
    const exAmt = h('input', { class: 'px-amt', inputmode: 'decimal', autocomplete: 'off', placeholder: tr('Sumă'), 'aria-label': tr('Sumă') });
    const addOwn = () => {
      const v = parseAmount(exAmt.value);
      if (!(v > 0)) { exAmt.focus(); return; }
      setExtras([...extras(), { id: newId(), name: exName.value.trim() || tr('Cheltuială extra'), amt: round2(v) }]);
      exName.value = ''; exAmt.value = ''; exName.focus();
    };
    exAmt.addEventListener('keydown', e => { if (e.key === 'Enter') addOwn(); });
    const opt = (on, ic, title, sub, price, onclick) => h('button', { type: 'button', class: 'px-opt' + (on ? ' on' : ''), onclick },
      h('span', { class: 'px-ic' }, ic), h('span', {}, h('b', {}, title), h('small', {}, sub)), h('b', { class: 'px-p' }, lei(price)), h('span', { class: 'px-chk' }, on ? '✓' : ''));
    const paintBody = () => {
      if (exTab === 'own') {
        body.replaceChildren(h('div', { class: 'px-own' }, exName, exAmt, h('button', { type: 'button', class: 'btn secondary', onclick: addOwn }, tr('Adaugă'))),
          h('small', { class: 'muted' }, tr('Ce adaugi aici apare în listă și se scade din banii de cheltuit.')));
        return;
      }
      body.replaceChildren(...(exTab === 'wish'
        ? wishesOpen().map(w => {
          const on = extras().some(e => e.wish === w.id), price = round2(convert(w.price, w.currency || base(), base()));
          return opt(on, w.icon || '🎁', w.name, tr('din Lista de dorințe'), price,
            () => { toggleExtra(e => e.wish === w.id, () => ({ id: newId(), wish: w.id, icon: w.icon || '🎁', name: w.name, amt: price })); paintBody(); });
        })
        : goalsOpen().map(d => {
          const gid = d.id.slice(2), on = extras().some(e => e.goal === gid), g = state.goals.find(x => x.id === gid);
          const suggest = round2(Math.min(d.need || d.cap, d.cap));
          return opt(on, g?.icon || '🎯', g?.name || d.name, d.need ? tr('îi lipsesc {a} · {b}/lună ca să fie gata la timp', { a: lei(d.cap), b: lei(d.need) }) : tr('îi lipsesc {sum}', { sum: lei(d.cap) }), suggest,
            () => { toggleExtra(e => e.goal === gid, () => ({ id: newId(), goal: gid, icon: g?.icon || '🎯', name: g?.name || d.name, amt: suggest })); paintBody(); });
        })));
    };
    paintBody();
    const sh = openSheet({
      title: tr('Adaugă cheltuială extra'),
      body: h('div', { class: 'px-sheet' }, segmented(TABS.map(([value, label]) => ({ value, label })), exTab, v => { exTab = v; paintBody(); }), body),
      footer: btn(tr('Gata'), () => sh.close()),
    });
  }
  const totalEl = h('b', {});
  function paint4() {
    const list4 = extras();
    totalEl.textContent = lei(extraSum());
    card4.replaceChildren(...[
      step(4, c.period === 'next' ? tr('Cheltuieli extra luna viitoare') : tr('Cheltuieli extra luna asta')),
      h('p', { class: 'muted p-sub' }, tr('Cadouri, o cumpărătură mai mare… Se scad din banii de cheltuit, nu din ce pui deoparte.')),
      list4.length ? h('div', { class: 'px-list' }, list4.map(e => {
        const cap = e.goal ? goalCap(e.goal) : Infinity;
        const input = h('input', { class: 'px-amt', inputmode: 'decimal', autocomplete: 'off', value: forInput(e.amt), 'aria-label': tr('Sumă pentru {name}', { name: e.name }) });
        // la un obiectiv, suma nu trece de cât îi mai lipsește
        input.addEventListener('input', () => { e.amt = round2(Math.min(parseAmount(input.value) || 0, cap)); save(); totalEl.textContent = lei(extraSum()); refresh(); });
        input.addEventListener('change', () => { input.value = forInput(e.amt); });
        const sub = e.goal ? tr('obiectiv · îi lipsesc {sum}', { sum: lei(cap) }) : e.wish ? tr('din Lista de dorințe') : tr('scrisă de tine');
        return h('div', { class: 'px-row' },
          h('span', { class: 'px-ic' }, e.icon || (e.wish ? '🎁' : '🛍️')),
          h('span', { class: 'px-name' }, h('b', {}, e.name), h('small', {}, sub)),
          input,
          h('button', { type: 'button', class: 'px-x', 'aria-label': tr('Șterge'), onclick: () => setExtras(extras().filter(x => x.id !== e.id)) }, icon('x', 15)));
      })) : null,
      list4.length ? h('div', { class: 'px-total' }, h('span', {}, tr('Total extra')), totalEl) : null,
      h('button', { type: 'button', class: 'px-open', onclick: openExtraSheet }, `+ ${tr('Adaugă cheltuială extra')}`)].filter(Boolean));
  }

  // Pașii 2, 3 și 4 apar după ce scrii suma.
  function paintAll() {
    const has = numbers().inc > 0;
    card2.hidden = card3.hidden = card4.hidden = cardSum.hidden = !has;
    const n = numbers();
    totalLine.hidden = !(c.plusOn && (parseAmount(c.plus) || 0) > 0);
    totalLine.replaceChildren(tr('Total') + ': ', h('b', {}, lei(n.inc)));
    if (has) { paint3(); paint4(); }
  }

  /* --- Rezumat: toate sumele de mai sus, pe rând --- */
  const cardSum = h('section', { class: 'card p-c4 p-sum' });
  // Plățile fixe scăzute: la „Restul lunii” cele încă neplătite până la salariu / final de lună, la „Luna viitoare” toate, pe o lună.
  const fixedItems = () => (c.period !== 'next'
    ? now.commitments.map(x => [x.label, x.amount, x.kind])
    : [...state.subscriptions.map(x => [x.name, round2(subMonthly(x)), tr('Abonament')]),
      ...state.debts.filter(d => debtRemaining(d) > 0 && d.monthly > 0).map(d => [d.creditor, d.monthly, tr('Rată')])]);
  const sumGroup = (label, total, items, sign = '−') => h('div', { class: 'ps-g' },
    h('div', { class: 'ps-head' }, h('span', {}, label), h('b', {}, `${sign}${lei(total)}`)),
    items.length ? h('div', { class: 'ps-items' }, items.map(([name, v, kind]) => h('div', { class: 'ps-item' },
      h('span', {}, name, kind ? h('small', {}, ` · ${kind}`) : null), h('span', {}, lei(v))))) : null);
  function paintSum() {
    const n = numbers();
    const typed = parseAmount(c.inc) || 0, plus = c.plusOn ? parseAmount(c.plus) || 0 : 0;
    const saved = chosen().filter(d => amt(d.id) > 0).map(d => [d.group === 'fond' ? tr('Fond de urgență') : d.name, amt(d.id)]);
    if (left() > 0.5) saved.push([tr('neîmpărțit încă'), left()]);
    // ce rămâne de fapt; sub zero înseamnă că nu ajung banii
    const raw = round2(n.inc - n.fixed - n.saveAmt - n.extra);
    cardSum.replaceChildren(...[
      h('h2', { class: 'p-h' }, tr('Rezumat')),
      h('p', { class: 'muted p-sub' }, n.rest ? tr('Restul lunii · {n} zile', { n: n.days }) : tr('Luna viitoare')),
      sumGroup(tr('Cât am'), n.inc, plus > 0 ? [[tr('Suma scrisă'), typed], [tr('În plus'), plus]] : [], '+'),
      sumGroup(tr('Plăți fixe'), n.fixed, fixedItems()),
      sumGroup(tr('Pus deoparte ({p}%)', { p: c.save }), n.saveAmt, saved),
      n.extra > 0 ? sumGroup(tr('Cheltuieli extra'), n.extra, extras().map(e => [e.name, e.amt])) : null,
      h('div', { class: 'ps-total' + (raw < 0 ? ' neg' : '') }, h('span', {}, raw < 0 ? tr('Nu ajung banii, lipsesc') : tr('Îmi rămân de cheltuit')), h('b', {}, lei(Math.abs(raw)))),
      raw >= 0 ? h('small', { class: 'muted ps-day' }, tr('{a} pe zi · {n} zile', { a: lei(n.spend / n.days), n: n.days })) : null,
    ].filter(Boolean));
  }

  paintAll();
  const node = h('div', { class: 'page plan' },
    h('section', { class: 'card p-c1' }, step(1, tr('Cât am')), planSub, periodSeg, h('label', { class: 'field' }, incLbl, incInput), plusBox, totalLine),
    card2, card3, card4, cardSum);
  card2.classList.add('p-c2'); card3.classList.add('p-c3');
  return { title: tr('Îmi permit?'), node };
}
