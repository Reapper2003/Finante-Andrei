// Starea aplicației: un singur obiect, salvat local în IndexedDB (rezervă: localStorage).

import { t as tr } from './i18n.js';
import { idbGet, idbSet, idbDelete } from './db.js';
import { effectiveAccent } from './heroColors.js';

// Module care pot fi ascunse din Setări → Module (implicit toate sunt vizibile).
export const MODULES = [
  ['investitii', 'Investiții', 'Brokeri, active și evoluția portofoliului'],
  ['abonamente', 'Abonamente', 'Plăți lunare sau anuale care se repetă'],
  ['datorii', 'Datorii', 'Credite, rate și bani împrumutați'],
  ['avere', 'Avere netă', 'Tot ce ai minus tot ce datorezi'],
  ['dorinte', 'Listă de dorințe', 'Lucruri pe care ți le dorești și idei de cadouri'],
];
export const modOn = k => state.settings.modules?.[k] !== false;

// Al patrulea tab din bara de jos, ales în Setări → Module: [id, nume scurt, iconiță, modul].
// Implicit Investițiile (sau Rapoartele, dacă Investițiile sunt ascunse).
export const TAB_SLOTS = [
  ['investitii', 'Investiții', 'trend', 'investitii'],
  ['plan', 'Calculator', 'calc', null],
  ['rapoarte', 'Rapoarte', 'report', null],
  ['abonamente', 'Abonamente', 'repeat', 'abonamente'],
  ['datorii', 'Datorii', 'card', 'datorii'],
  ['avere', 'Avere', 'scale', 'avere'],
  ['dorinte', 'Dorințe', 'gift', 'dorinte'],
  ['fond', 'Urgență', 'shield', null],
  ['calculator', 'Calc. investiții', 'trend', null],
];
export function slotTab() {
  const ok = x => x && (!x[3] || modOn(x[3]));
  const pick = TAB_SLOTS.find(x => x[0] === state.settings.tabSlot);
  return ok(pick) ? pick : TAB_SLOTS.find(ok);
}

// Crește odată cu VERSION din sw.js; apare în Setări ca să vezi ce versiune rulează.
export const APP_VERSION = 60;

const KEY = 'finante.data.v1';
// Tema și culoarea, păstrate și separat ca pagina să le aplice înainte de afișare (vezi index.html).
const PREFS_KEY = 'finante.prefs';

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
      salaryDay: null,
      heroStyle: 'aurora',
      currency: 'RON',
      rates: { EUR: 4.97, USD: 4.35 },
      theme: 'auto',
      privateMode: false,
      privateOnStart: false,
      includeReceivables: false,
      opening: { curent: 0, economii: 0 },
      payConfirm: true,
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
    funds: [],
    debts: [],
    debtPayments: [],
    receivables: [],
    snapshots: [],
    reports: [],
    wishes: [], // listă de dorințe / cadouri; nu intră în niciun calcul
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
  // Abonamentele nu se mai înregistrează singure: rămân la „Urmează” până confirmi plata (plata automată se poate porni din nou, pe fiecare).
  if (!raw.settings?.payConfirm) {
    for (const x of s.subscriptions) x.autoRecord = false;
    s.settings.payConfirm = true;
  }
  // Culorile din paleta veche (prea șterse) trec la nuanța corespunzătoare din paleta nouă.
  for (const x of [...s.categories, ...s.goals, ...s.funds]) {
    const i = OLD_PALETTE.indexOf(String(x.color).toUpperCase());
    if (i >= 0) x.color = PALETTE[i];
  }
  return s;
}

export let state = defaultState();

export const isValidBackup = raw => !!raw && typeof raw === 'object' && Array.isArray(raw.transactions) && Array.isArray(raw.categories);
export function setState(raw) { state = migrate(raw); }

const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsRemove = k => { try { localStorage.removeItem(k); } catch { /* ignorat */ } };

// 'idb' = IndexedDB; 'ls' = localStorage, doar dacă IndexedDB nu e disponibil.
let backend = 'idb';

function writePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ theme: state.settings.theme, accent: effectiveAccent(state.settings) })); } catch { /* ignorat */ }
}

export async function load() {
  let raw = null;
  try {
    raw = await idbGet();
    if (!raw) {
      // Prima pornire după actualizare: datele vechi din localStorage se mută în IndexedDB.
      const old = lsGet(KEY);
      if (old) {
        raw = JSON.parse(old);
        await idbSet(raw);
        lsRemove(KEY);
      }
    }
    backend = 'idb';
  } catch {
    backend = 'ls';
    try { const old = lsGet(KEY); raw = old ? JSON.parse(old) : null; } catch { raw = null; }
  }
  state = raw ? migrate(raw) : defaultState();
  writePrefs();
}

// Întoarce o promisiune: true dacă datele s-au salvat.
export function save() {
  writePrefs();
  if (backend === 'ls') {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }
  return idbSet(state).then(() => true, () => false);
}

export function resetAll() {
  lsRemove(KEY);
  if (backend === 'idb') idbDelete().catch(() => {});
  state = defaultState();
}

// Cât ocupă datele (aproximativ), pentru afișare în Setări.
export const dataSize = () => new Blob([JSON.stringify(state)]).size;

const listeners = new Set();
const errorListeners = new Set();
export const subscribe = fn => listeners.add(fn);
export const onSaveError = fn => errorListeners.add(fn);
export function commit() {
  listeners.forEach(fn => fn());
  save().then(ok => { if (!ok) errorListeners.forEach(fn => fn()); });
}

let seq = 0;
export const uid = () => Date.now().toString(36) + (seq++ % 1296).toString(36).padStart(2, '0') + Math.random().toString(36).slice(2, 6);

export const catById = id => state.categories.find(c => c.id === id);
export const catByName = (name, type) => state.categories.find(c => c.name === name && (!type || c.type === type));
