import { state, commit, setState } from '../store.js';
import { today, currentMonth, monthEnd, fmtDate, fmtDayMonth, inDays, weekdayName, longDate, addDays } from '../dates.js';
import { money, moneyParts, moneyShort, num, plural } from '../fmt.js';
import {
  accountBalance, monthTotals, expenseByCategory, incomeByCategory, savingsBreakdown, goalStats, netWorth, efStats, debtTotals, upcomingSubs, dailyAllowance,
} from '../calc.js';
import { h, s, icon, card, sectionHead, linkBtn, progress, btn, go, app, emptyState, toast, openSheet, segmented } from '../ui.js';
import { barBreakdown } from '../charts.js';
import { getMonth, monthChip } from '../menu.js';
import { openTxForm, openCategoryTxSheet, openGoalForm, openGoalActions, openSalaryDay } from '../forms.js';
import { buildDemo } from '../demo.js';
import { runAutomations } from '../actions.js';
import { t as tr } from '../i18n.js';
import { HERO_ART } from '../heroArt.js';

let chartTab = 'cheltuieli';

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

// Card de goal pentru liste (folosit și în pagina Economii).
export function goalCard(g) {
  const st = goalStats(g);
  let line = null;
  if (!g.done && st.left > 0 && g.deadline) {
    line = st.overdue
      ? h('p', { class: 'goal-line neg' }, tr('Termenul ({date}) a trecut', { date: fmtDate(g.deadline) }))
      : h('p', { class: 'goal-line' }, tr('Trebuie să pui {sum}/lună ca să ajungi la timp', { sum: money(st.perMonth, { cur: st.cur }) }));
  } else if (st.left <= 0) line = h('p', { class: 'goal-line pos' }, tr('Ținta a fost atinsă 🎉'));
  return h('button', { type: 'button', class: 'goal' + (g.done ? ' done' : ''), onclick: () => openGoalActions(g) },
    h('div', { class: 'goal-top' },
      h('span', { class: 'goal-ic', style: { background: g.color + '55' } }, g.icon || '🎯'),
      h('span', { class: 'goal-name' }, g.name),
      h('span', { class: 'goal-pct' }, `${Math.min(999, Math.round(st.pct * 100))}%`)),
    progress(st.pct, g.color),
    h('p', { class: 'goal-amt' }, tr('{a} din {b}', { a: money(st.saved, { cur: st.cur }), b: money(g.target, { cur: st.cur }) })),
    line);
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
  return s('svg', { class: 'spark', width: W, height: H, viewBox: `0 0 ${W} ${H}`, fill: 'none', 'aria-hidden': 'true' },
    s('path', { d: 'M' + pts.join(' L'), stroke: 'currentColor', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
}

function openCommitments(a) {
  openSheet({
    title: a.payday ? tr('De plătit până la salariu') : tr('De plătit până la final de lună'),
    body: h('div', {},
      h('p', { class: 'muted' }, tr('Total: {sum} · se scad din suma pe zi.', { sum: money(a.committed) })),
      h('div', { class: 'list' }, a.commitments.map(c => h('div', { class: 'row' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, c.label), h('div', { class: 'row-sub' }, `${c.kind} · ${fmtDate(c.date)}`)),
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

function allowanceCard() {
  const a = dailyAllowance();
  const links = h('div', { class: 'allow-links' },
    a.commitments.length
      ? linkBtn(tr('De plătit până pe {date}: {sum}', { date: fmtDayMonth(a.end), sum: money(a.committed) }), () => openCommitments(a), null)
      : null,
    linkBtn(a.payday ? tr('Salariu: {day}, {date}', { day: weekdayName(a.payday), date: fmtDayMonth(a.payday) }) : tr('Setează ziua salariului'), openSalaryDay, 'settings'));
  const until = a.payday
    ? tr('până la salariu ({day}, {date})', { day: weekdayName(a.payday), date: fmtDayMonth(a.payday) })
    : tr('până pe {date}', { date: fmtDayMonth(a.end) });

  if (a.free <= 0) {
    return card(h('div', { class: 'allow' },
      gauge(0, '0%', 'var(--neg)'),
      h('div', { class: 'allow-main' },
        h('small', {}, tr('Cât pot cheltui azi')),
        bigMoney(a.free, {}, 'mid'),
        h('p', { class: 'muted' }, tr('Plățile rămase luna aceasta depășesc banii din contul Curent.')))), links);
  }
  const over = a.leftToday < 0;
  const left = a.perDay > 0 ? a.leftToday / a.perDay : 0;
  return card(h('div', { class: 'allow' },
    gauge(over ? 1 : left, over ? tr('depășit') : `${Math.round(Math.max(0, left) * 100)}%\n${tr('rămas')}`, over ? 'var(--neg)' : 'var(--accent)'),
    h('div', { class: 'allow-main' },
      h('small', {}, tr('Cât pot cheltui azi')),
      bigMoney(a.leftToday, {}, 'mid'),
      h('p', { class: 'muted' }, over
        ? tr('Ai depășit suma de azi. Media rămasă: {sum}/zi.', { sum: money(a.perDay) })
        : tr('din {sum}/zi · {days} {until}', { sum: money(a.perDay), days: plural(a.daysLeft, tr('zi'), tr('zile')), until })))), links);
}

function widget(title, onclick, ...kids) {
  return h('button', { type: 'button', class: 'widget', onclick }, h('span', { class: 'w-title' }, title), ...kids);
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

  const heroStyle = state.settings.heroStyle || 'aurora';
  const art = HERO_ART[heroStyle] ? h('div', { class: 'hero-art' }) : null;
  if (art) art.innerHTML = HERO_ART[heroStyle];
  const hero = h('section', { class: `card summary hero hero-bg-${heroStyle}${art ? ' has-art' : ''}` },
    art || sparkline(m),
    h('span', { class: 'label' }, m === cm ? tr('Disponibil · cont Curent') : tr('Disponibil la {date}', { date: fmtDate(upTo) })),
    bigMoney(avail),
    h('div', { class: 'pills' },
      h('div', { class: 'pill' }, h('small', {}, tr('Venituri')), h('b', {}, moneyShort(tot.income))),
      h('div', { class: 'pill' }, h('small', {}, tr('Cheltuieli')), h('b', {}, moneyShort(tot.expense))),
      h('div', { class: 'pill' }, h('small', {}, tr('Rămas')), h('b', {}, moneyShort(tot.left, { sign: true })))));

  const qa = (ico, label, fn) => h('button', { type: 'button', class: 'qa', onclick: fn }, h('span', {}, icon(ico, 24)), label);
  const quick = h('div', { class: 'quick' },
    qa('minus', tr('Cheltuială'), () => openTxForm(null, { type: 'cheltuiala' })),
    qa('plus', tr('Venit'), () => openTxForm(null, { type: 'venit' })),
    qa('transfer', tr('Transfer'), () => openTxForm(null, { type: 'transfer' })),
    qa('target', tr('Goal'), () => openGoalForm()));

  // Un card cu trei variante: cheltuieli, venituri, economii (bare pe categorii).
  const chartBody = h('div');
  const chartTitle = h('h2', {});
  const paintChart = () => {
    const fmt = v => money(v);
    if (chartTab === 'economii') {
      const sav = savingsIcons(savingsBreakdown(upTo));
      chartTitle.textContent = tr('Economii');
      chartBody.replaceChildren(sav.length
        ? barBreakdown({ items: sav, format: fmt, onTap: () => go('#/economii') })
        : h('p', { class: 'muted' }, tr('Nu ai încă economii. Mută bani din Curent în Economii printr-un transfer.')));
    } else if (chartTab === 'venituri') {
      const inc = incomeByCategory(m);
      chartTitle.textContent = tr('Venituri');
      chartBody.replaceChildren(inc.length
        ? barBreakdown({ items: inc, format: fmt, onTap: it => openCategoryTxSheet(it.id, m, 'venit') })
        : h('p', { class: 'muted' }, tr('Niciun venit în această lună.')));
    } else {
      const cats = expenseByCategory(m);
      chartTitle.textContent = tr('Cheltuieli');
      chartBody.replaceChildren(cats.length
        ? barBreakdown({ items: cats, format: fmt, onTap: it => openCategoryTxSheet(it.id, m) })
        : h('p', { class: 'muted' }, tr('Nicio cheltuială în această lună.')));
    }
  };
  paintChart();
  const chartCard = card(
    h('div', { class: 'card-head' }, chartTitle,
      segmented([{ value: 'cheltuieli', label: tr('Cheltuieli') }, { value: 'venituri', label: tr('Venituri') }, { value: 'economii', label: tr('Economii') }], chartTab,
        v => { chartTab = v; paintChart(); }, 'seg-sm')),
    chartBody);

  const active = state.goals.filter(g => !g.done);
  const goals = [
    sectionHead(tr('Goal-uri'), linkBtn(tr('Toate'), () => go('#/economii'), null)),
    h('div', { class: 'carousel' },
      active.map(goalMini),
      h('button', { type: 'button', class: 'gcard add', onclick: () => openGoalForm() }, icon('plus', 24), active.length ? tr('Goal nou') : tr('Creează primul goal'))),
  ];

  const nw = netWorth(), ef = efStats(), debts = debtTotals(), subs = upcomingSubs(7);
  const widgets = h('div', { class: 'widgets' },
    widget(tr('Avere netă'), () => go('#/avere'),
      h('span', { class: 'w-row' }, h('small', {}, tr('Fără investiții')), h('b', { class: nw.without < 0 ? 'neg' : '' }, money(nw.without))),
      h('span', { class: 'w-row' }, h('small', {}, tr('Cu investiții')), h('b', { class: nw.with < 0 ? 'neg' : '' }, money(nw.with)))),
    widget(tr('Fond de urgență'), () => go('#/fond'),
      h('b', { class: 'w-big' }, h('i', { class: `dot-${ef.level}` }), tr('{n} luni', { n: num(ef.covered, 1) })),
      h('small', {}, tr('din {n} luni țintă', { n: ef.months })),
      progress(ef.pct)),
    widget(tr('Datorii rămase'), () => go('#/datorii'),
      h('b', { class: 'w-big' }, money(debts.remaining)),
      h('small', {}, debts.monthly > 0 ? tr('Rate: {sum}/lună', { sum: money(debts.monthly) }) : tr('Nicio rată activă'))),
    widget(tr('Abonamente · 7 zile'), () => go('#/abonamente'),
      subs.length
        ? subs.slice(0, 3).map(sub => h('span', { class: 'w-row' }, h('small', {}, `${sub.name} · ${inDays(sub.nextPayment)}`), h('b', {}, money(sub.amount))))
        : h('small', {}, tr('Nicio plată în următoarele 7 zile'))));

  const node = h('div', { class: 'page' },
    monthChip(),
    hero,
    quick,
    m === cm && !isEmpty ? allowanceCard() : null,
    isEmpty ? card(
      h('h2', {}, tr('Bun venit! 👋')),
      h('p', { class: 'muted' }, tr('Adaugă prima tranzacție cu butonul +, sau încarcă date demo ca să vezi cum arată aplicația.')),
      h('div', { class: 'btn-row' }, btn(tr('Încarcă date demo'), loadDemo, 'secondary'), btn(tr('Adaugă tranzacție'), () => openTxForm()))) : null,
    chartCard,
    ...goals,
    sectionHead(tr('Pe scurt')),
    widgets);
  return { title: `${greeting()} 👋`, subtitle: longDate(today()), node };
}

