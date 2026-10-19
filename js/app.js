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
import { wishlistPage } from './pages/wishlist.js';
import { startPage, needsOnboarding } from './pages/start.js';

// Bara de jos: două tab-uri, butonul + la mijloc, alte două tab-uri. „Mai mult” e butonul rotund din header.
// Dacă Investițiile sunt ascunse (Setări → Module), în locul lor apare pagina aleasă acolo (implicit Rapoarte).
const tabs = () => [
  ['acasa', 'Acasă', 'home'],
  ['tranzactii', 'Tranzacții', 'list'],
  ['economii', 'Economii', 'wallet'],
  modOn('investitii') ? ['investitii', 'Investiții', 'trend'] : slotTab().slice(0, 3),
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
  [/^dorinte$/, wishlistPage, 'dorinte', 'dorinte'],
  [/^start$/, startPage, 'start'],
];

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
  document.title = `${res.title} · ${tr('Finanțe')}`;
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
  for (const a of tabsEl.querySelectorAll('a[data-tab]')) {
    const on = a.dataset.tab === tabKey;
    a.lastChild.textContent = tr(TABS.find(x => x[0] === a.dataset.tab)[1]);
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  view.replaceChildren(res.node);
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
  document.documentElement.style.setProperty('--top-h', `${top.offsetHeight}px`);
  const hero = document.querySelector('.bleed-hero');
  const fg = hero && getComputedStyle(hero).getPropertyValue('--on-hero').trim();
  top.style.setProperty('--top-fg', fg || '#fff');
  const tint = hero && getComputedStyle(hero).getPropertyValue('--tint').trim();
  if (tint) document.body.style.setProperty('--bleed-tint', tint); else document.body.style.removeProperty('--bleed-tint');
  onBleedScroll();
}
function onBleedScroll() {
  if (!document.body.classList.contains('bleed')) return;
  const hero = document.querySelector('.bleed-hero');
  const top = document.querySelector('.top');
  document.body.classList.toggle('scrolled', !hero || hero.getBoundingClientRect().bottom < top.offsetHeight + 8);
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
