// Piese pentru pagina Acasă: rândul „Urmează”, plăcile alese de tine și graficul pe categorii.

import { state, modOn, save, catByName } from '../store.js';
import { slotTab } from '../store.js';
import { today, addDays, fmtDate, fmtDayMonth, weekdayInitials, currentMonth, monthName } from '../dates.js';
import { money, moneyRound, moneyShort, num, pct, plural } from '../fmt.js';
import { budgetStats,
  expenseByCategory, incomeByCategory, savingsBreakdown, goalStats, efStats, netWorth, monthTotals, accountBalance, portfolioStats, subTotals, debtTotals, convert,
} from '../calc.js';
import { h, s, icon, go, openSheet, app, catGlyph, withEmoji, btn, linkBtn, toast } from '../ui.js';
import { paySubscription, saveDebtPayment } from '../actions.js';
import { openGoalForm } from '../forms.js';
import { distinctColors } from '../charts.js';
import { t as tr, catName } from '../i18n.js';

const kindIcon = c => (c.kind === tr('Rată') ? 'card' : 'repeat');

// Cerc de progres (SVG) cu ceva în mijloc.
export function ring(frac, color, size = 56, inner = null, stroke = 6) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac || 0));
  return h('div', { class: 'ring', style: { width: size + 'px', height: size + 'px' } },
    s('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, 'aria-hidden': 'true' },
      s('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: 'var(--soft)', 'stroke-width': stroke }),
      s('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: color, 'stroke-width': stroke, 'stroke-linecap': 'round', 'stroke-dasharray': `${C * f} ${C}`, transform: `rotate(-90 ${size / 2} ${size / 2})` })),
    inner ? h('span', { class: 'ring-in' }, inner) : null);
}

/* ---------- Plățile care urmează, în cardul „Azi mai poți cheltui” ---------- */

// Plățile rămân aici (și după scadență) până apeși pe ele și confirmi că le-ai plătit.
export function upcomingRow(a, openAll) {
  const list = a.commitments || [];
  if (!list.length) {
    return h('p', { class: 'up-none' }, icon('check', 15),
      a.payday ? tr('Nicio plată programată până la salariu') : tr('Nicio plată programată până la final de lună'));
  }
  const shown = list.slice(0, 3);
  const tap = fn => e => { e.stopPropagation(); fn(); };
  return h('div', { class: 'up-row' },
    h('span', { class: 'up-label' }, tr('Urmează')),
    h('div', { class: 'up-chips' },
      shown.map(c => h('button', { type: 'button', class: 'up-chip' + (c.late ? ' late' : ''), onclick: tap(() => confirmPaid(c, list)) },
        icon(kindIcon(c), 13), h('b', {}, c.label), h('small', {}, `${dueText(c)} · ${money(c.amount)}`))),
      list.length > 3 ? h('button', { type: 'button', class: 'up-chip more', onclick: tap(() => openAll?.()) }, `+${list.length - 3}`) : null));
}

// „azi”, „restantă din 3 oct.” sau data scadenței.
export const dueText = c => (c.date === today() ? tr('azi') : c.late ? tr('restantă din {date}', { date: fmtDayMonth(c.date) }) : fmtDayMonth(c.date));

// Confirmarea unei plăți de la „Urmează”. Se confirmă mereu cea mai veche plată neconfirmată a abonamentului / datoriei.
export function confirmPaid(c, list = [c], after) {
  const first = list.find(x => (c.subId && x.subId === c.subId) || (c.debtId && x.debtId === c.debtId)) || c;
  const sub = first.subId && state.subscriptions.find(x => x.id === first.subId);
  const debt = first.debtId && state.debts.find(x => x.id === first.debtId);
  if (!sub && !debt) return;
  const done = msg => { sh.close(); after?.(); toast(msg); };
  const sh = openSheet({
    title: tr('Ai plătit {name}?', { name: first.label }),
    body: h('div', { style: { display: 'grid', gap: '10px' } },
      h('p', { class: 'muted' }, tr('{kind} de {sum}, cu scadența pe {date}.', { kind: first.kind, sum: money(first.amount), date: fmtDate(first.date) })),
      h('p', { class: 'muted' }, tr('Dacă confirmi, se adaugă ca cheltuială din contul Curent, cu data de azi, și dispare de la „Urmează”.')),
      sub ? linkBtn(tr('Sari peste ea fără să o înregistrezi'), () => { paySubscription(sub, false); done(tr('Plată sărită')); }, null) : null),
    footer: h('div', { class: 'btn-row' },
      btn(tr('Nu încă'), () => sh.close(), 'ghost'),
      btn(tr('Da, am plătit'), () => {
        if (sub) paySubscription(sub);
        else saveDebtPayment({ debtId: debt.id, date: today(), amount: first.amount }, true, catByName('Rate credite', 'cheltuiala')?.id || null);
        done(tr('Plată confirmată'));
      }, 'primary')),
  });
}

/* ---------- Ultimele 7 zile: cheltuieli pe zile (azi e ultima bară) ---------- */

function weekDays() {
  const t = today();
  return Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
}

function weekData() {
  const days = weekDays();
  const vals = days.map(d => state.transactions.filter(x => x.type === 'cheltuiala' && x.date === d).reduce((acc, x) => acc + x.amount, 0));
  return { days, vals, total: vals.reduce((x, y) => x + y, 0), max: Math.max(1, ...vals) };
}

export function weekBars(compact = false) {
  const { days, vals, max } = weekData();
  const t = today(), ini = weekdayInitials();
  const dayIni = d => ini[(new Date(d + 'T00:00:00').getDay() + 6) % 7];
  return h('div', { class: 'wk' + (compact ? ' compact' : '') }, days.map((d, i) => h('div', { class: 'wk-col' + (d === t ? ' today' : '') },
    compact ? null : h('small', { class: 'wk-val' }, vals[i] ? moneyShort(vals[i]) : ''),
    h('div', { class: 'wk-bar' }, h('i', { style: { height: `${Math.max(vals[i] ? 6 : 0, (vals[i] / max) * 100)}%` } })),
    h('span', { class: 'wk-day' }, dayIni(d)))));
}

/* ---------- Tablou: 4 plăci, fiecare aleasă de tine ---------- */

// Fără „Obiectiv” și „Top categorie”: obiectivele și categoriile apar oricum mai jos pe Acasă.
const DEFAULT_TILES = ['week', 'fond', 'rata', 'abonamente'];

// [id, nume, iconiță, modulul de care ține (sau null), construire]
const TILES = [
  ['week', 'Ultimele 7 zile', 'calendar', null, () => {
    const { total } = weekData();
    return [h('b', { class: 't-val' }, moneyRound(total)), weekBars(true)];
  }, '#/tranzactii'],
  ['goal', 'Obiectiv', 'target', null, () => {
    const goal = state.goals.filter(g => !g.done).map(g => ({ g, st: goalStats(g) })).sort((x, y) => y.st.pct - x.st.pct)[0];
    return goal
      ? [ring(goal.st.pct, goal.g.color, 58, h('span', {}, `${Math.round(goal.st.pct * 100)}%`)), h('b', { class: 't-name' }, `${goal.g.icon || '🎯'} ${goal.g.name}`)]
      : [h('span', { class: 't-ic' }, icon('target', 18)), h('b', { class: 't-name' }, tr('Creează primul obiectiv'))];
  }, '#/economii'],
  ['fond', 'Fond de urgență', 'shield', null, () => {
    const ef = efStats();
    return [h('b', { class: 't-val' }, h('i', { class: `dot-${ef.level}` }), tr('{n} luni', { n: num(ef.covered, 1) })),
      h('div', { class: 'bar' }, h('i', { style: { width: `${Math.min(100, ef.pct * 100)}%`, background: `var(--${ef.level})` } })),
      h('small', {}, tr('din {n} luni țintă', { n: ef.months }))];
  }, '#/fond'],
  ['categorie', 'Top categorie', 'tag', null, () => {
    const c = expenseByCategory(currentMonth())[0];
    const tot = monthTotals(currentMonth()).expense || 1;
    return c ? [h('span', { class: 't-emoji', style: { color: c.color } }, catGlyph(c.icon, c.label, 44)), h('b', { class: 't-name' }, c.label), h('small', {}, `${moneyRound(c.value)} · ${Math.round((c.value / tot) * 100)}%`)]
      : [h('b', { class: 't-name' }, tr('Nicio cheltuială încă'))];
  }, '#/tranzactii'],
  ['azi', 'Cheltuit azi', 'minus', null, () => {
    const t = today();
    const v = state.transactions.filter(x => x.type === 'cheltuiala' && x.date === t).reduce((a, x) => a + x.amount, 0);
    const n = state.transactions.filter(x => x.type === 'cheltuiala' && x.date === t).length;
    return [h('b', { class: 't-val' }, moneyRound(v)), h('small', {}, n ? tr('{n} cheltuieli', { n }) : tr('nimic încă'))];
  }, '#/tranzactii'],
  ['rata', 'Rată de economisire', 'trend', null, () => {
    const tt = monthTotals(currentMonth());
    const r = tt.income > 0 ? (tt.income - tt.expense) / tt.income : 0;
    return [ring(Math.max(0, r), 'var(--pos)', 58, h('span', {}, `${Math.round(r * 100)}%`)), h('small', {}, tr('din venituri, luna asta'))];
  }, '#/rapoarte'],
  ['economii', 'Total economii', 'wallet', null, () => [h('b', { class: 't-val' }, moneyRound(accountBalance('economii'))), h('small', {}, tr('toate fondurile și obiectivele'))], '#/economii'],
  ['investitii', 'Portofoliu', 'trend', 'investitii', () => {
    const p = portfolioStats();
    return [h('b', { class: 't-val' }, moneyRound(p.value)), h('small', { class: p.profit >= 0 ? 'pos' : 'neg' }, `${p.profit >= 0 ? '▲' : '▼'} ${pct(p.pct, 1, true)}`)];
  }, '#/investitii'],
  ['abonamente', 'Abonamente', 'repeat', 'abonamente', () => {
    const tot = subTotals();
    return [h('b', { class: 't-val' }, moneyRound(tot.monthly)), h('small', {}, tr('pe lună · {n} active', { n: state.subscriptions.length }))];
  }, '#/abonamente'],
  ['datorii', 'Datorii rămase', 'card', 'datorii', () => {
    const d = debtTotals();
    return [h('b', { class: 't-val' }, moneyRound(d.remaining)), h('small', {}, d.monthly > 0 ? tr('Rate: {sum}/lună', { sum: moneyRound(d.monthly) }) : tr('Nicio rată activă'))];
  }, '#/datorii'],
  ['avere', 'Avere netă', 'scale', 'avere', () => {
    const nw = netWorth();
    return [h('b', { class: 't-val' }, moneyRound(modOn('investitii') ? nw.with : nw.without)), h('small', {}, modOn('investitii') ? tr('cu investiții') : tr('fără investiții'))];
  }, '#/avere'],
  ['bugete', 'Bugete', 'budget', 'bugete', () => {
    const list = budgetStats(currentMonth());
    const over = list.filter(b => b.left < 0).length;
    if (!list.length) return [h('span', { class: 't-ic' }, icon('budget', 18)), h('b', { class: 't-name' }, tr('Pune primul buget'))];
    if (over) return [h('b', { class: 't-val neg' }, plural(over, tr('buget depășit'), tr('bugete depășite'))), h('small', {}, tr('din {n} cu limită', { n: list.length }))];
    const b = list[0];
    return [h('b', { class: 't-name' }, `${catName(b.cat)} · ${Math.round(b.pct * 100)}%`),
      h('div', { class: 'bar' }, h('i', { style: { width: `${Math.min(100, b.pct * 100)}%`, background: b.pct >= 0.85 ? 'var(--warn)' : 'var(--accent)' } })),
      h('small', {}, tr('cel mai aproape de limită'))];
  }, '#/bugete'],
  ['dorinte', 'Listă de dorințe', 'gift', 'dorinte', () => {
    const open = (state.wishes || []).filter(w => !w.done);
    const sum = open.reduce((a, w) => a + (w.price != null ? convert(w.price, w.currency || state.settings.currency, state.settings.currency) : 0), 0);
    return [h('b', { class: 't-val' }, moneyRound(sum)), h('small', {}, tr('{n} pe listă', { n: open.length }))];
  }, '#/dorinte'],
];
const tileDef = id => TILES.find(x => x[0] === id && (!x[3] || modOn(x[3])));
const availableTiles = () => TILES.filter(x => !x[3] || modOn(x[3]));

function chosenTiles() {
  const saved = Array.isArray(state.settings.homeTiles) ? state.settings.homeTiles : DEFAULT_TILES;
  // O placă al cărei modul e ascuns e înlocuită cu prima nefolosită.
  const out = saved.slice(0, 4).map(id => (tileDef(id) ? id : null));
  for (let i = 0; i < 4; i++) {
    if (!out[i]) out[i] = availableTiles().map(x => x[0]).find(id => !out.includes(id));
  }
  return out;
}

export const chosenTileNames = () => chosenTiles().map(id => tr(tileDef(id)[1]));

export function tilesGrid() {
  return h('div', { class: 'bento' }, chosenTiles().map(id => {
    const [, name, , , build, hash] = tileDef(id);
    return h('button', { type: 'button', class: `tile t-${id}`, onclick: () => go(hash) }, h('span', { class: 't-label' }, tr(name)), ...[build()].flat());
  }));
}

// Alegi o placă (sus), apoi ce să arate (jos). Se salvează pe loc.
/* ---------- Scurtăturile de pe Acasă (cel mult 4, alese din Setări → Aspect) ---------- */

// [id, nume, iconiță, adresă, modul necesar]. Cele aflate deja în bara de jos nu apar (ar fi de două ori pe ecran).
const QUICK = [
  ['rapoarte', 'Rapoarte', 'report', '#/rapoarte', null],
  ['abonamente', 'Abonamente', 'repeat', '#/abonamente', 'abonamente'],
  ['datorii', 'Datorii', 'card', '#/datorii', 'datorii'],
  ['dorinte', 'Dorințe', 'gift', '#/dorinte', 'dorinte'],
  ['plan', 'Îmi permit?', 'calc', '#/plan', null],
  ['bugete', 'Bugete', 'budget', '#/bugete', 'bugete'],
  ['calculator', 'Calc. investiții', 'trend', '#/calculator', null],
  ['investitii', 'Investiții', 'trend', '#/investitii', 'investitii'],
  ['fond', 'Fond de urgență', 'shield', '#/fond', null],
  ['categorii', 'Categorii', 'tag', '#/categorii', null],
];
const DEFAULT_QUICK = ['rapoarte', 'abonamente', 'datorii', 'plan'];
const MAX_QUICK = 4;
// Pagina deschisă de fiecare placă (Avere netă e acum o filă din Rapoarte).
const tilePages = () => chosenTiles().map(id => { const pg = (tileDef(id)?.[5] || '').slice(2); return pg === 'avere' ? 'rapoarte' : pg; });
// Nu apar: paginile din bara de jos și cele care au deja o placă pe Acasă (ar fi de două ori pe ecran).
const quickAvailable = () => {
  const taken = new Set([slotTab()[0], ...tilePages()]);
  return QUICK.filter(q => (!q[4] || modOn(q[4])) && !taken.has(q[0]));
};
// Mereu 4: cele alese de tine (dacă se pot afișa), completate cu următoarele din listă.
function chosenQuick() {
  const saved = Array.isArray(state.settings.quickLinks) ? state.settings.quickLinks : DEFAULT_QUICK;
  const ok = quickAvailable().map(q => q[0]);
  const out = saved.filter(id => ok.includes(id));
  for (const id of ok) if (out.length < MAX_QUICK && !out.includes(id)) out.push(id);
  return out.slice(0, MAX_QUICK);
}
const quickName = id => tr(QUICK.find(q => q[0] === id)[1]);
export const chosenQuickNames = () => chosenQuick().map(quickName);

export function quickLinksRow() {
  const ids = chosenQuick();
  if (!ids.length) return null;
  return h('div', { class: 'quick-links', style: { '--n': ids.length } }, ids.map(id => {
    const [, label, ico, hash] = QUICK.find(q => q[0] === id);
    return h('button', { type: 'button', class: 'ql', onclick: () => go(hash) }, h('span', { class: 'ql-ic' }, icon(ico, 20)), h('span', {}, tr(label)));
  }));
}

// Ca la plăci: alegi un loc, apoi pagina; dacă pagina e deja în alt loc, cele două își schimbă locul.
export function openQuickEditor() {
  let slot = 0;
  const slots = h('div', { class: 'te-slots' }), options = h('div', { class: 'te-options' });
  const paint = () => {
    const cur = chosenQuick();
    if (slot >= cur.length) slot = 0;
    slots.replaceChildren(...cur.map((id, i) => h('button', {
      type: 'button', class: 'te-slot' + (i === slot ? ' on' : ''), onclick: () => { slot = i; paint(); },
    }, h('small', {}, tr('Locul {n}', { n: i + 1 })), h('b', {}, quickName(id)))));
    options.replaceChildren(...quickAvailable().map(([id, name, ico]) => h('button', {
      type: 'button', class: 'te-opt' + (cur[slot] === id ? ' on' : '') + (cur.includes(id) && cur[slot] !== id ? ' used' : ''),
      onclick: () => {
        const next = [...cur], other = next.indexOf(id);
        if (other >= 0) next[other] = next[slot];
        next[slot] = id;
        state.settings.quickLinks = next;
        save(); app.rerender();
        slot = (slot + 1) % next.length;
        paint();
      },
    }, icon(ico, 20), h('span', {}, tr(name)))));
  };
  paint();
  openSheet({
    title: tr('Scurtăturile de pe Acasă'),
    body: h('div', {},
      h('p', { class: 'muted' }, tr('Alege un loc, apoi pagina. Nu apar paginile din bara de jos și cele care au deja o placă pe Acasă.')),
      slots, options,
      h('button', { type: 'button', class: 'link-btn small', onclick: () => { state.settings.quickLinks = null; save(); app.rerender(); paint(); } }, icon('refresh', 16), tr('Revino la cele implicite'))),
  });
}

export function openTileEditor() {
  let slot = 0;
  const preview = h('div', { class: 'te-slots' });
  const options = h('div', { class: 'te-options' });
  const paint = () => {
    const cur = chosenTiles();
    preview.replaceChildren(...cur.map((id, i) => h('button', {
      type: 'button', class: 'te-slot' + (i === slot ? ' on' : ''), onclick: () => { slot = i; paint(); },
    }, h('small', {}, tr('Placa {n}', { n: i + 1 })), h('b', {}, tr(tileDef(id)[1])))));
    options.replaceChildren(...availableTiles().map(([id, name, ico]) => h('button', {
      type: 'button', class: 'te-opt' + (cur[slot] === id ? ' on' : '') + (cur.includes(id) && cur[slot] !== id ? ' used' : ''),
      onclick: () => {
        const next = [...cur];
        const other = next.indexOf(id);
        if (other >= 0) next[other] = next[slot]; // dacă e deja în altă placă, le schimbăm între ele
        next[slot] = id;
        state.settings.homeTiles = next;
        save();
        app.rerender();
        slot = (slot + 1) % 4;
        paint();
      },
    }, icon(ico, 20), h('span', {}, tr(name)))));
  };
  paint();
  openSheet({
    title: tr('Personalizează plăcile'),
    body: h('div', {},
      h('p', { class: 'muted' }, tr('Alege o placă, apoi ce să arate. Dacă alegi ceva aflat deja în altă placă, cele două își schimbă locul.')),
      preview, options,
      h('button', { type: 'button', class: 'link-btn small', onclick: () => { state.settings.homeTiles = null; save(); app.rerender(); paint(); } }, icon('refresh', 16), tr('Revino la plăcile implicite'))),
  });
}

/* ---------- Graficul de pe Acasă, mai curat: file de tab, inel cu totalul, primele 4 categorii ---------- */

let cleanTab = 'cheltuieli';

function segRing(items, size = 124, stroke = 14) {
  const total = items.reduce((a, i) => a + i.value, 0) || 1;
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, gap = items.length > 1 ? 2.5 : 0;
  let acc = 0;
  return s('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, 'aria-hidden': 'true' },
    s('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: 'var(--soft)', 'stroke-width': stroke }),
    ...items.map(it => {
      const len = (it.value / total) * C;
      const el = s('circle', {
        cx: size / 2, cy: size / 2, r, fill: 'none', stroke: it.color, 'stroke-width': stroke, 'stroke-linecap': 'butt',
        'stroke-dasharray': `${Math.max(0.5, len - gap)} ${C}`, 'stroke-dashoffset': -acc, transform: `rotate(-90 ${size / 2} ${size / 2})`,
      });
      acc += len;
      return el;
    }));
}

export function cleanChart(m, upTo, { onCat, onInc, savingsIcons }) {
  const box = h('div', { class: 'cc-body' });
  const tabs = h('div', { class: 'cc-tabs', role: 'tablist' });
  const TABS = [['cheltuieli', 'Cheltuieli'], ['venituri', 'Venituri'], ['economii', 'Economii']];
  const paint = () => {
    tabs.replaceChildren(...TABS.map(([id, label]) => h('button', {
      type: 'button', role: 'tab', class: id === cleanTab ? 'on' : '', 'aria-selected': String(id === cleanTab),
      onclick: () => { cleanTab = id; paint(); },
    }, tr(label))));
    let items, empty, onTap, count;
    // În centrul inelului: câte elemente sunt și luna (totalul e deja în pastilele de sub cardul cu sold).
    if (cleanTab === 'economii') {
      items = savingsIcons(savingsBreakdown(upTo)).sort((a, b) => b.value - a.value);
      empty = tr('Nu ai încă economii.');
      onTap = () => go('#/economii');
      count = n => plural(n, tr('fond'), tr('fonduri'));
    } else if (cleanTab === 'venituri') {
      items = incomeByCategory(m);
      empty = tr('Niciun venit în această lună.');
      onTap = it => onInc(it);
      count = n => plural(n, tr('sursă'), tr('surse'));
    } else {
      items = expenseByCategory(m);
      empty = tr('Nicio cheltuială în această lună.');
      onTap = it => onCat(it);
      count = n => plural(n, tr('categorie'), tr('categorii'));
    }
    if (!items.length) { box.replaceChildren(h('p', { class: 'muted cc-empty' }, empty)); return; }
    items = distinctColors(items); // două felii vecine nu au aceeași culoare
    const total = items.reduce((a, i) => a + i.value, 0);
    const top = items.slice(0, 4);
    const rest = items.slice(4);
    box.replaceChildren(
      h('div', { class: 'cc-ring' }, segRing(items), h('div', { class: 'cc-center' }, h('small', {}, count(items.length)), h('b', {}, monthName(m)))),
      h('div', { class: 'cc-legend' },
        top.map(it => h('button', { type: 'button', class: 'cc-row', onclick: () => onTap(it) },
          h('i', { style: { background: it.color } }),
          h('span', { class: 'cc-name' }, withEmoji(it.icon, it.label)),
          h('b', {}, `${Math.round((it.value / total) * 100)}%`))),
        rest.length ? h('small', { class: 'cc-more' }, tr('+ încă {n}', { n: rest.length })) : null));
  };
  paint();
  return h('section', { class: 'card cc' }, tabs, box);
}
