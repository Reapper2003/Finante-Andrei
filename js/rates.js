// Cursul de schimb automat (opțional, din Setări → Bani și conturi → Curs de schimb).
// Sursa: cursul de referință al Băncii Centrale Europene (prin serviciul gratuit Frankfurter), apropiat de cel BNR.
// BNR nu permite citirea cursului direct dintr-o aplicație web. Orice problemă (fără internet, sursă căzută,
// valori ciudate) lasă cursul neschimbat: aplicația merge mai departe cu ultimul curs salvat.

import { state, commit, save } from './store.js';
import { today } from './dates.js';

const URL_ECB = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=RON,USD';
const round4 = v => Math.round(v * 10000) / 10000;

// Un curs e plauzibil dacă e între 2 și 10 lei și (la actualizarea automată) nu sare cu mai mult de 15% față de cel de acum.
const sane = (v, prev) => Number.isFinite(v) && v > 2 && v < 10 && (!(prev > 0) || Math.abs(v / prev - 1) < 0.15);

// Verifică la fiecare intrare în aplicație, dar cel mult o dată pe oră (cursul BCE se schimbă o dată pe zi, pe la 17:00;
// așa, dacă dimineața ai primit cursul de ieri, seara îl primești pe cel nou).
const EVERY = 60 * 60 * 1000;

// force: din butonul „Actualizează acum” (altfel doar dacă opțiunea e pornită și a trecut o oră de la ultima verificare).
// Întoarce { ok, EUR, USD, date } sau { ok: false }; nu aruncă niciodată erori.
export async function refreshRates({ force = false } = {}) {
  const st = state.settings;
  if (!force && (!st.autoRates || Date.now() - (st.ratesCheckedAt || 0) < EVERY)) return { ok: false };
  if (navigator.onLine === false) return { ok: false };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(URL_ECB, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) return { ok: false };
    const j = await res.json();
    const eur = round4(j?.rates?.RON), usd = round4(j?.rates?.RON / j?.rates?.USD);
    // la apăsarea butonului nu comparăm cu cursul vechi (poate fusese scris greșit de mână)
    if (!sane(eur, force ? null : st.rates.EUR) || !sane(usd, force ? null : st.rates.USD)) return { ok: false };
    const changed = eur !== st.rates.EUR || usd !== st.rates.USD;
    st.rates = { ...st.rates, EUR: eur, USD: usd };
    st.ratesCheckedAt = Date.now();
    st.ratesDate = typeof j.date === 'string' ? j.date : today();
    // dacă e același curs, salvăm doar ora verificării, fără să redesenăm pagina
    if (changed || force) commit(); else save();
    return { ok: true, EUR: eur, USD: usd, date: st.ratesDate };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
