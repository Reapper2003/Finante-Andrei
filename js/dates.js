// Utilitare pentru date. Datele se păstrează ca text „AAAA-LL-ZZ”, lunile ca „AAAA-LL”.

import { state } from './store.js';

const NAMES = {
  ro: {
    months: ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'],
    short: ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'],
    weekdays: ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'],
  },
  en: {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    short: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
};
const isEn = () => state.settings.lang === 'en';
const names = () => NAMES[isEn() ? 'en' : 'ro'];

const pad = n => String(n).padStart(2, '0');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const currentMonth = () => today().slice(0, 7);

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
}

export function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthEnd(key) {
  const [y, m] = key.split('-').map(Number);
  return `${key}-${pad(new Date(y, m, 0).getDate())}`;
}

export function addDays(s, n) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);

// Adaugă n luni păstrând ziua (anchorDay), limitată la ultima zi a lunii.
export function addMonthsDate(s, n, anchorDay) {
  const d = parseISO(s);
  const day = anchorDay || d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last));
  return iso(t);
}

export function monthsRange(from, to) {
  const out = [];
  for (let k = from; k <= to; k = addMonths(k, 1)) out.push(k);
  return out;
}

// Formatul datei se alege din Setări (independent de limbă).
export const DATE_FORMATS = [
  { value: 'dmy.', label: '31.10.2026' },
  { value: 'dmy/', label: '31/10/2026' },
  { value: 'mdy', label: '10/31/2026' },
  { value: 'iso', label: '2026-10-31' },
];

export function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  switch (state.settings.dateFormat) {
    case 'dmy/': return `${d}/${m}/${y}`;
    case 'mdy': return `${m}/${d}/${y}`;
    case 'iso': return `${y}-${m}-${d}`;
    default: return `${d}.${m}.${y}`;
  }
}

// Doar ziua și luna, în același format: 31.10 / 31/10 / 10/31 / 10-31
export function fmtDayMonth(s) {
  const [, m, d] = s.split('-');
  switch (state.settings.dateFormat) {
    case 'dmy/': return `${d}/${m}`;
    case 'mdy': return `${m}/${d}`;
    case 'iso': return `${m}-${d}`;
    default: return `${d}.${m}`;
  }
}

export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return cap(`${names().months[m - 1]} ${y}`);
}

// Doar numele scurt al lunii: „oct” / „Oct”.
export const monthAbbr = key => names().short[Number(key.slice(5, 7)) - 1];

export function monthShort(key) {
  const [y, m] = key.split('-').map(Number);
  return `${names().short[m - 1]} ${String(y).slice(2)}`;
}

export function dayLabel(s) {
  const t = today();
  if (s === t) return isEn() ? 'Today' : 'Azi';
  if (s === addDays(t, -1)) return isEn() ? 'Yesterday' : 'Ieri';
  const d = parseISO(s), n = names();
  let out = `${cap(n.weekdays[d.getDay()])}, ${d.getDate()} ${n.months[d.getMonth()]}`;
  if (d.getFullYear() !== new Date().getFullYear()) out += ` ${d.getFullYear()}`;
  return out;
}

export function inDays(s) {
  const n = daysBetween(today(), s);
  if (isEn()) {
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n < 0) return n === -1 ? 'yesterday' : `${-n} days ago`;
    return `in ${n} days`;
  }
  if (n === 0) return 'azi';
  if (n === 1) return 'mâine';
  if (n < 0) return n === -1 ? 'ieri' : `acum ${-n} zile`;
  return `în ${n} zile`;
}

export const weekdayName = s => names().weekdays[parseISO(s).getDay()];

// Ziua în care intră salariul într-o lună: ziua aleasă (sau ultima zi a lunii, dacă luna e mai scurtă);
// dacă pică sâmbătă sau duminică, salariul intră vinerea dinainte.
export function paydayIn(key, day) {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const d = new Date(y, m - 1, Math.min(day, last));
  const dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() - 1);
  else if (dow === 0) d.setDate(d.getDate() - 2);
  return iso(d);
}

// Următoarea zi de salariu strict după `from` (dacă salariul intră azi, următorul e luna viitoare).
export function nextPayday(day, from = today()) {
  for (let i = 0; i < 3; i++) {
    const p = paydayIn(addMonths(from.slice(0, 7), i), day);
    if (p > from) return p;
  }
  return paydayIn(addMonths(from.slice(0, 7), 1), day);
}

export const weekdayInitials = () => (isEn() ? ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'] : ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D']);
