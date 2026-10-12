import { state, commit, setState, resetAll, isValidBackup, accountName, dataSize } from '../store.js';
import { money, num, parseAmount, forInput, CURRENCIES, NUMBER_FORMATS } from '../fmt.js';
import { DATE_FORMATS } from '../dates.js';
import { round2 } from '../calc.js';
import {
  h, icon, sectionHead, segmented, switchRow, openSheet, field, amountInput, btn, invalid, toast, confirmDialog, go, applyTheme,
  selectInput, DEFAULT_ACCENT,
} from '../ui.js';
import { openExportSheet } from '../forms.js';
import { exportBackup } from '../exporter.js';
import { runAutomations } from '../actions.js';
import { loadDemo } from './dashboard.js';
import { openEfSettings } from './emergency.js';
import { t as tr } from '../i18n.js';

const CUR_OPTS = Object.keys(CURRENCIES).map(c => ({ value: c, label: c }));
const LANG_OPTS = [{ value: 'ro', label: 'Română' }, { value: 'en', label: 'English' }];
const ACCENTS = [
  ['#6C47FF', 'Mov'], ['#2F6BD8', 'Albastru'], ['#4F46E5', 'Indigo'], ['#0E9AA7', 'Turcoaz'], ['#16A34A', 'Verde'],
  ['#F2545B', 'Coral'], ['#E1306C', 'Roz'], ['#F97316', 'Portocaliu'], ['#3F4652', 'Grafit'],
];

// Culori presetate + orice culoare din selectorul telefonului.
function accentPicker() {
  const cur = (state.settings.accent || DEFAULT_ACCENT).toUpperCase();
  const set = v => { state.settings.accent = v.toUpperCase(); applyTheme(); commit(); };
  const custom = h('input', { type: 'color', value: cur.toLowerCase(), 'aria-label': tr('Altă culoare') });
  custom.addEventListener('change', () => set(custom.value));
  const isPreset = ACCENTS.some(([c]) => c === cur);
  return h('div', { class: 'accent-grid' },
    ACCENTS.map(([c, name]) => h('button', {
      type: 'button', class: 'accent-sw' + (c === cur ? ' on' : ''), style: { background: c }, 'aria-label': tr(name), title: tr(name), onclick: () => set(c),
    })),
    h('label', { class: 'accent-sw custom' + (isPreset ? '' : ' on'), style: isPreset ? {} : { background: cur }, title: tr('Altă culoare') }, isPreset ? '+' : null, custom));
}

const sizeLabel = b => (b < 1024 * 1024 ? `${num(b / 1024, 0)} KB` : `${num(b / 1024 / 1024, 1)} MB`);

function navRow(title, sub, onclick, cls = '') {
  return h('button', { type: 'button', class: `row tap ${cls}`, onclick },
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), sub ? h('div', { class: 'row-sub' }, sub) : null),
    h('span', { class: 'chev', 'aria-hidden': 'true' }, icon('chevR', 18)));
}

function stackRow(title, control, hint) {
  return h('div', { class: 'row stacked' }, h('div', { class: 'row-title' }, title), control, hint ? h('div', { class: 'row-sub' }, hint) : null);
}

function openRates() {
  const eur = amountInput(state.settings.rates.EUR), usd = amountInput(state.settings.rates.USD);
  const sh = openSheet({
    title: tr('Curs de schimb'),
    body: h('div', {},
      h('div', { class: 'two' }, field(tr('1 EUR în lei'), eur), field(tr('1 USD în lei'), usd)),
      h('p', { class: 'hint' }, tr('Folosit pentru brokerii în altă monedă și la totalurile portofoliului. Îl actualizezi manual.'))),
    footer: btn(tr('Salvează'), () => {
      const e = parseAmount(eur.value), u = parseAmount(usd.value);
      if (!(e > 0)) return invalid(eur, tr('Curs invalid'));
      if (!(u > 0)) return invalid(usd, tr('Curs invalid'));
      state.settings.rates = { EUR: e, USD: u };
      commit();
      sh.close();
      toast(tr('Curs salvat'));
    }),
  });
}

function openOpening() {
  const cur = amountInput(forInput(state.settings.opening.curent) || ''), eco = amountInput(forInput(state.settings.opening.economii) || '');
  cur.setAttribute('inputmode', 'text');
  const sh = openSheet({
    title: tr('Solduri inițiale'),
    body: h('div', {},
      field(tr('Cont Curent'), cur, tr('Cât aveai în cont când ai început să folosești aplicația. Poate fi și negativ.')),
      field(tr('Economii (alte economii)'), eco, tr('Fondul de urgență și goal-urile au sumele inițiale în paginile lor.'))),
    footer: btn(tr('Salvează'), () => {
      const c = cur.value.trim() ? parseAmount(cur.value) : 0;
      const e = eco.value.trim() ? parseAmount(eco.value) : 0;
      if (isNaN(c)) return invalid(cur, tr('Sumă invalidă'));
      if (!(e >= 0)) return invalid(eco, tr('Suma trebuie să fie pozitivă'));
      state.settings.opening = { curent: round2(c), economii: round2(e) };
      commit();
      sh.close();
      toast(tr('Solduri salvate'));
    }),
  });
}

function restore() {
  // Fără filtru de tip: pe iPhone, filtrul JSON face ca fișierele .json să nu poată fi alese. Conținutul e verificat după citire.
  const input = h('input', { type: 'file', hidden: true });
  document.body.append(input);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    let raw;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      return toast(tr('Fișierul nu este un backup valid'));
    }
    if (!isValidBackup(raw)) return toast(tr('Fișierul nu este un backup valid'));
    const ok = await confirmDialog({ title: tr('Restaurezi backup-ul?'), message: tr('Datele actuale vor fi înlocuite cu cele din fișier.'), ok: tr('Restaurează') });
    if (!ok) return;
    setState(raw);
    runAutomations();
    commit();
    applyTheme();
    toast(tr('Date restaurate'));
  });
  input.click();
}

async function demo() {
  const hasData = state.transactions.length || state.brokers.length || state.goals.length;
  if (hasData && !(await confirmDialog({ title: tr('Încarci date demo?'), message: tr('Datele tale actuale vor fi înlocuite. Fă un backup înainte dacă vrei să le păstrezi.'), ok: tr('Încarcă') }))) return;
  loadDemo();
  go('#/acasa');
}

async function wipe() {
  if (!(await confirmDialog({ title: tr('Ștergi toate datele?'), message: tr('Se șterg toate tranzacțiile, investițiile, goal-urile, datoriile și setările de pe acest dispozitiv.'), ok: tr('Continuă') }))) return;
  const word = tr('ȘTERGE');
  const input = h('input', { type: 'text', autocomplete: 'off', placeholder: word, autocapitalize: 'characters' });
  const confirmBtn = btn(tr('Șterge definitiv'), () => {
    const v = input.value.trim().toUpperCase();
    if (![word, 'ȘTERGE', 'STERGE', 'DELETE'].includes(v)) return invalid(input, tr('Scrie ȘTERGE pentru confirmare'));
    const lang = state.settings.lang;
    resetAll();
    state.settings.lang = lang;
    commit();
    applyTheme();
    sh.close();
    toast(tr('Toate datele au fost șterse'));
    go('#/acasa');
  }, 'danger');
  const sh = openSheet({
    title: tr('Confirmare finală'),
    body: h('div', {}, h('p', { class: 'muted' }, tr('Acțiunea nu poate fi anulată. Scrie ȘTERGE mai jos:')), input),
    footer: confirmBtn,
  });
  input.focus({ preventScroll: true });
}

export function settingsPage() {
  const st = state.settings;
  const themeOpts = [{ value: 'light', label: tr('Luminoasă') }, { value: 'dark', label: tr('Întunecată') }, { value: 'auto', label: tr('Automată') }];
  const node = h('div', { class: 'page' },
    sectionHead(tr('General')),
    h('div', { class: 'list' },
      stackRow('Limbă / Language', segmented(LANG_OPTS, st.lang || 'ro', v => { st.lang = v; commit(); toast(tr('Limba a fost schimbată')); })),
      stackRow(tr('Format numere'), segmented(NUMBER_FORMATS, st.numberFormat || 'ro', v => { st.numberFormat = v; commit(); })),
      stackRow(tr('Format dată'), (() => { const s = selectInput(DATE_FORMATS, st.dateFormat || 'dmy.'); s.addEventListener('change', () => { st.dateFormat = s.value; commit(); }); return s; })()),
      stackRow(tr('Monedă implicită'), segmented(CUR_OPTS, st.currency, v => { st.currency = v; commit(); toast(tr('Monedă schimbată')); }), tr('Sumele existente nu se convertesc, se schimbă doar afișarea.')),
      navRow(tr('Curs de schimb'), tr('1 EUR = {eur} lei · 1 USD = {usd} lei', { eur: num(st.rates.EUR, 4), usd: num(st.rates.USD, 4) }), openRates),
      stackRow(tr('Temă'), segmented(themeOpts, st.theme, v => { st.theme = v; applyTheme(); commit(); })),
      stackRow(tr('Culoare principală'), accentPicker(),
        (st.accent || DEFAULT_ACCENT).toUpperCase() !== DEFAULT_ACCENT ? h('button', { type: 'button', class: 'link-btn small', onclick: () => { st.accent = DEFAULT_ACCENT; applyTheme(); commit(); } }, tr('Revino la mov')) : null),
      switchRow(tr('Pornește aplicația în mod privat'), st.privateOnStart, v => { st.privateOnStart = v; commit(); }, tr('Sumele sunt ascunse la deschidere'))),
    sectionHead(tr('Conturi')),
    h('div', { class: 'list' },
      navRow(tr('Solduri inițiale'), `${accountName('curent')} ${money(st.opening.curent)} · ${accountName('economii')} ${money(st.opening.economii)}`, openOpening),
      navRow(tr('Gestionare categorii'), tr('{n} categorii', { n: state.categories.length }), () => go('#/categorii')),
      navRow(tr('Ținta fondului de urgență'), tr('{n} luni', { n: state.emergency.months }), openEfSettings)),
    sectionHead(tr('Date')),
    h('div', { class: 'list' },
      navRow(tr('Exportă în Excel'), tr('Toate datele sau o anumită perioadă'), openExportSheet),
      navRow(tr('Backup (export JSON)'), tr('Salvează o copie a tuturor datelor'), () => exportBackup().then(() => toast(tr('Backup creat')))),
      navRow(tr('Restaurare (import JSON)'), tr('Încarcă datele dintr-un backup'), restore),
      navRow(tr('Încarcă date demo'), tr('Ca să vezi cum arată aplicația'), demo),
      navRow(tr('Șterge toate datele'), tr('Cu confirmare dublă'), wipe, 'danger-text')),
    h('p', { class: 'hint center' }, tr('Datele sunt salvate doar pe acest dispozitiv. Fă din când în când un backup.')),
    h('p', { class: 'hint center' }, tr('Spațiu folosit: {size}', { size: sizeLabel(dataSize()) })));
  return { title: tr('Setări'), back: '#/mai-mult', node };
}
