import { state, commit } from '../store.js';
import { money, num, pct, parseAmount, forInput } from '../fmt.js';
import { round2, efStats, avgMonthlyExpense } from '../calc.js';
import { h, card, sectionHead, stat, btn, progress, openSheet, field, amountInput, invalid, toast, icon } from '../ui.js';
import { openBucketMove } from '../forms.js';
import { exportButton, movesList } from '../components.js';
import { t as tr } from '../i18n.js';

const LEVEL_TEXT = { neg: 'Sub pragul minim', warn: 'Pe drum bun', pos: 'Fond sănătos' };

export function openEfSettings() {
  const e = state.emergency;
  const months = h('input', { type: 'text', inputmode: 'numeric', value: String(e.months), 'aria-label': tr('Luni țintă') });
  const manual = amountInput(e.manualAvg || '', { placeholder: tr('Automat (media ultimelor 3 luni)') });
  const initial = amountInput(e.initial || '');
  const red = h('input', { type: 'text', inputmode: 'decimal', value: forInput(e.red) });
  const orange = h('input', { type: 'text', inputmode: 'decimal', value: forInput(e.orange) });
  const sh = openSheet({
    title: tr('Setări fond de urgență'),
    body: h('div', {},
      field(tr('Ținta (număr de luni)'), months),
      field(tr('Cheltuieli lunare medii (opțional)'), manual, tr('Lasă gol ca să se calculeze automat.')),
      field(tr('Sold inițial al fondului'), initial, tr('Banii pe care îi aveai deja în fond, înainte de aplicație.')),
      h('div', { class: 'two' }, field(tr('Roșu sub (luni)'), red), field(tr('Portocaliu sub (luni)'), orange))),
    footer: btn(tr('Salvează'), () => {
      const m = parseInt(months.value, 10);
      if (!(m >= 1 && m <= 60)) return invalid(months, tr('Alege între 1 și 60 de luni'));
      const man = manual.value.trim() ? parseAmount(manual.value) : null;
      if (man != null && !(man > 0)) return invalid(manual, tr('Suma trebuie să fie pozitivă'));
      const ini = initial.value.trim() ? parseAmount(initial.value) : 0;
      if (!(ini >= 0)) return invalid(initial, tr('Suma trebuie să fie pozitivă'));
      const r = parseAmount(red.value), o = parseAmount(orange.value);
      if (!(r >= 0) || !(o > r)) return invalid(orange, tr('Pragul portocaliu trebuie să fie mai mare decât cel roșu'));
      Object.assign(state.emergency, { months: m, manualAvg: man ? round2(man) : null, initial: round2(ini), red: r, orange: o });
      commit();
      sh.close();
      toast(tr('Setări salvate'));
    }),
  });
}

export function emergencyPage() {
  const ef = efStats();
  const avg = avgMonthlyExpense();
  const avgText = avg.manual
    ? tr('Valoare introdusă manual.')
    : avg.months === 1 ? tr('Media cheltuielilor din ultima lună încheiată.')
      : avg.months ? tr('Media cheltuielilor din ultimele {n} luni încheiate.', { n: avg.months })
        : tr('Încă nu există o lună încheiată; se folosește luna curentă.');

  const node = h('div', { class: 'page' },
    h('section', { class: 'card summary' },
      h('span', { class: 'label' }, tr('Sold fond de urgență')),
      h('strong', { class: 'big' }, money(ef.balance)),
      h('p', { class: 'ef-line' }, h('i', { class: `dot-${ef.level}` }), h('b', {}, tr('{n} luni din {m}', { n: num(ef.covered, 1), m: ef.months })), h('span', { class: 'muted' }, ` · ${tr(LEVEL_TEXT[ef.level])}`)),
      progress(ef.pct, `var(--${ef.level})`),
      h('div', { class: 'stats2' }, stat(tr('Sumă țintă'), money(ef.target)), stat(tr('Progres'), pct(ef.pct, 0)))),
    card(
      h('div', { class: 'card-head' }, h('h2', {}, tr('Cheltuieli lunare medii')),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': tr('Setări fond'), onclick: openEfSettings }, icon('settings'))),
      h('strong', { class: 'mid' }, money(avg.value)),
      h('p', { class: 'muted' }, avgText),
      h('p', { class: 'muted' }, tr('Praguri: roșu sub {r} luni, portocaliu sub {o} luni.', { r: num(state.emergency.red, 1), o: num(state.emergency.orange, 1) }))),
    h('div', { class: 'btn-row' },
      ef.balance > 0 ? btn(tr('Retrage'), () => openBucketMove({ bucket: 'urgenta', dir: 'out' }), 'secondary') : null,
      btn(tr('Adaugă bani'), () => openBucketMove({ bucket: 'urgenta', dir: 'in' }))),
    sectionHead(tr('Istoric mișcări')),
    movesList('urgenta'),
    exportButton());
  return { title: tr('Fond de urgență'), back: '#/economii', node };
}
