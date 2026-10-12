// Traduceri: textele din aplicație sunt scrise în română și se traduc cu t('…') când limba e engleza.
// Variabilele se pun între acolade: t('Plată {name}', { name }).

import { state, defaultCategories } from './store.js';
import { EN } from './i18n-en.js';

export const isEn = () => state.settings.lang === 'en';

export function t(text, vars) {
  let out = isEn() ? EN[text] ?? text : text;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return out;
}

// Categoriile implicite au nume englezești, cât timp nu au fost redenumite.
const CAT_EN = {
  'v-salariu': 'Salary', 'v-freelance': 'Freelance', 'v-bonus': 'Bonus', 'v-cadouri': 'Gifts', 'v-vanzari': 'Sales',
  'v-dividende': 'Dividends', 'v-altele': 'Other', 'c-mancare': 'Food', 'c-transport': 'Transport', 'c-locuinta': 'Housing',
  'c-utilitati': 'Utilities', 'c-sanatate': 'Health', 'c-distractie': 'Entertainment', 'c-shopping': 'Shopping',
  'c-abonamente': 'Subscriptions', 'c-educatie': 'Education', 'c-cadouri': 'Gifts', 'c-rate-credite': 'Loan payments', 'c-altele': 'Other',
};
let defaultNames = null;

export function catName(c) {
  if (!c) return t('Fără categorie');
  if (!isEn() || !CAT_EN[c.id]) return c.name;
  defaultNames ??= Object.fromEntries(defaultCategories().map(x => [x.id, x.name]));
  return c.name === defaultNames[c.id] ? CAT_EN[c.id] : c.name;
}
