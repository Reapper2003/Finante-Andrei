import { state, commit, save } from '../store.js';
import { currentMonth, addMonths, monthShort } from '../dates.js';
import { money, pct } from '../fmt.js';
import { netWorth, netWorthSeries, snapshotFor, rebuildSnapshots } from '../calc.js';
import { h, card, signCls, switchRow, app, toast, linkBtn } from '../ui.js';
import { lineChart } from '../charts.js';
import { exportButton } from '../components.js';
import { t as tr } from '../i18n.js';

function diff(cur, prev) {
  if (prev == null) return h('span', { class: 'diff muted' }, tr('Nu există date pentru luna trecută'));
  const d = cur - prev;
  return h('span', { class: 'diff ' + signCls(d) },
    `${d >= 0 ? '↑' : '↓'} ${money(d, { sign: true })}${prev ? ` (${pct(d / Math.abs(prev), 1, true)})` : ''} ${tr('față de luna trecută')}`);
}

export function networthPage() {
  const nw = netWorth();
  const prev = snapshotFor(addMonths(currentMonth(), -1));
  const series = netWorthSeries();
  const line = (label, value, sign = '+') => h('div', { class: 'bd-row' },
    h('span', {}, label), h('b', { class: sign === '−' && value > 0 ? 'neg' : '' }, `${sign} ${money(Math.abs(value))}`));

  const node = h('div', { class: 'page' },
    h('section', { class: 'card summary' },
      h('span', { class: 'label' }, tr('Fără investiții')),
      h('strong', { class: 'big ' + (nw.without < 0 ? 'neg' : '') }, money(nw.without)),
      diff(nw.without, prev?.without)),
    h('section', { class: 'card summary' },
      h('span', { class: 'label' }, tr('Cu investiții')),
      h('strong', { class: 'big ' + (nw.with < 0 ? 'neg' : '') }, money(nw.with)),
      diff(nw.with, prev?.with)),
    card(h('h2', {}, tr('Defalcare')),
      line(tr('Cont Curent'), nw.cur),
      line(tr('Economii'), nw.eco),
      state.settings.includeReceivables ? line(tr('Bani de primit'), nw.rec) : null,
      line(tr('Datorii rămase'), nw.debts, '−'),
      h('div', { class: 'bd-row total' }, h('span', {}, tr('Fără investiții')), h('b', {}, money(nw.without))),
      line(tr('Investiții (valoare curentă)'), nw.inv),
      h('div', { class: 'bd-row total' }, h('span', {}, tr('Cu investiții')), h('b', {}, money(nw.with)))),
    h('div', { class: 'list' },
      switchRow(tr('Include banii pe care mi-i datorează alții'), state.settings.includeReceivables, v => {
        state.settings.includeReceivables = v;
        rebuildSnapshots();
        commit();
      })),
    series.length > 1
      ? card(h('h2', {}, tr('Evoluție lunară')), lineChart({
        labels: series.map(p => monthShort(p.m)),
        series: [
          { name: tr('Cu investiții'), color: 'var(--accent)', values: series.map(p => p.with) },
          { name: tr('Fără investiții'), color: 'var(--chart2)', values: series.map(p => p.without) },
        ],
        format: v => money(v),
      }))
      : card(h('h2', {}, tr('Evoluție lunară')), h('p', { class: 'muted' }, tr('Graficul apare după prima lună încheiată. La finalul fiecărei luni se salvează automat un snapshot.'))),
    h('div', { class: 'center' }, linkBtn(tr('Recalculează istoricul'), () => { rebuildSnapshots(); save(); app.rerender(); toast(tr('Istoric recalculat')); }, 'refresh')),
    exportButton());
  return { title: tr('Avere netă'), back: '#/acasa', node };
}
