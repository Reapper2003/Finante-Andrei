// Calculator de investiții: cât strângi dacă depui lunar, cu randament anual (dobândă compusă lunar).

import { state, save } from '../store.js';
import { money, pct, parseAmount, forInput, num, plural } from '../fmt.js';
import { round2, portfolioStats } from '../calc.js';
import { h, card, field, amountInput, stat, sectionHead, linkBtn, progress } from '../ui.js';
import { lineChart } from '../charts.js';
import { listRow } from '../components.js';
import { bigMoney } from './dashboard.js';
import { t as tr } from '../i18n.js';

const DEFAULTS = { initial: 0, monthly: 500, rate: 7, years: 10, growth: 0, inflation: 0 };

// Simulare lunară: la fiecare final de lună se aplică randamentul, apoi se adaugă depunerea.
// Depunerea lunară crește o dată pe an cu `growth` %.
export function simulate({ initial, monthly, rate, years, growth }) {
  const r = Math.pow(1 + rate / 100, 1 / 12) - 1;
  let value = initial, deposited = initial, dep = monthly;
  const perYear = [];
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      value = value * (1 + r) + dep;
      deposited += dep;
    }
    perYear.push({ year: y, value: round2(value), deposited: round2(deposited) });
    dep *= 1 + growth / 100;
  }
  return { value: round2(value), deposited: round2(deposited), gain: round2(value - deposited), perYear };
}

export function calculatorPage() {
  const saved = { ...DEFAULTS, ...(state.settings.calc || {}) };
  const decimal = v => h('input', { type: 'text', inputmode: 'decimal', value: forInput(v), autocomplete: 'off' });
  const initial = amountInput(saved.initial || '');
  const monthly = amountInput(saved.monthly || '');
  const rate = decimal(saved.rate);
  const years = h('input', { type: 'text', inputmode: 'numeric', value: String(saved.years), autocomplete: 'off' });
  const growth = decimal(saved.growth || '');
  const inflation = decimal(saved.inflation || '');
  growth.placeholder = inflation.placeholder = tr('Opțional');
  const portfolio = portfolioStats().value;

  const result = h('div', { class: 'stack' });

  const read = () => {
    const n = (el, def = 0) => { const v = parseAmount(el.value); return isFinite(v) && v >= 0 ? v : def; };
    return {
      initial: n(initial), monthly: n(monthly), rate: Math.min(n(rate), 100),
      years: Math.max(1, Math.min(60, Math.round(n(years, 1)) || 1)), growth: Math.min(n(growth), 50), inflation: Math.min(n(inflation), 50),
    };
  };

  function paint() {
    const p = read();
    // Ultimele valori rămân salvate pentru data viitoare (fără să redesenăm pagina).
    state.settings.calc = p;
    save();
    const sim = simulate(p);
    const real = p.inflation > 0 ? round2(sim.value / Math.pow(1 + p.inflation / 100, p.years)) : null;
    const gainShare = sim.value > 0 ? sim.gain / sim.value : 0;
    result.replaceChildren(
      h('section', { class: 'card summary' },
        h('span', { class: 'label' }, tr('După {n}', { n: plural(p.years, tr('an'), tr('ani')) })),
        bigMoney(sim.value),
        real != null ? h('span', { class: 'muted' }, tr('≈ {sum} în banii de azi (inflație {p}%/an)', { sum: money(real), p: num(p.inflation, 1).replace(/[.,]0$/, '') })) : null,
        h('div', { class: 'stats2' },
          stat(tr('Total depus'), money(sim.deposited)),
          stat(tr('Câștig din randament'), money(sim.gain, { sign: true }), sim.gain > 0 ? 'pos' : '')),
        progress(1 - gainShare),
        h('small', { class: 'muted' }, tr('{a} din sumă sunt depunerile tale, {b} e randamentul.', { a: pct(1 - gainShare, 0), b: pct(gainShare, 0) }))),
      sim.perYear.length > 1 ? card(h('h2', {}, tr('Evoluție pe ani')), lineChart({
        labels: sim.perYear.map(x => tr('An {n}', { n: x.year })),
        series: [
          { name: tr('Valoare'), color: 'var(--accent)', values: sim.perYear.map(x => x.value) },
          { name: tr('Total depus'), color: 'var(--chart2)', values: sim.perYear.map(x => x.deposited), dashed: true },
        ],
        format: v => money(v),
      })) : null,
      h('details', { class: 'done-goals' },
        h('summary', {}, tr('Vezi pe fiecare an')),
        h('div', { class: 'list' }, sim.perYear.map(x => listRow({
          title: tr('Anul {n}', { n: x.year }), sub: tr('Depus: {sum}', { sum: money(x.deposited) }),
          right: money(x.value), rightSub: h('span', { class: 'row-sub pos' }, money(x.value - x.deposited, { sign: true })),
        })))),
      h('p', { class: 'hint' }, tr('Estimare cu randament constant și dobândă compusă lunar. Randamentele reale variază de la an la an.')));
  }

  for (const el of [initial, monthly, rate, years, growth, inflation]) el.addEventListener('input', paint);
  paint();

  const node = h('div', { class: 'page' },
    card(
      h('div', { class: 'two' },
        field(tr('Sumă de pornire'), initial),
        field(tr('Depunere lunară'), monthly)),
      portfolio > 0 ? linkBtn(tr('Folosește portofoliul actual ({sum})', { sum: money(portfolio) }), () => { initial.value = forInput(portfolio); paint(); }, null) : null,
      h('div', { class: 'two' },
        field(tr('Randament anual (%)'), rate),
        field(tr('Perioadă (ani)'), years)),
      h('div', { class: 'two' },
        field(tr('Creștere/an (%)'), growth),
        field(tr('Inflație/an (%)'), inflation)),
      h('p', { class: 'hint' }, tr('„Creștere/an” mărește depunerea lunară în fiecare an (ex. odată cu salariul). Inflația arată cât valorează suma în banii de azi.'))),
    result);
  return { title: tr('Calculator'), back: '#/acasa', node };
}
