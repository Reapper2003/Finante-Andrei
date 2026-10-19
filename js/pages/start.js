// Configurarea de la prima pornire: monedă → cât ai în cont → ziua salariului.

import { state, commit } from '../store.js';
import { CURRENCIES, parseAmount } from '../fmt.js';
import { round2 } from '../calc.js';
import { h, icon, btn, go, segmented, amountInput, invalid, linkBtn } from '../ui.js';
import { loadDemo } from './dashboard.js';
import { t as tr } from '../i18n.js';

export const needsOnboarding = () =>
  !state.settings.onboarded && !state.transactions.length && !state.goals.length && !state.brokers.length;

let step = 0;
const draft = { currency: null, opening: '', salaryDay: '' };

function finish() {
  state.settings.onboarded = true;
  step = 0;
  commit();
  go('#/acasa');
}

export function startPage() {
  const st = state.settings;
  draft.currency ??= st.currency;
  const next = () => { step++; go('#/start'); };
  const back = step ? linkBtn(tr('Înapoi'), () => { step--; go('#/start'); }, 'chevL') : null;

  let title, text, control, onNext;
  if (step === 0) {
    title = tr('Bun venit! 👋');
    text = tr('În 3 pași scurți pregătim aplicația pentru tine. Toate se pot schimba oricând din Setări.');
    control = h('div', {}, h('p', { class: 'start-q' }, tr('În ce monedă îți ții banii?')),
      segmented(Object.keys(CURRENCIES).map(c => ({ value: c, label: c })), draft.currency, v => { draft.currency = v; }));
    onNext = () => { st.currency = draft.currency; next(); };
  } else if (step === 1) {
    title = tr('Cât ai acum în cont?');
    text = tr('Suma de pe cardul sau contul pe care îl folosești zilnic. De aici pornesc toate calculele.');
    const input = amountInput(draft.opening);
    control = input;
    onNext = () => {
      const v = input.value.trim() ? parseAmount(input.value) : 0;
      if (isNaN(v)) return invalid(input, tr('Sumă invalidă'));
      draft.opening = input.value;
      st.opening = { ...st.opening, curent: round2(v) };
      next();
    };
  } else {
    title = tr('Când îți intră salariul?');
    text = tr('Ziua din lună. Așa aplicația îți spune cât poți cheltui pe zi până la următorul salariu.');
    const input = h('input', { type: 'text', inputmode: 'numeric', class: 'amount', placeholder: tr('ex. 10'), value: draft.salaryDay, 'aria-label': tr('Ziua salariului') });
    control = h('div', {}, input, h('button', { type: 'button', class: 'link-btn small', onclick: () => { st.salaryDay = null; finish(); } }, tr('Nu am o zi fixă')));
    onNext = () => {
      const d = parseInt(input.value, 10);
      if (!(d >= 1 && d <= 31)) return invalid(input, tr('Ziua trebuie să fie între 1 și 31'));
      st.salaryDay = d;
      finish();
    };
  }

  const node = h('div', { class: 'page start' },
    h('div', { class: 'start-dots' }, [0, 1, 2].map(i => h('i', { class: i === step ? 'on' : i < step ? 'done' : '' }))),
    h('div', { class: 'start-card card' },
      h('h2', {}, title),
      h('p', { class: 'muted' }, text),
      control),
    btn(step < 2 ? tr('Continuă') : tr('Gata'), () => onNext()),
    h('div', { class: 'start-foot' },
      back,
      h('button', { type: 'button', class: 'link-btn small', onclick: () => { state.settings.onboarded = true; step = 0; loadDemo(); go('#/acasa'); } },
        icon('refresh', 16), tr('Vreau doar să văd aplicația, cu date demo'))));
  return { title: tr('Configurare'), subtitle: tr('Pasul {n} din 3', { n: step + 1 }), node };
}
