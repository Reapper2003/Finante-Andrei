import { state } from '../store.js';
import { money, num } from '../fmt.js';
import { subTotals, netWorth, efStats, debtTotals } from '../calc.js';
import { h, icon, go } from '../ui.js';
import { listRow, exportButton } from '../components.js';
import { t as tr } from '../i18n.js';

export function morePage() {
  const nw = netWorth(), ef = efStats(), d = debtTotals(), subs = subTotals();
  const item = (ico, title, sub, hash) => listRow({
    iconEl: h('span', { class: 'cat-ic neutral' }, icon(ico, 20)), title, sub, onTap: () => go(hash), chevron: true,
  });
  const node = h('div', { class: 'page' },
    h('div', { class: 'list' },
      item('repeat', tr('Abonamente'), tr('{n} active · {sum}/lună', { n: state.subscriptions.length, sum: money(subs.monthly) }), '#/abonamente'),
      item('scale', tr('Avere netă'), tr('Cu investiții: {sum}', { sum: money(nw.with) }), '#/avere'),
      item('shield', tr('Fond de urgență'), tr('{n} luni din {m}', { n: num(ef.covered, 1), m: ef.months }), '#/fond'),
      item('card', tr('Datorii'), tr('Rămas: {sum}', { sum: money(d.remaining) }), '#/datorii')),
    h('div', { class: 'list' },
      item('tag', tr('Categorii'), tr('{n} categorii', { n: state.categories.length }), '#/categorii'),
      item('settings', tr('Setări'), tr('Limbă, monedă, temă, backup'), '#/setari')),
    exportButton());
  return { title: tr('Mai mult'), node };
}
