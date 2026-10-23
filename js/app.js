// Pornirea aplicației: rutare, header, bara de jos, butonul +, pull-to-refresh, PWA.

import { state, load, save, subscribe, onSaveError, commit, APP_VERSION, modOn, slotTab } from './store.js';
import { h, icon, app, toast, applyTheme, sheetOpen } from './ui.js';
import { runAutomations } from './actions.js';
import { openTxForm } from './forms.js';
import { openMainMenu } from './menu.js';
import { t as tr } from './i18n.js';
import { dashboardPage } from './pages/dashboard.js';
import { transactionsPage } from './pages/transactions.js';
import { investmentsPage, brokerPage, assetPage } from './pages/investments.js';
import { reportsPage } from './pages/reports.js';
import { subscriptionsPage } from './pages/subscriptions.js';
import { networthPage } from './pages/networth.js';
import { emergencyPage } from './pages/emergency.js';
import { savingsPage, fundPage } from './pages/savings.js';
import { debtsPage, debtPage } from './pages/debts.js';
import { settingsPage } from './pages/settings.js';
import { categoriesPage } from './pages/categories.js';
import { calculatorPage } from './pages/calculator.js';
import { planPage } from './pages/plan.js';
import { wishlistPage } from './pages/wishlist.js';
import { startPage, needsOnboarding } from './pages/start.js';

// Bara de jos: două tab-uri, butonul + la mijloc, alte două tab-uri. „Mai mult” e butonul rotund din header.
// Al patrulea tab e cel ales în Setări → Module (implicit Investiții; Rapoarte dacă Investițiile sunt ascunse).
const tabs = () => [
  ['acasa', 'Acasă', 'home'],
  ['tranzactii', 'Tranzacții', 'list'],
  ['economii', 'Economii', 'wallet'],
  slotTab().slice(0, 3),
];

const ROUTES = [
  [/^acasa$/, dashboardPage, 'acasa'],
  [/^tranzactii$/, transactionsPage, 'tranzactii'],
  [/^economii$/, savingsPage, 'economii'],
  [/^economii\/f\/([\w-]+)$/, fundPage, 'economii'],
  [/^investitii$/, investmentsPage, 'investitii', 'investitii'],
  [/^investitii\/b\/([\w-]+)$/, brokerPage, 'investitii', 'investitii'],
  [/^investitii\/a\/([\w-]+)$/, assetPage, 'investitii', 'investitii'],
  [/^rapoarte$/, reportsPage, 'rapoarte'],
  [/^abonamente$/, subscriptionsPage, 'abonamente', 'abonamente'],
  [/^avere$/, networthPage, 'avere', 'avere'],
  [/^fond$/, emergencyPage, 'fond', null, 'economii'],
  [/^datorii$/, debtsPage, 'datorii', 'datorii'],
  [/^datorii\/([\w-]+)$/, debtPage, 'datorii', 'datorii'],
  [/^setari(?:\/(\w+))?$/, settingsPage, 'mai-mult'],
  [/^categorii$/, categoriesPage, 'mai-mult'],
  [/^calculator$/, calculatorPage, 'calculator'],
  [/^plan$/, planPage, 'plan'],
  [/^dorinte$/, wishlistPage, 'dorinte', 'dorinte'],
  [/^start$/, startPage, 'start'],
];

// Pe ecran lat (laptop, browser): bară laterală cu toate paginile, Setări și „+ Tranzacție nouă”;
// bara de jos se ascunde (vezi style.css, @media min-width 1024px).
const side = h('aside', { class: 'side' });
document.body.prepend(side);
function renderSide(route) {
  const items = [
    ['acasa', 'Acasă', 'home'], ['tranzactii', 'Tranzacții', 'list'], ['economii', 'Economii', 'wallet'],
    modOn('investitii') && ['investitii', 'Investiții', 'trend'], ['plan', 'Calculator bani', 'calc'], ['rapoarte', 'Rapoarte', 'report'],
    modOn('abonamente') && ['abonamente', 'Abonamente', 'repeat'], modOn('datorii') && ['datorii', 'Datorii', 'card'],
    modOn('avere') && ['avere', 'Avere netă', 'scale'], modOn('dorinte') && ['dorinte', 'Listă de dorințe', 'gift'],
  ].filter(Boolean);
  const cur = route[2] === 'mai-mult' ? 'setari' : items.some(x => x[0] === route[2]) ? route[2] : route[4] || route[2];
  const link = ([id, label, ico]) => h('a', { href: `#/${id}`, class: 'side-item' + (id === cur ? ' on' : ''), 'aria-current': id === cur ? 'page' : null },
    icon(ico, 20), h('span', {}, tr(label)));
  side.setAttribute('aria-label', tr('Navigare principală'));
  side.replaceChildren(
    h('a', { href: '#/acasa', class: 'side-brand' }, h('img', { src: 'icons/icon-192.png', alt: '' }), h('span', {}, 'Swinance')),
    h('nav', { class: 'side-nav' }, items.map(link)),
    h('div', { class: 'side-grow' }),
    link(['setari', 'Setări', 'settings']),
    h('button', { type: 'button', class: 'side-add', onclick: () => openTxForm() }, icon('plus', 18), h('span', {}, tr('Tranzacție nouă'))));
}

// Pe ecran lat, paginile își păstrează ordinea de pe telefon (de sus în jos), dar folosesc lățimea:
// cardurile de rezumat de sus stau pe un rând, cardurile de obiective se așază în grilă, paginile doar din carduri
// (Rapoarte, Avere netă) pe două coloane, iar Setările centrat. Acasă și Calculatorul au aranjarea lor (style.css).
// Pe telefon nu se schimbă nimic.
const wide = matchMedia('(min-width: 1024px)');
wide.addEventListener?.('change', () => render());
function desktopize(page) {
  if (!page.classList?.contains('page') || page.classList.contains('home-tablou') || page.classList.contains('plan')) return;
  const kids = [...page.children];
  const wrap = (cls, items) => { const d = h('div', { class: cls }); items[0].before(d); d.append(...items); return d; };
  const hasHead = kids.some(e => e.classList.contains('sec-head'));
  const cards = kids.filter(e => e.matches('section.card, .list'));
  // pagini doar din carduri: pe două coloane
  if (!hasHead && cards.length >= 3 && !kids.some(e => e.classList.contains('stack'))) { page.classList.add('d-flow'); return; }
  // formular + rezultate (Calculator investiții): unul lângă altul
  const res = kids.findIndex(e => e.classList.contains('stack'));
  if (!hasHead && res > 0 && !page.querySelector(':scope > .view-seg')) { wrap('d-pair', kids); return; }
  // pagini scurte (lista din Setări): centrate
  if (!hasHead && cards.length <= 1 && !page.querySelector(':scope > .view-seg')) { page.classList.add('d-narrow'); return; }
  // carduri de rezumat consecutive (ex. două carduri sumar) → pe un rând
  let run = [];
  const flush = () => { if (run.length >= 2) wrap('d-row', run); run = []; };
  for (const e of kids) { if (e.matches('section.card.summary')) run.push(e); else flush(); }
  flush();
  // Investiții: cardul cu grafic și cifrele (Total depus / Câștig / Randament) unul lângă altul
  const inv = page.querySelector(':scope > .inv-hero');
  if (inv && inv.nextElementSibling?.classList.contains('pill-strip')) wrap('d-inv', [inv, inv.nextElementSibling]);
  // obiectivele (carduri care se glisează) → grilă
  run = [];
  for (const e of [...page.children]) { if (e.classList.contains('goal-swipe')) run.push(e); else { if (run.length) wrap('d-goals-grid', run); run = []; } }
  if (run.length) wrap('d-goals-grid', run);
}

const view = document.getElementById('view');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const moreEl = document.getElementById('more');
const backEl = document.getElementById('back');
const eyeEl = document.getElementById('eye');
const tabsEl = document.getElementById('tabs');
const fab = document.getElementById('fab');
let lastPath = null;

function render() {
  const path = location.hash.replace(/^#\/?/, '') || 'acasa';
  let route = null, match = null;
  for (const r of ROUTES) {
    match = path.match(r[0]);
    if (match) { route = r; break; }
  }
  if (route && route[3] && !modOn(route[3])) route = null;
  const res = route && route[1](...match.slice(1));
  if (!res) { location.replace('#/acasa'); return; }
  const TABS = tabs();
  document.body.classList.toggle('onboarding', route[2] === 'start');

  titleEl.textContent = res.title;
  subtitleEl.hidden = !res.subtitle;
  subtitleEl.textContent = res.subtitle || '';
  const inBar = id => TABS.some(t => t[0] === id);
  const tabKey = inBar(route[2]) ? route[2] : inBar(route[4]) ? route[4] : null;
  moreEl.classList.toggle('on', route[2] !== 'start' && !tabKey);
  moreEl.setAttribute('aria-label', tr('Meniu'));
  document.title = `${res.title} · Swinance`;
  document.documentElement.lang = state.settings.lang === 'en' ? 'en' : 'ro';
  backEl.hidden = !res.back;
  if (res.back) backEl.href = res.back;
  const priv = state.settings.privateMode;
  eyeEl.replaceChildren(icon(priv ? 'eyeOff' : 'eye'));
  eyeEl.setAttribute('aria-pressed', String(priv));
  eyeEl.setAttribute('aria-label', priv ? tr('Arată sumele') : tr('Ascunde sumele (mod privat)'));
  backEl.setAttribute('aria-label', tr('Înapoi'));
  fab.setAttribute('aria-label', tr('Adaugă tranzacție'));
  tabsEl.setAttribute('aria-label', tr('Navigare principală'));
  if (tabsEl.dataset.key !== TABS.map(t => t[0]).join()) buildTabs(TABS);
  renderSide(route);
  for (const a of tabsEl.querySelectorAll('a[data-tab]')) {
    const on = a.dataset.tab === tabKey;
    a.lastChild.textContent = tr(TABS.find(x => x[0] === a.dataset.tab)[1]);
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  view.replaceChildren(res.node);
  if (wide.matches) desktopize(res.node);
  if (path !== lastPath) {
    window.scrollTo(0, 0);
    lastPath = path;
  }
  syncBleed(!!res.bleed);
}

// Pagini cu cardul mare pe toată lățimea (Acasă, Investiții): antetul stă transparent peste card
// și capătă fundal abia când cardul iese din ecran la derulare.
function syncBleed(on) {
  document.body.classList.toggle('bleed', on);
  const top = document.querySelector('.top');
  if (!on) { top.style.removeProperty('--top-fg'); document.body.classList.remove('scrolled'); return; }
  // Poziția cardului și înălțimea antetului sunt calculate în CSS (--top-h = zona orei + 72px), deci nu depind de
  // momentul în care iPhone-ul raportează zona orei la pornire.
  const hero = document.querySelector('.bleed-hero');
  const fg = hero && getComputedStyle(hero).getPropertyValue('--on-hero').trim();
  top.style.setProperty('--top-fg', fg || '#fff');
  const tint = hero && getComputedStyle(hero).getPropertyValue('--tint').trim();
  if (tint) document.body.style.setProperty('--bleed-tint', tint); else document.body.style.removeProperty('--bleed-tint');
  onBleedScroll();
}
// „Ai derulat dincolo de card?” se decide după cât ai derulat efectiv: la deschidere ești sus, deci sub oră e cardul.
function onBleedScroll() {
  if (!document.body.classList.contains('bleed')) return;
  const hero = document.querySelector('.bleed-hero');
  const top = document.querySelector('.top');
  const limit = hero ? Math.max(60, hero.offsetHeight - top.offsetHeight - 8) : 60;
  document.body.classList.toggle('scrolled', window.scrollY > limit);
}
app.rerender = render;

function buildTabs(TABS) {
  const tab = ([id, label, ico]) => h('a', { href: `#/${id}`, 'data-tab': id }, icon(ico, 24), h('span', {}, label));
  tabsEl.replaceChildren(...TABS.slice(0, 2).map(tab), fab, ...TABS.slice(2).map(tab));
  tabsEl.dataset.key = TABS.map(t => t[0]).join();
}

function buildNav() {
  moreEl.replaceChildren(icon('more'));
  moreEl.addEventListener('click', openMainMenu);
  backEl.replaceChildren(icon('back'));
  fab.replaceChildren(icon('plus', 28));
}

async function refresh() {
  await load();
  runAutomations();
  applyTheme();
  render();
  toast(tr('Actualizat'));
}

// Pull-to-refresh: trage în jos când ești sus de tot.
function setupPullToRefresh() {
  const ptr = document.getElementById('ptr');
  ptr.replaceChildren(icon('refresh', 20));
  const THRESHOLD = 110;
  let y0 = null, dist = 0;
  window.addEventListener('touchstart', e => {
    y0 = !sheetOpen() && window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
    dist = 0;
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (y0 == null) return;
    dist = e.touches[0].clientY - y0;
    if (dist > 10 && window.scrollY <= 0) {
      const d = Math.min(dist * 0.5, 80);
      ptr.classList.add('show');
      ptr.classList.toggle('ready', dist > THRESHOLD);
      ptr.style.transform = `translate(-50%, ${d}px) rotate(${dist * 1.5}deg)`;
    }
  }, { passive: true });
  const end = () => {
    if (y0 == null) return;
    const go = dist > THRESHOLD && window.scrollY <= 0;
    ptr.classList.remove('show', 'ready');
    ptr.style.transform = '';
    y0 = null;
    if (go) refresh();
  };
  window.addEventListener('touchend', end);
  window.addEventListener('touchcancel', end);
}

async function start() {
  // La revenirea în aplicație sau după încărcarea completă, starea antetului se recalculează
  for (const ev of ['load', 'pageshow', 'resize']) addEventListener(ev, onBleedScroll);
  document.addEventListener('visibilitychange', onBleedScroll);
  await load();
  if (state.settings.privateOnStart) state.settings.privateMode = true;
  runAutomations();
  save();
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

  buildNav();
  eyeEl.addEventListener('click', () => {
    state.settings.privateMode = !state.settings.privateMode;
    commit();
    toast(state.settings.privateMode ? tr('Mod privat activat') : tr('Sume vizibile'));
  });
  fab.addEventListener('click', () => openTxForm());
  subscribe(render);
  onSaveError(() => toast(tr('Nu am putut salva datele (spațiu insuficient)')));
  // Cere telefonului să nu șteargă datele aplicației când rămâne fără spațiu.
  navigator.storage?.persist?.().catch(() => {});
  window.addEventListener('hashchange', render);
  window.addEventListener('scroll', onBleedScroll, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && runAutomations()) render();
  });
  setupPullToRefresh();
  // Prima pornire, fără date: configurarea în 3 pași.
  if (needsOnboarding()) location.replace('#/start');
  render();

  // După o actualizare automată, confirmă versiunea nouă.
  try {
    if (sessionStorage.getItem(UPDATED_KEY)) {
      sessionStorage.removeItem(UPDATED_KEY);
      toast(tr('Aplicația a fost actualizată · versiunea {v}', { v: APP_VERSION }));
    }
  } catch { /* ignorat */ }

  // Service worker pentru funcționare offline (nu pe localhost, ca să vezi imediat modificările).
  const local = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw=1');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !local) setupUpdates();
}

// Pe iPhone aplicația de obicei doar revine din fundal, fără să se redeschidă, deci nu ar căuta singură
// o versiune nouă. Verificăm la fiecare revenire; când versiunea nouă e gata, pagina se reîncarcă
// (după ce închizi panoul deschis, ca să nu pierzi ce scrii).
const UPDATED_KEY = 'finante.updated';
function setupUpdates() {
  const sw = navigator.serviceWorker;
  // La prima instalare nu reîncărcăm; la orice versiune care vine după, da.
  let hadController = !!sw.controller;
  let reloading = false;
  const reloadWhenIdle = () => {
    if (reloading) return;
    if (sheetOpen()) { setTimeout(reloadWhenIdle, 1500); return; }
    reloading = true;
    try { sessionStorage.setItem(UPDATED_KEY, '1'); } catch { /* ignorat */ }
    location.reload();
  };
  sw.addEventListener('controllerchange', () => {
    if (hadController) reloadWhenIdle();
    hadController = true;
  });
  sw.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch(() => {});
}

start();
