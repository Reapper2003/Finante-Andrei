import { state, commit, setState } from '../store.js';
import { currentMonth, monthEnd, fmtDate, fmtDayMonth, inDays } from '../dates.js';
import { money, num, plural } from '../fmt.js';
import {
  accountBalance, monthTotals, expenseByCategory, savingsBreakdown, goalStats, netWorth, efStats, debtTotals, upcomingSubs, dailyAllowance,
} from '../calc.js';
import { h, card, sectionHead, linkBtn, stat, progress, btn, go, app, signCls, emptyState, toast, openSheet, segmented } from '../ui.js';
import { donut } from '../charts.js';
import { monthSwitcher } from '../components.js';
import { openTxForm, openCategoryTxSheet, openGoalForm, openGoalActions } from '../forms.js';
import { buildDemo } from '../demo.js';
import { runAutomations } from '../actions.js';
import { t as tr } from '../i18n.js';

let month = currentMonth();
let chartTab = 'cheltuieli';

export function loadDemo() {
  setState(buildDemo(state.settings));
  runAutomations();
  commit();
  toast(tr('Date demo încărcate'));
}

function goalCard(g) {
  const st = goalStats(g);
  let line = null;
  if (!g.done && st.left > 0 && g.deadline) {
    line = st.overdue
      ? h('p', { class: 'goal-line neg' }, tr('Termenul ({date}) a trecut', { date: fmtDate(g.deadline) }))
      : h('p', { class: 'goal-line' }, tr('Trebuie să pui {sum}/lună ca să ajungi la timp', { sum: money(st.perMonth) }));
  } else if (st.left <= 0) line = h('p', { class: 'goal-line pos' }, tr('Ținta a fost atinsă 🎉'));
  return h('button', { type: 'button', class: 'goal' + (g.done ? ' done' : ''), onclick: () => openGoalActions(g) },
    h('div', { class: 'goal-top' },
      h('span', { class: 'goal-ic', style: { background: g.color + '55' } }, g.icon || '🎯'),
      h('span', { class: 'goal-name' }, g.name),
      h('span', { class: 'goal-pct' }, `${Math.min(999, Math.round(st.pct * 100))}%`)),
    progress(st.pct, g.color),
    h('p', { class: 'goal-amt' }, tr('{a} din {b}', { a: money(st.saved), b: money(g.target) })),
    line);
}

function openCommitments(a) {
  openSheet({
    title: tr('De plătit până la final de lună'),
    body: h('div', {},
      h('p', { class: 'muted' }, tr('Total: {sum} · se scad din suma pe zi.', { sum: money(a.committed) })),
      h('div', { class: 'list' }, a.commitments.map(c => h('div', { class: 'row' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, c.label), h('div', { class: 'row-sub' }, `${c.kind} · ${fmtDate(c.date)}`)),
        h('span', { class: 'amt' }, money(c.amount)))))),
  });
}

function allowanceCard() {
  const a = dailyAllowance();
  const head = h('h2', {}, tr('Cât pot cheltui azi'));
  const more = a.commitments.length
    ? linkBtn(tr('De plătit până pe {date}: {sum}', { date: fmtDayMonth(a.end), sum: money(a.committed) }), () => openCommitments(a), null)
    : null;
  if (a.free <= 0) {
    return card(head,
      h('strong', { class: 'mid neg' }, money(a.free)),
      h('p', { class: 'muted' }, tr('Plățile rămase luna aceasta depășesc banii din contul Curent.')),
      more);
  }
  const over = a.leftToday < 0;
  return card(head,
    h('strong', { class: 'mid' + (over ? ' neg' : '') }, money(a.leftToday)),
    h('p', { class: 'muted' }, over
      ? tr('Ai depășit suma de azi. Media rămasă: {sum}/zi.', { sum: money(a.perDay) })
      : tr('≈ {sum}/zi pentru încă {days}, până pe {date}', { sum: money(a.perDay), days: plural(a.daysLeft, tr('zi'), tr('zile')), date: fmtDate(a.end) })),
    progress(a.perDay > 0 ? a.spentToday / a.perDay : 1, over ? 'var(--neg)' : null),
    h('p', { class: 'goal-amt' }, tr('Cheltuit azi: {a} din {b} (fără rate și abonamente)', { a: money(a.spentToday), b: money(a.perDay) })),
    more);
}

function widget(title, onclick, ...kids) {
  return h('button', { type: 'button', class: 'widget', onclick }, h('span', { class: 'w-title' }, title), ...kids);
}

export function dashboardPage() {
  const cm = currentMonth();
  if (month > cm) month = cm;
  const m = month;
  const upTo = m === cm ? null : monthEnd(m);
  const tot = monthTotals(m);
  const avail = accountBalance('curent', upTo);
  const isEmpty = !state.transactions.length && !state.goals.length && !state.brokers.length && !state.subscriptions.length && !state.debts.length;

  const summary = h('section', { class: 'card summary hero' },
    h('span', { class: 'label' }, m === cm ? tr('Total disponibil · cont Curent') : tr('Disponibil la {date}', { date: fmtDate(upTo) })),
    h('strong', { class: 'big ' + (avail < 0 ? 'neg' : '') }, money(avail)),
    h('div', { class: 'stats3' },
      stat(tr('Venituri'), money(tot.income)),
      stat(tr('Cheltuieli'), money(tot.expense)),
      stat(tr('Rămas'), money(tot.left), signCls(tot.left))));

  // Un singur card pentru cele două cercuri, cu comutator mic în dreapta jos.
  const chartBody = h('div');
  const chartTitle = h('h2', {});
  const footLeft = h('div', { class: 'card-foot-left' });
  const show = el => { chartBody.replaceChildren(el); footLeft.replaceChildren(...(el.moreButton ? [el.moreButton] : [])); };
  const paintChart = () => {
    if (chartTab === 'economii') {
      const sav = savingsBreakdown(upTo);
      chartTitle.textContent = tr('Economii');
      show(sav.length
        ? donut({ items: sav, title: tr('Total economii'), format: v => money(v), legendLimit: 5, size: 180 })
        : h('p', { class: 'muted' }, tr('Nu ai încă economii. Mută bani din Curent în Economii printr-un transfer.')));
    } else {
      const cats = expenseByCategory(m);
      chartTitle.textContent = tr('Cheltuieli');
      show(cats.length
        ? donut({ items: cats, title: tr('Total cheltuieli'), format: v => money(v), onLegend: it => openCategoryTxSheet(it.id, m), legendLimit: 5, size: 180 })
        : h('p', { class: 'muted' }, tr('Nicio cheltuială în această lună.')));
    }
  };
  paintChart();
  const chartCard = card(chartTitle, chartBody,
    h('div', { class: 'card-foot' },
      footLeft,
      segmented([{ value: 'cheltuieli', label: tr('Cheltuieli') }, { value: 'economii', label: tr('Economii') }], chartTab,
        v => { chartTab = v; paintChart(); }, 'seg-sm')));

  const active = state.goals.filter(g => !g.done), done = state.goals.filter(g => g.done);
  const goals = h('div', { class: 'stack' },
    sectionHead(tr('Goal-uri'), linkBtn(tr('Adaugă'), () => openGoalForm())),
    active.length || done.length ? null : emptyState(tr('Creează un goal: un lucru pentru care strângi bani.'), tr('Creează primul goal'), () => openGoalForm()),
    ...active.map(goalCard),
    done.length ? h('details', { class: 'done-goals' }, h('summary', {}, tr('Finalizate ({n})', { n: done.length })), h('div', { class: 'stack' }, done.map(goalCard))) : null);

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
        ? subs.slice(0, 3).map(s => h('span', { class: 'w-row' }, h('small', {}, `${s.name} · ${inDays(s.nextPayment)}`), h('b', {}, money(s.amount))))
        : h('small', {}, tr('Nicio plată în următoarele 7 zile'))));

  const node = h('div', { class: 'page' },
    monthSwitcher(m, v => { month = v; app.rerender(); }),
    summary,
    m === cm && !isEmpty ? allowanceCard() : null,
    isEmpty ? card(
      h('h2', {}, tr('Bun venit! 👋')),
      h('p', { class: 'muted' }, tr('Adaugă prima tranzacție cu butonul +, sau încarcă date demo ca să vezi cum arată aplicația.')),
      h('div', { class: 'btn-row' }, btn(tr('Încarcă date demo'), loadDemo, 'secondary'), btn(tr('Adaugă tranzacție'), () => openTxForm()))) : null,
    chartCard,
    goals,
    sectionHead(tr('Pe scurt')),
    widgets);
  return { title: tr('Acasă'), node };
}
