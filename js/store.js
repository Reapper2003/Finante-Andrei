// Starea aplicației: un singur obiect, salvat în localStorage.

import { t as tr } from './i18n.js';

const KEY = 'finante.data.v1';

export const ACCOUNTS = [
  { id: 'curent', name: 'Curent' },
  { id: 'economii', name: 'Economii' },
  { id: 'investitii', name: 'Investiții' },
];
export const accountName = id => tr(ACCOUNTS.find(a => a.id === id)?.name || '—');

// Nuanțe pastelate pentru categorii, goal-uri și grafice.
export const PALETTE = ['#6FA8FF', '#FF8A80', '#5DD3A6', '#FFB45C', '#B48CFF', '#FFD157', '#4FD1DC', '#FF8AC6',
  '#A3D96B', '#FF9F7A', '#8C9EFF', '#E3B77A', '#7CCBFF', '#E58CFF', '#4CC9A8', '#FFC48A'];
const OLD_PALETTE = ['#8FB8DE', '#F4A7A3', '#A8D5BA', '#F6C89F', '#C3B1E1', '#F3D58A', '#9AD1D4', '#E8A9C9',
  '#B5C99A', '#F2B5A0', '#A7BED3', '#D9C4A3', '#B9D7EA', '#E6C0E9', '#9FC5B0', '#F0C6A5'];

const DEFAULT_CATS = [
  ['venit', 'Salariu', '💼'], ['venit', 'Freelance', '💻'], ['venit', 'Bonus', '⭐'], ['venit', 'Cadouri', '🎁'],
  ['venit', 'Vânzări', '🏷️'], ['venit', 'Dividende', '📈'], ['venit', 'Altele', '➕'],
  ['cheltuiala', 'Mâncare', '🛒'], ['cheltuiala', 'Transport', '🚌'], ['cheltuiala', 'Locuință', '🏠'],
  ['cheltuiala', 'Utilități', '💡'], ['cheltuiala', 'Sănătate', '💊'], ['cheltuiala', 'Distracție', '🎬'],
  ['cheltuiala', 'Shopping', '🛍️'], ['cheltuiala', 'Abonamente', '🔁'], ['cheltuiala', 'Educație', '📚'],
  ['cheltuiala', 'Cadouri', '🎁'], ['cheltuiala', 'Rate credite', '🏦'], ['cheltuiala', 'Altele', '📦'],
];

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function defaultCategories() {
  let vi = 0, ci = 0;
  return DEFAULT_CATS.map(([type, name, icon]) => ({
    id: `${type === 'venit' ? 'v' : 'c'}-${slug(name)}`,
    type, name, icon,
    color: PALETTE[type === 'venit' ? (vi++ * 3 + 2) % PALETTE.length : ci++ % PALETTE.length],
  }));
}

export function defaultState() {
  return {
    version: 1,
    settings: {
      lang: 'ro',
      numberFormat: 'ro',
      dateFormat: 'dmy.',
      accent: '#6C47FF',
      currency: 'RON',
      rates: { EUR: 4.97, USD: 4.35 },
      theme: 'auto',
      privateMode: false,
      privateOnStart: false,
      includeReceivables: false,
      opening: { curent: 0, economii: 0 },
    },
    emergency: { initial: 0, months: 6, manualAvg: null, red: 1, orange: 3 },
    categories: defaultCategories(),
    transactions: [],
    brokers: [],
    assets: [],
    contributions: [],
    assetValues: [],
    subscriptions: [],
    goals: [],
    debts: [],
    debtPayments: [],
    receivables: [],
    snapshots: [],
    reports: [],
  };
}

function migrate(raw) {
  const d = defaultState();
  const s = { ...d, ...raw };
  s.settings = { ...d.settings, ...(raw.settings || {}) };
  s.settings.rates = { ...d.settings.rates, ...(raw.settings?.rates || {}) };
  s.settings.opening = { ...d.settings.opening, ...(raw.settings?.opening || {}) };
  s.emergency = { ...d.emergency, ...(raw.emergency || {}) };
  for (const k of Object.keys(d)) if (Array.isArray(d[k]) && !Array.isArray(s[k])) s[k] = [];
  if (!s.categories.length) s.categories = d.categories;
  // Culorile din paleta veche (prea șterse) trec la nuanța corespunzătoare din paleta nouă.
  for (const x of [...s.categories, ...s.goals]) {
    const i = OLD_PALETTE.indexOf(String(x.color).toUpperCase());
    if (i >= 0) x.color = PALETTE[i];
  }
  return s;
}

export let state = defaultState();

export const isValidBackup = raw => !!raw && typeof raw === 'object' && Array.isArray(raw.transactions) && Array.isArray(raw.categories);
export function setState(raw) { state = migrate(raw); }

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? migrate(JSON.parse(raw)) : defaultState();
  } catch {
    state = defaultState();
  }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function resetAll() {
  try { localStorage.removeItem(KEY); } catch { /* ignorat */ }
  state = defaultState();
}

const listeners = new Set();
export const subscribe = fn => listeners.add(fn);
export function commit() {
  const ok = save();
  listeners.forEach(fn => fn(ok));
}

let seq = 0;
export const uid = () => Date.now().toString(36) + (seq++ % 1296).toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 6);

export const catById = id => state.categories.find(c => c.id === id);
export const catByName = (name, type) => state.categories.find(c => c.name === name && (!type || c.type === type));
