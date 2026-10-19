// Piese pentru pagina Acasă: rândul „Urmează”, plăcile alese de tine și graficul pe categorii.

import { state, modOn, save } from '../store.js';
import { today, addDays, fmtDayMonth, weekdayInitials, currentMonth } from '../dates.js';
import { money, moneyShort, num, pct } from '../fmt.js';
import {
  expenseByCategory, incomeByCategory, savingsBreakdown, goalStats, efStats, netWorth, monthTotals, accountBalance, portfolioStats, subTotals, debtTotals, convert,
} from '../calc.js';
import { h, s, icon, go, openSheet, app, catGlyph, withEmoji } from '../ui.js';
import { openGoalForm } from '../forms.js';
import { t as tr } from '../i18n.js';

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

export function upcomingRow(a) {
  const list = a.commitments || [];
  if (!list.length) {
    return h('p', { class: 'up-none' }, icon('check', 15),
      a.payday ? tr('Nicio plată programată până la salariu') : tr('Nicio plată programată până la final de lună'));
  }
  const shown = list.slice(0, 3);
  return h('div', { class: 'up-row' },
    h('span', { class: 'up-label' }, tr('Urmează')),
    h('div', { class: 'up-chips' },
      shown.map(c => h('span', { class: 'up-chip' }, icon(kindIcon(c), 13), h('b', {}, c.label), h('small', {}, `${fmtDayMonth(c.date)} · ${money(c.amount)}`))),
      list.length > 3 ? h('span', { class: 'up-chip more' }, `+${list.length - 3}`) : null));
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

const DEFAULT_TILES = ['week', 'goal', 'fond', 'categorie'];

// [id, nume, iconiță, modulul de care ține (sau null), construire]
const TILES = [
  ['week', 'Ultimele 7 zile', 'calendar', null, () => {
    const { total } = weekData();
    return [h('b', { class: 't-val' }, money(total)), weekBars(true)];
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
    return c ? [h('span', { class: 't-emoji', style: { color: c.color } }, catGlyph(c.icon, c.label, 44)), h('b', { class: 't-name' }, c.label), h('small', {}, `${money(c.value)} · ${Math.round((c.value / tot) * 100)}%`)]
      : [h('b', { class: 't-name' }, tr('Nicio cheltuială încă'))];
  }, '#/tranzactii'],
  ['azi', 'Cheltuit azi', 'minus', null, () => {
    const t = today();
    const v = state.transactions.filter(x => x.type === 'cheltuiala' && x.date === t).reduce((a, x) => a + x.amount, 0);
    const n = state.transactions.filter(x => x.type === 'cheltuiala' && x.date === t).length;
    return [h('b', { class: 't-val' }, money(v)), h('small', {}, n ? tr('{n} cheltuieli', { n }) : tr('nimic încă'))];
  }, '#/tranzactii'],
  ['rata', 'Rată de economisire', 'trend', null, () => {
    const tt = monthTotals(currentMonth());
    const r = tt.income > 0 ? (tt.income - tt.expense) / tt.income : 0;
    return [ring(Math.max(0, r), 'var(--pos)', 58, h('span', {}, `${Math.round(r * 100)}%`)), h('small', {}, tr('din venituri, luna asta'))];
  }, '#/rapoarte'],
  ['economii', 'Total economii', 'wallet', null, () => [h('b', { class: 't-val' }, money(accountBalance('economii'))), h('small', {}, tr('toate fondurile și obiectivele'))], '#/economii'],
  ['investitii', 'Portofoliu', 'trend', 'investitii', () => {
    const p = portfolioStats();
    return [h('b', { class: 't-val' }, money(p.value)), h('small', { class: p.profit >= 0 ? 'pos' : 'neg' }, `${p.profit >= 0 ? '▲' : '▼'} ${pct(p.pct, 1, true)}`)];
  }, '#/investitii'],
  ['abonamente', 'Abonamente', 'repeat', 'abonamente', () => {
    const tot = subTotals();
    return [h('b', { class: 't-val' }, money(tot.monthly)), h('small', {}, tr('pe lună · {n} active', { n: state.subscriptions.length }))];
  }, '#/abonamente'],
  ['datorii', 'Datorii rămase', 'card', 'datorii', () => {
    const d = debtTotals();
    return [h('b', { class: 't-val' }, money(d.remaining)), h('small', {}, d.monthly > 0 ? tr('Rate: {sum}/lună', { sum: money(d.monthly) }) : tr('Nicio rată activă'))];
  }, '#/datorii'],
  ['avere', 'Avere netă', 'scale', 'avere', () => {
    const nw = netWorth();
    return [h('b', { class: 't-val' }, money(modOn('investitii') ? nw.with : nw.without)), h('small', {}, modOn('investitii') ? tr('cu investiții') : tr('fără investiții'))];
  }, '#/avere'],
  ['dorinte', 'Listă de dorințe', 'gift', 'dorinte', () => {
    const open = (state.wishes || []).filter(w => !w.done);
    const sum = open.reduce((a, w) => a + (w.price != null ? convert(w.price, w.currency || state.settings.currency, state.settings.currency) : 0), 0);
    return [h('b', { class: 't-val' }, money(sum)), h('small', {}, tr('{n} pe listă', { n: open.length }))];
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
    let items, empty, onTap;
    if (cleanTab === 'economii') {
      items = savingsIcons(savingsBreakdown(upTo)).sort((a, b) => b.value - a.value);
      empty = tr('Nu ai încă economii.');
      onTap = () => go('#/economii');
    } else if (cleanTab === 'venituri') {
      items = incomeByCategory(m);
      empty = tr('Niciun venit în această lună.');
      onTap = it => onInc(it);
    } else {
      items = expenseByCategory(m);
      empty = tr('Nicio cheltuială în această lună.');
      onTap = it => onCat(it);
    }
    if (!items.length) { box.replaceChildren(h('p', { class: 'muted cc-empty' }, empty)); return; }
    const total = items.reduce((a, i) => a + i.value, 0);
    const top = items.slice(0, 4);
    const rest = items.slice(4);
    box.replaceChildren(
      h('div', { class: 'cc-ring' }, segRing(items), h('div', { class: 'cc-center' }, h('small', {}, tr('Total')), h('b', {}, moneyShort(total)))),
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
