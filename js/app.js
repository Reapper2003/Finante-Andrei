// Pornirea aplicației: rutare, header, bara de jos, butonul +, pull-to-refresh, PWA.

import { state, load, save, subscribe, commit } from './store.js';
import { h, icon, app, toast, applyTheme, sheetOpen } from './ui.js';
import { runAutomations } from './actions.js';
import { openTxForm } from './forms.js';
import { t as tr } from './i18n.js';
import { dashboardPage } from './pages/dashboard.js';
import { transactionsPage } from './pages/transactions.js';
import { investmentsPage, brokerPage, assetPage } from './pages/investments.js';
import { reportsPage } from './pages/reports.js';
import { morePage } from './pages/more.js';
import { subscriptionsPage } from './pages/subscriptions.js';
import { networthPage } from './pages/networth.js';
import { emergencyPage } from './pages/emergency.js';
import { debtsPage, debtPage } from './pages/debts.js';
import { settingsPage } from './pages/settings.js';
import { categoriesPage } from './pages/categories.js';

const TABS = [
  ['acasa', 'Acasă', 'home'],
  ['tranzactii', 'Tranzacții', 'list'],
  ['investitii', 'Investiții', 'trend'],
  ['rapoarte', 'Rapoarte', 'report'],
  ['mai-mult', 'Mai mult', 'more'],
];

const ROUTES = [
  [/^acasa$/, dashboardPage, 'acasa'],
  [/^tranzactii$/, transactionsPage, 'tranzactii'],
  [/^investitii$/, investmentsPage, 'investitii'],
  [/^investitii\/b\/([\w-]+)$/, brokerPage, 'investitii'],
  [/^investitii\/a\/([\w-]+)$/, assetPage, 'investitii'],
  [/^rapoarte$/, reportsPage, 'rapoarte'],
  [/^mai-mult$/, morePage, 'mai-mult'],
  [/^abonamente$/, subscriptionsPage, 'mai-mult'],
  [/^avere$/, networthPage, 'mai-mult'],
  [/^fond$/, emergencyPage, 'mai-mult'],
  [/^datorii$/, debtsPage, 'mai-mult'],
  [/^datorii\/([\w-]+)$/, debtPage, 'mai-mult'],
  [/^setari$/, settingsPage, 'mai-mult'],
  [/^categorii$/, categoriesPage, 'mai-mult'],
];

const view = document.getElementById('view');
const titleEl = document.getElementById('title');
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
  const res = route && route[1](...match.slice(1));
  if (!res) { location.replace('#/acasa'); return; }

  titleEl.textContent = res.title;
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
  for (const a of tabsEl.children) {
    const on = a.dataset.tab === route[2];
    a.lastChild.textContent = tr(TABS.find(x => x[0] === a.dataset.tab)[1]);
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  view.replaceChildren(res.node);
  if (path !== lastPath) {
    window.scrollTo(0, 0);
    lastPath = path;
  }
}
app.rerender = render;

function buildNav() {
  tabsEl.replaceChildren(...TABS.map(([id, label, ico]) =>
    h('a', { href: `#/${id}`, 'data-tab': id }, icon(ico, 24), h('span', {}, label))));
  backEl.replaceChildren(icon('back'));
  fab.replaceChildren(icon('plus', 28));
}

function refresh() {
  load();
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

function start() {
  load();
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
  subscribe(ok => {
    if (!ok) toast(tr('Nu am putut salva datele (spațiu insuficient)'));
    render();
  });
  window.addEventListener('hashchange', render);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && runAutomations()) render();
  });
  setupPullToRefresh();
  render();

  // Service worker pentru funcționare offline (nu pe localhost, ca să vezi imediat modificările).
  const local = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw=1');
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !local) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

start();
