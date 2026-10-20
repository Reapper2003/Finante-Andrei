import { state, commit, setState } from '../store.js';
import { today, currentMonth, monthEnd, fmtDate, fmtDayMonth, weekdayName, longDate, addDays } from '../dates.js';
import { money, moneyParts, moneyShort, plural } from '../fmt.js';
import { accountBalance, monthTotals, goalStats, dailyAllowance } from '../calc.js';
import { h, s, icon, card, sectionHead, linkBtn, progress, btn, go, toast, openSheet, swipeRow, helpBtn } from '../ui.js';
import { getMonth, monthChip } from '../menu.js';
import { openTxForm, openCategoryTxSheet, openGoalForm, openGoalActions, openSalaryDay } from '../forms.js';
import { buildDemo } from '../demo.js';
import { runAutomations } from '../actions.js';
import { t as tr } from '../i18n.js';
import { HERO_ART, HERO_SCENES } from '../heroArt.js';
import { showTransactions } from './transactions.js';
import { upcomingRow, confirmPaid, dueText, tilesGrid, cleanChart } from './homeParts.js';

export function loadDemo() {
  setState(buildDemo(state.settings));
  runAutomations();
  commit();
  toast(tr('Date demo încărcate'));
}

// Suma mare, cu zecimalele și moneda mai mici: 9.612,60 lei
export function bigMoney(v, opts = {}, cls = 'big') {
  const p = moneyParts(v, opts);
  return h('strong', { class: `${cls} num${v < 0 ? ' neg' : ''}` }, p.main, p.rest ? h('span', { class: 'dec' }, p.rest) : null);
}

// Card de goal pentru liste (folosit și în pagina Economii). Cu onDelete: glisare spre stânga → coș de gunoi.
export function goalCard(g, onDelete) {
  const st = goalStats(g);
  let line = null;
  if (!g.done && st.left > 0 && g.deadline) {
    line = st.overdue
      ? h('p', { class: 'goal-line neg' }, tr('Termenul ({date}) a trecut', { date: fmtDate(g.deadline) }))
      : h('p', { class: 'goal-line' }, tr('Trebuie să pui {sum}/lună ca să ajungi la timp', { sum: money(st.perMonth, { cur: st.cur }) }));
  } else if (st.left <= 0) line = h('p', { class: 'goal-line pos' }, tr('Ținta a fost atinsă 🎉'));
  const body = [
    h('div', { class: 'goal-top' },
      h('span', { class: 'goal-ic', style: { background: g.color + '55' } }, g.icon || '🎯'),
      h('span', { class: 'goal-name' }, g.name),
      h('span', { class: 'goal-pct' }, `${Math.min(999, Math.round(st.pct * 100))}%`)),
    progress(st.pct, g.color),
    h('p', { class: 'goal-amt' }, tr('{a} din {b}', { a: money(st.saved, { cur: st.cur }), b: money(g.target, { cur: st.cur }) })),
    line];
  const cls = 'goal' + (g.done ? ' done' : '');
  if (onDelete) return swipeRow(h('div', { class: cls }, body), { onTap: () => openGoalActions(g), onDelete: () => onDelete(g), trash: true, cls: 'goal-swipe' });
  return h('button', { type: 'button', class: cls, onclick: () => openGoalActions(g) }, body);
}

// Card mic de goal, pentru șirul orizontal de pe Acasă.
function goalMini(g) {
  const st = goalStats(g);
  return h('button', { type: 'button', class: 'gcard', onclick: () => openGoalActions(g) },
    h('span', { class: 'cat-ic', style: { width: '40px', height: '40px', background: g.color + '40', fontSize: '19px' } }, g.icon || '🎯'),
    h('b', {}, g.name),
    h('small', {}, tr('{a} din {b}', { a: money(st.saved, { cur: st.cur }), b: money(g.target, { cur: st.cur }) })),
    progress(st.pct, g.color));
}

function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? tr('Bună dimineața') : hr < 18 ? tr('Bună ziua') : tr('Bună seara');
}

// Mică linie cu evoluția soldului din contul Curent în luna afișată.
function sparkline(m) {
  const last = m === currentMonth() ? today() : monthEnd(m);
  const days = [];
  for (let d = `${m}-01`; d <= last; d = addDays(d, 1)) days.push(d);
  if (days.length < 2) return null;
  const vals = days.map(d => accountBalance('curent', d));
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const W = 200, H = 64;
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * W).toFixed(1)} ${(H - 6 - ((v - min) / span) * (H - 12)).toFixed(1)}`);
  return s('svg', { class: 'spark', width: W, height: H, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', fill: 'none', 'aria-hidden': 'true' },
    s('path', { d: 'M' + pts.join(' L'), stroke: 'currentColor', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}

function openCommitments(a) {
  const sh = openSheet({
    title: a.payday ? tr('De plătit până la salariu') : tr('De plătit până la final de lună'),
    body: h('div', {},
      h('p', { class: 'muted' }, tr('Total: {sum} · se scad din suma pe zi.', { sum: money(a.committed) })),
      h('p', { class: 'muted' }, tr('Apasă pe o plată ca să confirmi că ai plătit-o.')),
      h('div', { class: 'list' }, a.commitments.map(c => h('button', { type: 'button', class: 'row', onclick: () => confirmPaid(c, a.commitments, () => sh.close()) },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, c.label), h('div', { class: 'row-sub' + (c.late ? ' warn-text' : '') }, `${c.kind} · ${c.late || c.date === today() ? dueText(c) : fmtDate(c.date)}`)),
        h('span', { class: 'amt' }, money(c.amount)))))),
  });
}

function gauge(fraction, label, color) {
  const C = 2 * Math.PI * 42, f = Math.max(0, Math.min(1, fraction));
  return h('div', { class: 'gauge' },
    s('svg', { viewBox: '0 0 100 100', width: 92, height: 92, 'aria-hidden': 'true' },
      s('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: 'var(--soft)', 'stroke-width': 10 }),
      s('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: color, 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-dasharray': `${C * f} ${C}`, transform: 'rotate(-90 50 50)' })),
    h('b', {}, label));
}

function allowanceDetails(a) {
  const links = h('div', { class: 'allow-links' },
    a.commitments.length
      ? linkBtn(tr('De plătit până pe {date}: {sum}', { date: fmtDayMonth(a.end), sum: money(a.committed) }), () => openCommitments(a), null)
      : null,
    linkBtn(a.payday ? tr('Salariu: {day}, {date}', { day: weekdayName(a.payday), date: fmtDayMonth(a.payday) }) : tr('Setează ziua salariului'), openSalaryDay, 'settings'));
  const until = a.payday
    ? tr('până la salariu ({day}, {date})', { day: weekdayName(a.payday), date: fmtDayMonth(a.payday) })
    : tr('până pe {date}', { date: fmtDayMonth(a.end) });
  const over = a.leftToday < 0;
  const left = a.perDay > 0 ? a.leftToday / a.perDay : 0;
  const body = a.free <= 0
    ? h('div', { class: 'allow' }, gauge(0, '0%', 'var(--warn)'),
      h('div', { class: 'allow-main' }, bigMoney(a.free, {}, 'mid'), h('p', { class: 'muted' }, tr('Plățile rămase luna aceasta depășesc banii din contul Curent.'))))
    : h('div', { class: 'allow' },
      gauge(over ? 1 : left, over ? tr('depășit') : `${Math.round(Math.max(0, left) * 100)}%\n${tr('rămas')}`, over ? 'var(--warn)' : 'var(--accent)'),
      h('div', { class: 'allow-main' },
        bigMoney(a.leftToday, {}, 'mid'),
        h('p', { class: 'muted' }, over
          ? tr('Ai depășit suma de azi. Media rămasă: {sum}/zi.', { sum: money(a.perDay) })
          : tr('din {sum}/zi · {days} {until}', { sum: money(a.perDay), days: plural(a.daysLeft, tr('zi'), tr('zile')), until }))));
  openSheet({ title: tr('Cât pot cheltui azi'), body: h('div', {}, body, links) });
}

function allowanceCard() {
  const a = dailyAllowance();
  const over = a.free > 0 && a.leftToday < 0;
  const frac = a.free > 0 && a.perDay > 0 ? Math.max(0, Math.min(1, a.leftToday / a.perDay)) : 0;
  const sub = a.free <= 0 ? tr('Plățile rămase depășesc banii din cont')
    : over ? tr('Ai depășit suma de azi cu {sum}', { sum: money(-a.leftToday) })
      : tr('din {sum}/zi · {days} {until}', {
        sum: money(a.perDay), days: plural(a.daysLeft, tr('zi'), tr('zile')),
        until: a.payday ? tr('până la salariu') : tr('până la final de lună'),
      });
  return h('div', { class: 'card allow2' + (over || a.free <= 0 ? ' over' : ''), role: 'button', tabindex: 0, onclick: () => allowanceDetails(a) },
    h('div', { class: 'allow2-top' }, h('span', {}, tr('Azi mai poți cheltui')), helpBtn('azi'), h('span', { class: 'chev' }, icon('chevR', 18))),
    bigMoney(Math.max(0, a.free > 0 ? a.leftToday : 0), {}, 'mid'),
    progress(frac, over ? 'var(--warn)' : null),
    h('p', { class: 'allow2-sub' }, sub),
    upcomingRow(a, () => openCommitments(a)));
}

// Iconițe pentru compartimentele de economii din grafic.
function savingsIcons(items) {
  return items.map(it => {
    if (it.id === 'urgenta') return { ...it, icon: '🛡️' };
    if (it.id === '') return { ...it, icon: '🗂️' };
    const src = it.id.startsWith('g:') ? state.goals.find(g => 'g:' + g.id === it.id) : state.funds.find(f => 'f:' + f.id === it.id);
    return { ...it, icon: src?.icon || '💰' };
  });
}

export function dashboardPage() {
  const cm = currentMonth();
  const m = getMonth();
  const upTo = m === cm ? null : monthEnd(m);
  const tot = monthTotals(m);
  const avail = accountBalance('curent', upTo);
  const isEmpty = !state.transactions.length && !state.goals.length && !state.brokers.length && !state.subscriptions.length && !state.debts.length;

  // Cardul de sus, sub antet; desenul ales stă în dreapta soldului.
  const heroStyle = state.settings.heroStyle || 'aurora';
  const art = HERO_ART[heroStyle] ? h('div', { class: 'hero-art' }) : null;
  if (art) art.innerHTML = HERO_ART[heroStyle];
  // Cele trei sume, ca plăci agățate de marginea de jos a cardului. Tap: Tranzacții, filtrate pe acel tip.
  const pills = h('div', { class: 'pill-strip' },
    h('button', { type: 'button', class: 'pill', onclick: () => showTransactions('venit') }, h('small', {}, tr('Venituri')), h('b', {}, moneyShort(tot.income))),
    h('button', { type: 'button', class: 'pill', onclick: () => showTransactions('cheltuiala') }, h('small', {}, tr('Cheltuieli')), h('b', {}, moneyShort(-tot.expense))),
    h('button', { type: 'button', class: 'pill', onclick: () => showTransactions('') }, h('small', {}, tot.left >= 0 ? tr('Economisit') : tr('Cheltuit în plus')), h('b', {}, moneyShort(Math.abs(tot.left)))));
  const hero = h('section', { class: `card summary hero hero-bg-${heroStyle}${art ? ' has-art' : ''}${art && HERO_SCENES.has(heroStyle) ? ' art-scene' : ''} top-card` },
    art || sparkline(m),
    h('span', { class: 'label' }, m === cm ? tr('Disponibil · cont Curent') : tr('Disponibil la {date}', { date: fmtDate(upTo) })),
    bigMoney(avail));

  const active = state.goals.filter(g => !g.done);
  const goals = [
    sectionHead(tr('Goal-uri'), linkBtn(tr('Toate'), () => go('#/economii'), null)),
    h('div', { class: 'carousel' },
      active.map(goalMini),
      h('button', { type: 'button', class: 'gcard add', onclick: () => openGoalForm() }, icon('plus', 24), active.length ? tr('Goal nou') : tr('Creează primul goal'))),
  ];

  const live = m === cm && !isEmpty;
  const welcome = isEmpty ? card(
    h('h2', {}, tr('Bun venit! 👋')),
    h('p', { class: 'muted' }, tr('Adaugă prima tranzacție cu butonul +, sau încarcă date demo ca să vezi cum arată aplicația.')),
    h('div', { class: 'btn-row' }, btn(tr('Încarcă date demo'), loadDemo, 'secondary'), btn(tr('Adaugă tranzacție'), () => openTxForm()))) : null;
  const chart = cleanChart(m, upTo, {
    onCat: it => openCategoryTxSheet(it.id, m), onInc: it => openCategoryTxSheet(it.id, m, 'venit'), savingsIcons,
  });

  // Plăcile (4, alese din Setări → Aspect și limbă) vin după „Azi mai poți cheltui”.
  const node = h('div', { class: 'page home-tablou' },
    monthChip(), hero, pills,
    live ? allowanceCard() : null,
    welcome,
    live ? tilesGrid() : null,
    chart,
    ...goals);
  return { title: `${greeting()} 👋`, subtitle: longDate(today()), node };
}
