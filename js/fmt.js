// Formatare sume și procente. Formatul numerelor se alege din Setări (independent de limbă).

import { state } from './store.js';

export const CURRENCIES = { RON: 'lei', EUR: '€', USD: '$' };
export const HIDDEN = '••••';

// [separator de mii, separator zecimal]
const SEPARATORS = { ro: ['.', ','], en: [',', '.'], space: [' ', ','] };
export const NUMBER_FORMATS = [
  { value: 'ro', label: '1.234,56' },
  { value: 'en', label: '1,234.56' },
  { value: 'space', label: '1 234,56' },
];
const seps = () => SEPARATORS[state.settings.numberFormat] || SEPARATORS.ro;
const decimalSep = () => seps()[1];

export const isPrivate = () => state.settings.privateMode;

export function num(v, dec = 2) {
  const n = Math.abs(Number(v) || 0);
  let [i, f] = n.toFixed(dec).split('.');
  const [th, dp] = seps();
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, th);
  return f ? `${i}${dp}${f}` : i;
}

// opts: cur (monedă), sign (afișează + la pozitiv), show (ignoră modul privat)
export function money(v, opts = {}) {
  if (isPrivate() && !opts.show) return HIDDEN;
  const cur = opts.cur || state.settings.currency;
  const n = Math.round((Number(v) || 0) * 100) / 100;
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : '';
  return `${sign}${num(n)} ${CURRENCIES[cur] || cur}`;
}

export function pct(v, dec = 1, sign = false) {
  if (v == null || !isFinite(v)) return '—';
  const p = v * 100;
  const s = num(p, dec).replace(/[.,]0+$/, '');
  return `${p < 0 && s !== '0' ? '−' : sign && p > 0 ? '+' : ''}${s}%`;
}

export function compact(v) {
  const n = Number(v) || 0, a = Math.abs(n), s = n < 0 ? '−' : '';
  const trim = x => x.replace(/[.,]0$/, '');
  if (a >= 1e6) return s + trim(num(a / 1e6, 1)) + (state.settings.lang === 'en' ? 'M' : ' mil');
  if (a >= 1e4) return s + num(a / 1e3, 0) + 'k';
  if (a >= 1e3) return s + trim(num(a / 1e3, 1)) + 'k';
  return s + num(a, 0);
}

// Citește o sumă scrisă de utilizator, după separatorul zecimal ales.
// Virgulă zecimală: „1234,56”, „1.234,56”, „1 234,56”, „1234.56”. Punct zecimal: „1,234.56”, „1234.56”, „12,5”.
export function parseAmount(str) {
  let t = String(str ?? '').trim().replace(/\s|lei|ron|€|\$/gi, '').replace('−', '-');
  if (!t) return NaN;
  if (decimalSep() === '.') {
    if (t.includes(',') && !t.includes('.') && /,\d{1,2}$/.test(t)) t = t.replace(',', '.');
    else t = t.replace(/,/g, '');
  } else if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(',', '.');
  return /^-?\d*\.?\d+$/.test(t) ? Number(t) : NaN;
}

export const forInput = v => (v == null || v === '' || isNaN(v) ? '' : String(v).replace('.', decimalSep()));
export const amountPlaceholder = () => `0${decimalSep()}00`;

// „1 lună”, „5 luni”, „23 de luni” (în română, de la 20 în sus se pune „de”). În engleză: „1 month”, „23 months”.
export function plural(n, one, many) {
  if (n === 1) return `1 ${one}`;
  const r = Math.abs(n) % 100;
  const de = state.settings.lang !== 'en' && n !== 0 && (r === 0 || r >= 20) ? 'de ' : '';
  return `${n} ${de}${many}`;
}
