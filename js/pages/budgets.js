// Pagina Bugete: limitele lunare pe categorii, puse de tine.
// Limita e aceeași în fiecare lună; bugetele nu intră în „Azi mai poți cheltui”.

import { state, commit, catById } from '../store.js';
import { currentMonth, monthLabel, monthEnd, today, daysBetween } from '../dates.js';
import { moneyRound, moneyShort, parseAmount, forInput } from '../fmt.js';
import { budgetStats, categoryAvg } from '../calc.js';
import {
  h, card, sectionHead, linkBtn, btn, openSheet, field, amountInput, selectInput, invalid, toast, catIcon, progress
} from '../ui.js';
import { getMonth, monthChip, openMonthSheet } from '../menu.js';
import { categoryTxList } from '../forms.js';
import { t as tr, catName } from '../i18n.js';

// Media rotunjită în sus la 50 (ex. 1.417 → 1.450).
const up50 = v => Math.ceil(v / 50) * 50;

// Culoarea barei: accent sub 85%, avertizare până la 100%, roșu peste.
export const budgetTone = p => (p > 1 ? 'neg' : p >= 0.85 ? 'warn' : '');
export const budgetColor = p => (p > 1 ? 'var(--neg)' : p >= 0.85 ? 'var(--warn)' : null);

/* ---------- Limite pe categorii ---------- */

function budgetRow(b, m) {
  const live = m === currentMonth();
  const days = daysBetween(today(), monthEnd(m)) + 1;
  const tone = budgetTone(b.pct);
  const text = b.left < 0 ? tr('Ai depășit cu {sum}', { sum: moneyRound(-b.left) })
    : live && b.pct >= 0.85 ? (days === 1 ? tr('Mai ai {sum} pentru o zi', { sum: moneyRound(b.left) }) : tr('Mai ai {sum} pentru {n} zile', { sum: moneyRound(b.left), n: days }))
    : tr('Mai ai {sum}', { sum: moneyRound(b.left) });
  return h('button', { type: 'button', class: 'bud-row', onclick: () => openBudgetEdit(b.cat, m) },
    h('div', { class: 'bud-top' }, catIcon(b.cat, 36), h('span', { class: 'bud-name' }, catName(b.cat)),
      h('b', {}, `${moneyShort(b.spent)} / ${moneyRound(b.limit)}`)),
    progress(Math.min(1, b.pct), budgetColor(b.pct)),
    h('small', { class: 'bud-left ' + (b.left < 0 ? 'neg' : tone === 'warn' && live ? 'warn' : 'muted') }, text));
}

function openBudgetEdit(c, m) {
  const amount = amountInput(c.budget);
  const sh = openSheet({
    title: tr('Buget: {name}', { name: catName(c) }),
    body: h('div', {}, field(tr('Limită lunară'), amount), avgHint(c.id, amount), categoryTxList(c.id, m)),
    footer: h('div', { class: 'btn-row' },
      btn(tr('Șterge limita'), () => {
        catById(c.id).budget = null;
        commit();
        sh.close();
        toast(tr('Limită ștearsă'));
      }, 'ghost danger-text'),
      btn(tr('Salvează'), () => {
        const v = parseAmount(amount.value);
        if (!(v > 0)) return invalid(amount, tr('Introdu o sumă'));
        catById(c.id).budget = Math.round(v * 100) / 100;
        commit();
        sh.close();
        toast(tr('Buget salvat'));
      })),
  });
}

// Sub câmpul de sumă: media ultimelor 3 luni și „Folosește” (rotunjită în sus la 50).
function avgHint(catId, input) {
  const box = h('div', { class: 'avg-hint' });
  const paint = id => {
    const avg = id ? categoryAvg(id) : 0;
    box.replaceChildren(...(avg > 0 ? [
      h('span', {}, tr('Media ultimelor 3 luni: {sum}', { sum: moneyRound(avg) })),
      h('button', { type: 'button', class: 'link-btn', onclick: () => { input.value = forInput(up50(avg)); } }, tr('Folosește')),
    ] : []));
  };
  paint(catId);
  box.update = paint;
  return box;
}

function openBudgetAdd() {
  const free = state.categories.filter(c => c.type === 'cheltuiala' && !(c.budget > 0));
  if (!free.length) return toast(tr('Toate categoriile au deja o limită'));
  const pick = selectInput(free.map(c => ({ value: c.id, label: catName(c) })), free[0].id);
  const amount = amountInput('');
  const hint = avgHint(free[0].id, amount);
  pick.addEventListener('change', () => hint.update(pick.value));
  const sh = openSheet({
    title: tr('Buget nou'),
    body: h('div', {}, field(tr('Categorie'), pick), field(tr('Limită lunară'), amount), hint),
    footer: btn(tr('Salvează'), () => {
      const v = parseAmount(amount.value);
      if (!(v > 0)) return invalid(amount, tr('Introdu o sumă'));
      catById(pick.value).budget = Math.round(v * 100) / 100;
      commit();
      sh.close();
      toast(tr('Buget salvat'));
    }),
  });
}

export function budgetsPage() {
  const m = getMonth();
  const list = budgetStats(m);
  const node = h('div', { class: 'page' },
    monthChip(),
    sectionHead(tr('Limite pe categorii'), list.length ? linkBtn(tr('Adaugă'), openBudgetAdd) : null),
    list.length
      ? h('div', { class: 'list bud-list' }, list.map(b => budgetRow(b, m)))
      : card(h('div', { class: 'empty' },
        h('p', {}, tr('Pune o limită lunară pe categoriile unde vrei să cheltui mai atent. Vezi aici cât ai folosit din ea în fiecare lună.')),
        btn(tr('Adaugă primul buget'), openBudgetAdd))));
  return { title: tr('Bugete'), subtitle: monthLabel(m), onSubtitle: openMonthSheet, node };
}
