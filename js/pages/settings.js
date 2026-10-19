import { state, commit, setState, resetAll, isValidBackup, accountName, dataSize, APP_VERSION, MODULES, modOn, TAB_SLOTS, slotTab } from '../store.js';
import { money, num, parseAmount, forInput, CURRENCIES, NUMBER_FORMATS } from '../fmt.js';
import { DATE_FORMATS } from '../dates.js';
import { round2 } from '../calc.js';
import {
  h, icon, sectionHead, segmented, switchRow, openSheet, field, amountInput, btn, invalid, toast, confirmDialog, go, applyTheme,
  selectInput, DEFAULT_ACCENT, openColorPicker, nativeColorPicker, catIcon,
} from '../ui.js';
import { openExportSheet, openSalaryDay } from '../forms.js';
import { exportBackup } from '../exporter.js';
import { runAutomations } from '../actions.js';
import { loadDemo } from './dashboard.js';
import { openEfSettings } from './emergency.js';
import { t as tr } from '../i18n.js';
import { HERO_ART, INV_ART, INV_PLAIN } from '../heroArt.js';
import { HERO_ACCENT, followsHero } from '../heroColors.js';
import { openTileEditor, chosenTileNames } from './homeParts.js';

const CUR_OPTS = Object.keys(CURRENCIES).map(c => ({ value: c, label: c }));
const LANG_OPTS = [{ value: 'ro', label: 'Română' }, { value: 'en', label: 'English' }];
// Fundalurile cardului principal de pe Acasă (vezi style.css: .hero-bg-*), pe categorii.
const HERO_GROUPS = [
  ['simple', 'Simple', [['aurora', 'Aurora'], ['solid', 'Simplu'], ['glow', 'Strălucire'], ['pattern', 'Dungi'], ['glass', 'Sticlă'],
    ['dots', 'Puncte'], ['rings', 'Cercuri'], ['mesh', 'Pastel'], ['split', 'Două tonuri']]],
  ['culori', 'Culori', [['sunset', 'Apus'], ['ocean', 'Ocean'], ['forest', 'Pădure'], ['midnight', 'Noapte'], ['gold', 'Auriu'],
    ['lavender', 'Lavandă'], ['mint', 'Mentă'], ['cherry', 'Cireașă'], ['peach', 'Piersică'], ['slate', 'Ardezie']]],
  ['natura', 'Natură', [['mountains', 'Munți'], ['beach', 'Plajă'], ['sailboat', 'Velier'], ['garden', 'Grădină'], ['rain', 'Ploaie'],
    ['aurora2', 'Aurora boreală'], ['lighthouse', 'Far'], ['fireflies', 'Licurici']]],
  ['animale', 'Animale', [['bear', 'Ursuleț'], ['cat', 'Pisică'], ['puppy', 'Cățel'], ['fox', 'Vulpe'], ['panda', 'Panda'],
    ['penguin', 'Pinguin'], ['aquarium', 'Acvariu']]],
  ['noapte', 'Noapte și spațiu', [['night', 'Noapte senină'], ['city', 'Oraș noaptea'], ['space', 'Spațiu'], ['rocket', 'Rachetă'],
    ['galaxy', 'Galaxie'], ['saturn', 'Saturn'], ['astronaut', 'Astronaut']]],
  ['sezoane', 'Anotimpuri', [['spring', 'Primăvară'], ['summer', 'Vară'], ['autumn', 'Toamnă'], ['winter', 'Iarnă'], ['halloween', 'Halloween'],
    ['xmas', 'Crăciun'], ['kite', 'Zmeu']]],
  ['hobby', 'Hobby și călătorii', [['car', 'Mașină sport'], ['plane', 'Avion'], ['bike', 'Bicicletă'], ['balloons', 'Baloane'],
    ['coffee', 'Cafea'], ['music', 'Muzică'], ['gaming', 'Gaming'], ['football', 'Fotbal'], ['piggy', 'Pușculiță']]],
];
// Fundalurile cardului de la Investiții (separate de Acasă), pe categorii.
const INV_GROUPS = [
  ['simple', 'Simple', [['implicit', 'Simplu'], ['graphite', 'Grafit'], ['navy', 'Bleumarin'], ['emerald', 'Smarald'], ['burgundy', 'Bordo']]],
  ['bani', 'Bani', [['coins', 'Monede'], ['tree', 'Copacul cu bani'], ['goldbars', 'Lingouri'], ['diamond', 'Diamant'], ['vault', 'Seif'], ['sprout', 'Răsad']]],
  ['bursa', 'Bursă', [['growth', 'Creștere'], ['candles', 'Bursă'], ['bull', 'Taur'], ['target', 'Țintă'], ['crypto', 'Crypto']]],
  ['lume', 'Lume', [['globe', 'Glob'], ['compass', 'Busolă'], ['map', 'Hartă'], ['realestate', 'Imobiliare']]],
];

// Plăcuța unui fundal (aceeași în rândul din Setări și în panoul de alegere). Cele animate au un mic ✦.
function bgTile(cls, art, name, extra = {}) {
  const box = art ? h('div', { class: 'hero-art' }) : null;
  if (box) box.innerHTML = art;
  return h('button', { type: 'button', class: `bg-tile ${cls}`, ...extra },
    box, art && art.includes('class="ha-') ? h('i', { class: 'bg-anim', title: tr('Animat') }, '✦') : null,
    h('span', { style: { position: 'relative' } }, name));
}

// Panou cu file pe categorii; alegerea se aplică pe loc, iar panoul rămâne deschis ca să poți încerca mai multe.
function openBgSheet({ title, groups, art, prefix, current, onPick, hint }) {
  let cur = current();
  let tab = (groups.find(g => g[2].some(([id]) => id === cur)) || groups[0])[0];
  const tabs = h('div', { class: 'chips-scroll bg-tabs' });
  const grid = h('div', { class: 'bg-grid' });
  const note = h('p', { class: 'hint' });
  const paint = () => {
    tabs.replaceChildren(...groups.map(([id, label]) => h('button', {
      type: 'button', class: 'pchip' + (id === tab ? ' on' : ''), onclick: () => { tab = id; paint(); },
    }, tr(label))));
    const g = groups.find(x => x[0] === tab);
    grid.replaceChildren(...g[2].map(([id, name]) => bgTile(`${prefix}${id}${id === cur ? ' on' : ''}`, art[id], tr(name), {
      'aria-pressed': String(id === cur),
      onclick: () => { cur = id; onPick(id, name); paint(); },
    })));
    note.textContent = hint && tab === 'simple' ? hint : '';
    note.hidden = !note.textContent;
  };
  paint();
  openSheet({ title, body: h('div', { class: 'bg-sheet' }, tabs, grid, note) });
}

// Rând compact în Setări: fundalul ales + numele lui; la tap se deschide panoul cu categorii.
function bgRow(title, groups, art, prefix, current, open) {
  const id = current();
  const name = groups.flatMap(g => g[2]).find(x => x[0] === id)?.[1] || '';
  return h('button', { type: 'button', class: 'row tap bg-row', onclick: open },
    bgTile(`${prefix}${id} mini`, art[id], '', { tabindex: -1, 'aria-hidden': 'true' }),
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, tr(name))),
    h('span', { class: 'chev', 'aria-hidden': 'true' }, icon('chevR', 18)));
}

// Variante de temă: [id, nume, fundal, card]. „Nuanța aplicației” se calculează din culoarea principală.
const LIGHT_VARIANTS = [['rece', 'Gri rece', '#F4F5F8', '#FFFFFF'], ['alb', 'Alb', '#FFFFFF', '#F4F5F7'], ['hartie', 'Hârtie', '#F5EFE3', '#FFFCF6'], ['nuanta', 'Nuanța aplicației', null, '#FFFFFF']];
const DARK_VARIANTS = [['grafit', 'Grafit', '#0B0C10', '#16181D'], ['negru', 'Negru complet', '#000000', '#0F1013'], ['albastru', 'Albastru noapte', '#0A1020', '#121A2E'], ['nuanta', 'Nuanța aplicației', null, null]];

function variantPicker(list, cur, onPick, dark) {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--hero').trim() || DEFAULT_ACCENT;
  const tint = (pct, to) => `color-mix(in srgb, ${accent} ${pct}%, ${to})`;
  return h('div', { class: 'variant-grid' }, list.map(([id, name, bg, card]) => h('button', {
    type: 'button', class: 'variant' + (id === cur ? ' on' : ''), 'aria-pressed': String(id === cur), onclick: () => onPick(id),
  },
    h('span', { class: 'variant-prev', style: { background: bg || (dark ? tint(10, '#000') : tint(7, '#FFF')) } },
      h('i', { style: { background: card || (dark ? tint(14, '#15161A') : '#FFFFFF') } }), h('i', { style: { background: card || (dark ? tint(14, '#15161A') : '#FFFFFF') } })),
    h('small', {}, tr(name)))));
}

function iconStylePicker(cur, onPick) {
  const sample = [['🛒', 'Mâncare', '#6FA8FF'], ['🚌', 'Transport', '#FF8A80'], ['🎬', 'Distracție', '#5DD3A6']];
  return h('div', { class: 'variant-grid three' }, [['emoji', 'Emoji'], ['linie', 'Linie'], ['initiala', 'Inițială']].map(([id, name]) => {
    const prev = state.settings.iconStyle;
    state.settings.iconStyle = id; // previzualizarea fiecărui stil
    const icons = sample.map(([ic, label, color]) => catIcon({ icon: ic, name: label, color }, 30));
    state.settings.iconStyle = prev;
    return h('button', { type: 'button', class: 'variant' + (id === cur ? ' on' : ''), 'aria-pressed': String(id === cur), onclick: () => onPick(id) },
      h('span', { class: 'icon-prev' }, icons), h('small', {}, tr(name)));
  }));
}

const heroNow = () => state.settings.heroStyle || 'aurora';
const invNow = () => (INV_ART[state.settings.invStyle] || INV_PLAIN.includes(state.settings.invStyle) ? state.settings.invStyle : 'implicit');

function openHeroBgSheet() {
  openBgSheet({
    title: tr('Fundal card principal'), groups: HERO_GROUPS, art: HERO_ART, prefix: 'hero-bg-', current: heroNow,
    hint: tr('Acestea folosesc culoarea principală.'),
    onPick: (id, name) => { state.settings.heroStyle = id; applyTheme(); commit(); toast(tr('Fundal schimbat: {name}', { name: tr(name) })); },
  });
}
function openInvBgSheet() {
  openBgSheet({
    title: tr('Fundal card Investiții'), groups: INV_GROUPS, art: INV_ART, prefix: 'inv-bg-', current: invNow,
    onPick: (id, name) => { state.settings.invStyle = id; commit(); toast(tr('Fundal Investiții: {name}', { name: tr(name) })); },
  });
}
const ACCENTS = [
  ['#6C47FF', 'Mov'], ['#2F6BD8', 'Albastru'], ['#4F46E5', 'Indigo'], ['#0E9AA7', 'Turcoaz'], ['#16A34A', 'Verde'],
  ['#F2545B', 'Coral'], ['#E1306C', 'Roz'], ['#F97316', 'Portocaliu'], ['#3F4652', 'Grafit'],
];

// Culori presetate + orice culoare din selectorul telefonului.
function accentPicker() {
  const cur = (state.settings.accent || DEFAULT_ACCENT).toUpperCase();
  const set = v => { state.settings.accent = v.toUpperCase(); applyTheme(); commit(); };
  const isPreset = ACCENTS.some(([c]) => c === cur);
  return h('div', { class: 'accent-grid' },
    ACCENTS.map(([c, name]) => h('button', {
      type: 'button', class: 'accent-sw' + (c === cur ? ' on' : ''), style: { background: c }, 'aria-label': tr(name), title: tr(name), onclick: () => set(c),
    })),
    customSwatch(cur, isPreset, set));
}

// Pe iPhone: selectorul telefonului (grilă, spectru, glisoare, culori salvate, pipetă). În rest: selectorul din aplicație.
function customSwatch(cur, isPreset, set) {
  const props = { class: 'accent-sw custom' + (isPreset ? '' : ' on'), style: isPreset ? {} : { background: cur }, title: tr('Altă culoare') };
  if (nativeColorPicker()) {
    const input = h('input', { type: 'color', value: cur.toLowerCase(), 'aria-label': tr('Altă culoare') });
    input.addEventListener('change', () => set(input.value));
    return h('label', props, isPreset ? '+' : null, input);
  }
  return h('button', {
    ...props, type: 'button', 'aria-label': tr('Altă culoare'),
    onclick: () => openColorPicker({ value: cur, title: tr('Altă culoare'), onPick: set }),
  }, isPreset ? '+' : null);
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

// Setări împărțite pe subpagini: o listă scurtă la intrare, detaliile un nivel mai jos.
const SECTIONS = [
  ['aspect', 'Aspect și limbă', 'Temă, culoare, fundal, plăcile de pe Acasă, limbă', 'eye'],
  ['bani', 'Bani și conturi', 'Monedă, curs, ziua salariului, solduri', 'wallet'],
  ['module', 'Module', 'Alege ce secțiuni vezi în aplicație', 'list'],
  ['date', 'Date și backup', 'Export Excel, backup, restaurare', 'download'],
];

function iconRow(ico, title, sub, onclick) {
  return h('button', { type: 'button', class: 'row tap', onclick },
    h('span', { class: 'cat-ic neutral' }, icon(ico, 20)),
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), sub ? h('div', { class: 'row-sub' }, sub) : null),
    h('span', { class: 'chev', 'aria-hidden': 'true' }, icon('chevR', 18)));
}

function sectionContent(sub) {
  const st = state.settings;
  const themeOpts = [{ value: 'light', label: tr('Luminoasă') }, { value: 'dark', label: tr('Întunecată') }, { value: 'auto', label: tr('Automată') }];
  if (sub === 'aspect') {
    const set = (k, v) => { st[k] = v; applyTheme(); commit(); };
    return [
      sectionHead(tr('Temă')),
      h('div', { class: 'list' },
        stackRow(tr('Temă'), segmented(themeOpts, st.theme, v => set('theme', v))),
        stackRow(tr('Varianta luminoasă'), variantPicker(LIGHT_VARIANTS, st.lightVariant || 'rece', v => set('lightVariant', v), false)),
        stackRow(tr('Varianta întunecată'), variantPicker(DARK_VARIANTS, st.darkVariant || 'grafit', v => set('darkVariant', v), true))),
      sectionHead(tr('Fundaluri și culoare')),
      h('div', { class: 'list' },
        bgRow(tr('Fundal card principal'), HERO_GROUPS, HERO_ART, 'hero-bg-', heroNow, openHeroBgSheet),
        bgRow(tr('Fundal card Investiții'), INV_GROUPS, INV_ART, 'inv-bg-', invNow, openInvBgSheet),
        switchRow(tr('Culoarea aplicației după fundalul principal'), st.accentFromHero, v => set('accentFromHero', v),
          tr('Butoanele, graficele și evidențierile iau culoarea fundalului de pe Acasă.')),
        followsHero(st)
          ? h('div', { class: 'row stacked' }, h('div', { class: 'row-title' }, tr('Culoare principală')),
            h('div', { class: 'accent-follow' }, h('span', { class: 'accent-sw on', style: { background: HERO_ACCENT[st.heroStyle] } }),
              h('span', { class: 'muted' }, tr('Luată din fundalul cardului. Oprește bifa de mai sus ca s-o alegi tu.'))))
          : stackRow(tr('Culoare principală'), accentPicker(),
            st.accentFromHero ? tr('Fundalul ales folosește chiar culoarea principală, așa că o alegi aici.')
              : (st.accent || DEFAULT_ACCENT).toUpperCase() !== DEFAULT_ACCENT ? h('button', { type: 'button', class: 'link-btn small', onclick: () => { st.accent = DEFAULT_ACCENT; applyTheme(); commit(); } }, tr('Revino la mov')) : null)),
      sectionHead(tr('Afișare')),
      h('div', { class: 'list' },
        navRow(tr('Plăcile de pe Acasă'), chosenTileNames().join(' · '), openTileEditor),
        stackRow(tr('Densitate'), segmented([{ value: 'aerisit', label: tr('Aerisit') }, { value: 'compact', label: tr('Compact') }], st.density || 'aerisit', v => set('density', v)),
          tr('Compact: mai puțin spațiu între carduri, vezi mai multe pe ecran.')),
        stackRow(tr('Iconițele categoriilor'), iconStylePicker(st.iconStyle || 'emoji', v => set('iconStyle', v))),
        stackRow(tr('Bara de jos'), segmented([{ value: 'sticla', label: tr('Plutitoare') }, { value: 'plina', label: tr('Pe toată lățimea') }], st.navStyle || 'sticla', v => set('navStyle', v))),
        switchRow(tr('Text sub iconițele din bara de jos'), st.navLabels !== false, v => set('navLabels', v))),
      sectionHead(tr('Limbă și formate')),
      h('div', { class: 'list' },
        stackRow('Limbă / Language', segmented(LANG_OPTS, st.lang || 'ro', v => { st.lang = v; commit(); toast(tr('Limba a fost schimbată')); })),
        stackRow(tr('Format numere'), segmented(NUMBER_FORMATS, st.numberFormat || 'ro', v => { st.numberFormat = v; commit(); })),
        stackRow(tr('Format dată'), (() => { const sel = selectInput(DATE_FORMATS, st.dateFormat || 'dmy.'); sel.addEventListener('change', () => { st.dateFormat = sel.value; commit(); }); return sel; })()),
        switchRow(tr('Pornește aplicația în mod privat'), st.privateOnStart, v => { st.privateOnStart = v; commit(); }, tr('Sumele sunt ascunse la deschidere'))),
    ];
  }
  if (sub === 'bani') {
    return [h('div', { class: 'list' },
      stackRow(tr('Monedă implicită'), segmented(CUR_OPTS, st.currency, v => { st.currency = v; commit(); toast(tr('Monedă schimbată')); }), tr('Sumele existente nu se convertesc, se schimbă doar afișarea.')),
      navRow(tr('Curs de schimb'), tr('1 EUR = {eur} lei · 1 USD = {usd} lei', { eur: num(st.rates.EUR, 4), usd: num(st.rates.USD, 4) }), openRates),
      navRow(tr('Ziua salariului'), st.salaryDay ? tr('Pe {d} ale lunii · în weekend, vinerea dinainte', { d: st.salaryDay }) : tr('Nesetată · banii se împart până la final de lună'), openSalaryDay),
      navRow(tr('Solduri inițiale'), `${accountName('curent')} ${money(st.opening.curent)} · ${accountName('economii')} ${money(st.opening.economii)}`, openOpening),
      navRow(tr('Ținta fondului de urgență'), tr('{n} luni', { n: state.emergency.months }), openEfSettings))];
  }
  if (sub === 'module') {
    return [
      h('div', { class: 'list' }, MODULES.map(([k, name, desc]) =>
        switchRow(tr(name), modOn(k), v => { st.modules = { ...st.modules, [k]: v }; commit(); }, tr(desc)))),
      // Când Investițiile sunt ascunse, alegi ce pagină le ia locul în bara de jos.
      modOn('investitii') ? null : h('div', { class: 'list' }, stackRow(tr('În bara de jos, în locul Investițiilor'),
        h('div', { class: 'slot-grid' }, TAB_SLOTS.filter(x => !x[3] || modOn(x[3])).map(([id, label, ico]) => h('button', {
          type: 'button', class: 'slot' + (slotTab()[0] === id ? ' on' : ''), 'aria-pressed': String(slotTab()[0] === id),
          onclick: () => { st.tabSlot = id; commit(); toast(tr('În bara de jos: {name}', { name: tr(label) })); },
        }, icon(ico, 22), h('span', {}, tr(label))))))),
      h('p', { class: 'hint' }, tr('Ce ascunzi nu se șterge: datele rămân și reapar când activezi din nou modulul.')),
    ];
  }
  if (sub === 'date') {
    return [
      h('div', { class: 'list' },
        navRow(tr('Exportă în Excel'), tr('Toate datele sau o anumită perioadă'), openExportSheet),
        navRow(tr('Backup (export JSON)'), tr('Salvează o copie a tuturor datelor'), () => exportBackup().then(() => toast(tr('Backup creat')))),
        navRow(tr('Restaurare (import JSON)'), tr('Încarcă datele dintr-un backup'), restore),
        navRow(tr('Încarcă date demo'), tr('Ca să vezi cum arată aplicația'), demo)),
      h('div', { class: 'list' }, navRow(tr('Șterge toate datele'), tr('Cu confirmare dublă'), wipe, 'danger-text')),
      h('p', { class: 'hint center' }, tr('Datele sunt salvate doar pe acest dispozitiv. Fă din când în când un backup.')),
      h('p', { class: 'hint center' }, tr('Spațiu folosit: {size}', { size: sizeLabel(dataSize()) })),
    ];
  }
  return null;
}

export function settingsPage(sub) {
  if (sub) {
    const sec = SECTIONS.find(x => x[0] === sub);
    const content = sec && sectionContent(sub);
    if (!content) return null;
    return { title: tr(sec[1]), back: '#/setari', node: h('div', { class: 'page' }, ...content) };
  }
  const node = h('div', { class: 'page' },
    h('div', { class: 'list' },
      SECTIONS.map(([id, title, desc, ico]) => iconRow(ico, tr(title), tr(desc), () => go(`#/setari/${id}`))),
      iconRow('tag', tr('Categorii'), tr('{n} categorii', { n: state.categories.length }), () => go('#/categorii'))),
    h('p', { class: 'hint center' }, tr('Versiunea {v}', { v: APP_VERSION })));
  return { title: tr('Setări'), back: '#/acasa', node };
}
