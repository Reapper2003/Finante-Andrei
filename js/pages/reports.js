import { state, save, catById } from '../store.js';
import { currentMonth, monthLabel, monthAbbr, fmtDate } from '../dates.js';
import { money, pct, num } from '../fmt.js';
import { buildReport, buildYearReport, availableYears } from '../calc.js';
import { h, card, stat, btn, app, signCls, progress, selectInput, toast, catIcon, emptyState, segmented } from '../ui.js';
import { donut, barChart } from '../charts.js';
import { exportReport, exportYearReport } from '../exporter.js';
import { t as tr, catName } from '../i18n.js';

let selected = null;
let mode = 'lunar';
let selectedYear = null;

// Rapoartele salvate păstrează numele categoriilor; le afișăm în limba curentă dacă există încă.
const lbl = c => {
  const cat = catById(c.id);
  return cat ? catName(cat) : c.id ? c.label : tr('Fără categorie');
};

function diffLine(cur, prev) {
  const d = cur - prev;
  if (!prev && !cur) return null;
  const p = prev ? d / Math.abs(prev) : null;
  return h('span', { class: 'diff ' + signCls(d) }, `${d >= 0 ? '↑' : '↓'} ${money(d, { sign: true })}${p != null ? ` (${pct(p, 1, true)})` : ''}`);
}

// Observații automate, construite la afișare (ca să respecte modul privat și limba).
function observations(r) {
  const out = [];
  const changes = r.compare.filter(c => c.prev > 0 && c.cur > 0).map(c => ({ ...c, ch: (c.cur - c.prev) / c.prev }))
    .filter(c => Math.abs(c.ch) >= 0.1).sort((a, b) => Math.abs(b.ch) * b.prev - Math.abs(a.ch) * a.prev);
  const down = changes.find(c => c.ch < 0), up = changes.find(c => c.ch > 0);
  if (down) out.push(tr('Ai cheltuit cu {pct} mai puțin pe {cat} decât luna trecută.', { pct: pct(-down.ch, 0), cat: lbl(down) }));
  if (up) out.push(tr('Ai cheltuit cu {pct} mai mult pe {cat} decât luna trecută.', { pct: pct(up.ch, 0), cat: lbl(up) }));
  if (r.income > 0) {
    if (r.left < 0) out.push(tr('Ai cheltuit mai mult decât ai câștigat, cu {sum}.', { sum: money(-r.left) }));
    else out.push(r.savingsRate >= 0.2
      ? tr('Rata de economisire a fost {pct}, foarte bine!', { pct: pct(r.savingsRate, 0) })
      : tr('Rata de economisire a fost {pct}.', { pct: pct(r.savingsRate, 0) }));
  }
  if (r.top[0] && r.expense > 0 && out.length < 3) out.push(tr('{cat} a reprezentat {pct} din cheltuieli.', { cat: lbl(r.top[0]), pct: pct(r.top[0].value / r.expense, 0) }));
  const nwDiff = r.networth.with - r.networth.prevWith;
  if (out.length < 3 && r.networth.prevWith && Math.abs(nwDiff) > 0.5) {
    const p = pct(Math.abs(nwDiff / r.networth.prevWith), 1);
    out.push(nwDiff > 0 ? tr('Averea netă (cu investiții) a crescut cu {pct}.', { pct: p }) : tr('Averea netă (cu investiții) a scăzut cu {pct}.', { pct: p }));
  }
  return out.slice(0, 3);
}

// Vedere anuală: totaluri pe an, venituri vs cheltuieli pe luni, categorii, repere.
function yearlyView() {
  const years = availableYears();
  if (!selectedYear || !years.includes(selectedYear)) selectedYear = years[0];
  const y = buildYearReport(selectedYear);
  const pick = selectInput(years.map(v => ({ value: String(v), label: String(v) })), String(selectedYear));
  pick.addEventListener('change', () => { selectedYear = Number(pick.value); app.rerender(); });
  const hasAny = y.income || y.expense || y.investments.valueEnd || y.debts.remaining || y.goals.length;
  const nw = y.networth;
  const monthRow = (label, x, value) => x ? h('div', { class: 'hl-row' }, h('span', { class: 'muted' }, label), h('b', {}, `${monthLabel(x.m)} · ${value}`)) : null;

  return [
    h('div', { class: 'report-pick' }, pick),
    h('p', { class: 'hint' }, y.isCurrent ? tr('Anul în curs: cifrele includ lunile de până acum.') : tr('Anul {y} complet.', { y: y.year })),
    !hasAny ? card(emptyState(tr('Nu există date pentru acest an.'))) : [
      card(h('h2', {}, tr('Sumar anual')),
        h('div', { class: 'stats2' },
          stat(tr('Venituri'), money(y.income)), stat(tr('Cheltuieli'), money(y.expense)),
          stat(tr('Rămas'), money(y.left), signCls(y.left)), stat(tr('Rata de economisire'), y.savingsRate == null ? '—' : pct(y.savingsRate, 1), signCls(y.savingsRate || 0)),
          stat(tr('Venit mediu pe lună'), money(y.avgIncome)), stat(tr('Cheltuieli medii pe lună'), money(y.avgExpense)))),

      card(h('h2', {}, tr('Venituri și cheltuieli pe luni')), barChart({
        labels: y.months.map(x => monthAbbr(x.m)),
        series: [
          { name: tr('Venituri'), color: 'var(--accent)', values: y.months.map(x => x.income) },
          { name: tr('Cheltuieli'), color: 'var(--chart2)', values: y.months.map(x => x.expense) },
        ],
        format: v => money(v),
      })),

      y.categories.length ? card(h('h2', {}, tr('Cheltuieli pe categorii')),
        donut({ items: y.categories.map(c => ({ ...c, label: lbl(c) })), title: tr('Total cheltuieli'), format: v => money(v), legendLimit: 5, size: 180 })) : null,

      card(h('h2', {}, tr('Repere')),
        monthRow(tr('Cea mai bună lună'), y.bestMonth, money(y.bestMonth?.left, { sign: true })),
        monthRow(tr('Cea mai scumpă lună'), y.priciestMonth, money(y.priciestMonth?.expense)),
        h('div', { class: 'bd-row' }, h('span', {}, tr('Plătit pe abonamente')), h('b', {}, money(y.subscriptions))),
        h('div', { class: 'bd-row' }, h('span', {}, tr('Datorii plătite')), h('b', {}, money(y.debts.paid))),
        h('div', { class: 'bd-row' }, h('span', {}, tr('Datorii rămase')), h('b', {}, money(y.debts.remaining)))),

      card(h('h2', {}, tr('Economii')),
        h('div', { class: 'stats2' }, stat(tr('Fond de urgență – început'), money(y.ef.start)), stat(tr('Fond de urgență – final'), money(y.ef.end))),
        diffLine(y.ef.end, y.ef.start),
        y.goals.length ? h('div', { class: 'stack-sm', style: { marginTop: '14px' } }, y.goals.map(g => h('div', {},
          h('div', { class: 'top-line' }, h('span', {}, `${g.icon || '🎯'} ${g.name}`), h('b', { class: signCls(g.added) }, money(g.added, { sign: true }))),
          progress(g.pct, g.color)))) : null),

      card(h('h2', {}, tr('Investiții')),
        h('div', { class: 'stats2' }, stat(tr('Depus în an'), money(y.investments.deposited)), stat(tr('Valoare la final'), money(y.investments.valueEnd))),
        h('p', { class: 'muted' }, tr('Valoare la început: {sum}', { sum: money(y.investments.valueStart) })),
        diffLine(y.investments.valueEnd, y.investments.valueStart)),

      card(h('h2', {}, tr('Avere netă')),
        h('div', { class: 'stats2' },
          h('div', { class: 'stat' }, h('span', { class: 'label' }, tr('Fără investiții')), h('strong', {}, money(nw.without)), diffLine(nw.without, nw.startWithout)),
          h('div', { class: 'stat' }, h('span', { class: 'label' }, tr('Cu investiții')), h('strong', {}, money(nw.with)), diffLine(nw.with, nw.startWith))),
        h('p', { class: 'hint' }, tr('Diferența e față de începutul anului.'))),
    ],
    btn(tr('Exportă anul în Excel'), () => exportYearReport(y).then(() => toast(tr('Raport exportat'))), 'primary'),
  ];
}

export function reportsPage() {
  const modeSeg = segmented([{ value: 'lunar', label: tr('Lunar') }, { value: 'anual', label: tr('Anual') }], mode, v => { mode = v; app.rerender(); });
  if (mode === 'anual') return { title: tr('Rapoarte'), node: h('div', { class: 'page' }, modeSeg, yearlyView()) };
  const cm = currentMonth();
  const stored = [...state.reports].sort((a, b) => b.month.localeCompare(a.month));
  const options = [{ value: cm, label: tr('{month} (în curs)', { month: monthLabel(cm) }) }, ...stored.map(r => ({ value: r.month, label: monthLabel(r.month) }))];
  if (!selected || !options.some(o => o.value === selected)) selected = stored[0]?.month || cm;
  const isLive = selected === cm;
  const r = isLive ? buildReport(cm) : stored.find(x => x.month === selected);

  const pick = selectInput(options, selected);
  pick.addEventListener('change', () => { selected = pick.value; app.rerender(); });

  const hasAny = r.income || r.expense || r.goals.length || r.investments.valueEnd || r.debts.remaining;
  const nw = r.networth;

  const node = h('div', { class: 'page' },
    modeSeg,
    h('div', { class: 'report-pick' }, pick),
    h('p', { class: 'hint' }, isLive
      ? tr('Luna în curs: raport provizoriu. Raportul final se generează automat la începutul lunii viitoare.')
      : tr('Generat automat la {date}.', { date: fmtDate(r.generatedAt) })),
    !hasAny ? card(emptyState(tr('Nu există date pentru această lună.'))) : [
      card(h('h2', {}, tr('Sumar')),
        h('div', { class: 'stats2' },
          stat(tr('Venituri'), money(r.income)), stat(tr('Cheltuieli'), money(r.expense)),
          stat(tr('Rămas'), money(r.left), signCls(r.left)), stat(tr('Rata de economisire'), r.savingsRate == null ? '—' : pct(r.savingsRate, 1), signCls(r.savingsRate || 0)))),

      r.top.length ? card(h('h2', {}, tr('Top 3 categorii de cheltuieli')),
        h('div', { class: 'stack-sm' }, r.top.map(c => h('div', { class: 'top-row' },
          catIcon(c, 36),
          h('div', { class: 'row-main' },
            h('div', { class: 'top-line' }, h('span', {}, lbl(c)), h('b', {}, money(c.value))),
            progress(r.expense ? c.value / r.expense : 0, c.color),
            h('small', { class: 'muted' }, tr('{pct} din cheltuieli', { pct: pct(r.expense ? c.value / r.expense : 0, 0) }))))))) : null,

      r.compare.length ? card(h('h2', {}, tr('Față de luna trecută')),
        h('div', { class: 'cmp' }, r.compare.map(c => {
          const ch = c.prev > 0 ? (c.cur - c.prev) / c.prev : null;
          const cls = ch == null ? 'muted' : ch > 0.005 ? 'neg' : ch < -0.005 ? 'pos' : 'muted';
          return h('div', { class: 'cmp-row' },
            h('span', { class: 'cmp-name' }, `${c.icon} ${lbl(c)}`),
            h('span', { class: 'cmp-val' }, money(c.cur)),
            h('span', { class: `cmp-ch ${cls}` }, ch == null ? tr('nou') : `${ch > 0.005 ? '↑' : ch < -0.005 ? '↓' : '='} ${pct(Math.abs(ch), 0)}`));
        }))) : null,

      card(h('h2', {}, tr('Abonamente')), h('p', {}, tr('Total plătit:') + ' ', h('b', {}, money(r.subscriptions)))),

      r.goals.length ? card(h('h2', {}, tr('Goal-uri')),
        h('div', { class: 'stack-sm' }, r.goals.map(g => h('div', {},
          h('div', { class: 'top-line' }, h('span', {}, `${g.icon || '🎯'} ${g.name}`), h('b', { class: signCls(g.added) }, money(g.added, { sign: true }))),
          progress(g.pct, g.color),
          h('small', { class: 'muted' }, `${tr('{a} din {b}', { a: money(g.savedEnd), b: money(g.target) })} · ${pct(g.pct, 0)}`))))) : null,

      card(h('h2', {}, tr('Fond de urgență')),
        h('div', { class: 'stats2' }, stat(tr('La început'), money(r.ef.start)), stat(tr('La final'), money(r.ef.end))),
        h('p', { class: 'muted' }, tr('{n} luni acoperite din {m}', { n: num(r.ef.covered, 1), m: r.ef.months })), diffLine(r.ef.end, r.ef.start)),

      card(h('h2', {}, tr('Datorii')),
        h('div', { class: 'stats2' }, stat(tr('Plătit în lună'), money(r.debts.paid)), stat(tr('Rămas'), money(r.debts.remaining)))),

      card(h('h2', {}, tr('Investiții')),
        h('div', { class: 'stats2' },
          stat(tr('Depus în lună'), money(r.investments.deposited)), stat(tr('Valoare la final'), money(r.investments.valueEnd))),
        h('p', { class: 'muted' }, tr('Valoare la început: {sum}', { sum: money(r.investments.valueStart) })),
        diffLine(r.investments.valueEnd, r.investments.valueStart)),

      card(h('h2', {}, tr('Avere netă')),
        h('div', { class: 'stats2' },
          h('div', { class: 'stat' }, h('span', { class: 'label' }, tr('Fără investiții')), h('strong', {}, money(nw.without)), diffLine(nw.without, nw.prevWithout)),
          h('div', { class: 'stat' }, h('span', { class: 'label' }, tr('Cu investiții')), h('strong', {}, money(nw.with)), diffLine(nw.with, nw.prevWith)))),

      card(h('h2', {}, tr('Observații')), h('ul', { class: 'obs' }, observations(r).map(o => h('li', {}, o)))),
    ],
    h('div', { class: 'btn-row' },
      !isLive ? btn(tr('Regenerează'), () => {
        const i = state.reports.findIndex(x => x.month === r.month);
        state.reports[i] = buildReport(r.month);
        save();
        app.rerender();
        toast(tr('Raport regenerat'));
      }, 'secondary') : null,
      btn(tr('Exportă în Excel'), () => exportReport(r).then(() => toast(tr('Raport exportat'))), 'primary')));
  return { title: tr('Rapoarte'), node };
}
