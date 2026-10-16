// Pagina Economii: fondul de urgență, fondurile de economii (în orice monedă) și goal-urile.

import { state, uid, commit, PALETTE } from '../store.js';
import { today } from '../dates.js';
import { money, num, parseAmount, forInput, CURRENCIES } from '../fmt.js';
import {
  round2, convert, accountBalance, bucketBalance, bucketCurrency, bucketName, allBuckets, savingsByCurrency, efStats, goalStats,
} from '../calc.js';
import {
  h, icon, card, sectionHead, linkBtn, stat, btn, go, app, emptyState, openSheet, field, textInput, amountInput,
  segmented, invalid, toast, confirmDialog, emojiPicker, colorPicker, swipeRow,
} from '../ui.js';
import { barBreakdown } from '../charts.js';
import { listRow, exportButton, movesList } from '../components.js';
import { openGoalForm, openBucketMove, currencySeg } from '../forms.js';
import { deleteFund, deleteGoal, convertBucketHistory, saveTx } from '../actions.js';
import { goalCard, bigMoney } from './dashboard.js';
import { t as tr } from '../i18n.js';

const FUND_EMOJIS = ['💰', '🏦', '💶', '💵', '🐷', '🔒', '🌍', '🏠', '🚗', '🎓', '🧳', '📦'];
let curFilter = 'all';

/* ---------- Formular fond ---------- */

export function openFundForm(existing) {
  const f = existing ? { ...existing } : { icon: '💰', color: PALETTE[(state.funds.length + 5) % PALETTE.length], currency: state.settings.currency };
  const oldCur = f.currency || state.settings.currency;
  let cur = oldCur;
  const name = textInput(f.name, { placeholder: tr('ex. Economii în euro'), maxlength: 40 });
  const initial = amountInput(f.initial || '');
  const note = textInput(f.note, { placeholder: tr('Opțional'), maxlength: 140 });
  const curSeg = currencySeg(cur, v => {
    const n = parseAmount(initial.value);
    if (n > 0) initial.value = forInput(round2(convert(n, cur, v)));
    cur = v;
  });
  const sh = openSheet({
    title: existing ? tr('Editează fondul') : tr('Fond de economii nou'),
    body: h('div', {},
      field(tr('Nume'), name),
      field(tr('Monedă'), curSeg, existing ? tr('La schimbarea monedei, sumele se convertesc cu cursul din Setări.') : null),
      field(existing ? tr('Sold de pornire') : tr('Sumă pe care o ai deja'), initial),
      field(tr('Notă'), note),
      field(tr('Iconiță'), emojiPicker(FUND_EMOJIS, f.icon, v => { f.icon = v; })),
      field(tr('Culoare'), colorPicker(PALETTE, f.color, v => { f.color = v; }))),
    footer: btn(existing ? tr('Salvează') : tr('Creează fondul'), () => {
      if (!name.value.trim()) return invalid(name, tr('Scrie un nume'));
      const init = initial.value.trim() ? parseAmount(initial.value) : 0;
      if (!(init >= 0)) return invalid(initial, tr('Suma trebuie să fie pozitivă'));
      const out = { ...f, name: name.value.trim(), currency: cur, initial: round2(init), note: note.value.trim() };
      if (existing) {
        convertBucketHistory('f:' + f.id, oldCur, cur);
        Object.assign(state.funds.find(x => x.id === f.id), out);
      } else state.funds.push({ ...out, id: uid(), createdAt: today() });
      commit();
      sh.close();
      toast(existing ? tr('Fond actualizat') : tr('Fond creat'));
    }),
  });
  if (!existing) name.focus({ preventScroll: true });
}

/* ---------- Ștergere prin glisare (fondul de urgență nu se poate șterge) ---------- */

const ZERO = v => Math.abs(v) < 0.005;

function removeFund(f) {
  const b = 'f:' + f.id, cur = bucketCurrency(b), bal = bucketBalance(b);
  const run = () => { deleteFund(f.id); toast(tr('Fond șters')); };
  if (ZERO(bal)) return run();
  confirmDialog({ title: tr('Ștergi {name}?', { name: f.name }), message: tr('Banii ({sum}) trec la „Alte economii”.', { sum: money(bal, { cur }) }) })
    .then(ok => { if (ok) run(); });
}

function removeGoal(g) {
  const st = goalStats(g);
  const run = () => { deleteGoal(g.id); toast(tr('Goal șters')); };
  if (ZERO(st.saved)) return run();
  confirmDialog({ title: tr('Ștergi goal-ul?'), message: tr('Banii strânși ({sum}) rămân în Economii, la „Alte economii”.', { sum: money(st.saved, { cur: st.cur }) }) })
    .then(ok => { if (ok) run(); });
}

// „Alte economii” dispare din listă; dacă are bani, aceștia se mută înapoi în Curent.
// Reapare singur când ajung din nou bani acolo (ex. la ștergerea unui fond).
function removeOther() {
  const bal = bucketBalance('');
  const run = () => { state.settings.hideOtherSavings = true; commit(); toast(tr('„Alte economii” a fost șters')); };
  if (ZERO(bal)) return run();
  confirmDialog({ title: tr('Ștergi „Alte economii”?'), message: tr('Banii ({sum}) se mută înapoi în contul Curent.', { sum: money(bal) }) })
    .then(ok => {
      if (!ok) return;
      saveTx({ type: 'transfer', amount: round2(bal), date: today(), note: tr('Închidere „Alte economii”'), accountId: 'economii', fromBucket: '', toAccountId: 'curent' });
      run();
    });
}

/* ---------- Pagini ---------- */

const curLabel = c => (c === 'RON' ? 'lei' : CURRENCIES[c]);
const FLAGS = { RON: '🇷🇴', EUR: '🇪🇺', USD: '🇺🇸' };

export function savingsPage() {
  const base = state.settings.currency;
  const byCur = savingsByCurrency();
  const currencies = Object.keys(CURRENCIES).filter(c =>
    c === base || byCur[c] || state.funds.some(f => f.currency === c) || state.goals.some(g => g.currency === c));
  if (curFilter !== 'all' && !currencies.includes(curFilter)) curFilter = 'all';
  const all = curFilter === 'all';
  const show = b => all || bucketCurrency(b) === curFilter;
  const totalCur = all ? base : curFilter;
  const total = all ? accountBalance('economii') : byCur[curFilter] || 0;

  // În „Toate”, sumele în altă monedă sunt convertite în moneda implicită.
  const valueOf = b => (all ? convert(bucketBalance(b), bucketCurrency(b), base) : bucketBalance(b));
  const colorOf = b => b === 'urgenta' ? '#4FD1DC' : b === '' ? '#C9CED6'
    : (b.startsWith('f:') ? state.funds.find(f => 'f:' + f.id === b) : state.goals.find(g => 'g:' + g.id === b))?.color;
  const alloc = allBuckets().filter(show).map(b => ({ id: b, label: bucketName(b), value: round2(valueOf(b)), color: colorOf(b) })).filter(i => i.value > 0);

  const ef = efStats();
  const goals = state.goals.filter(g => show('g:' + g.id));
  const active = goals.filter(g => !g.done), done = goals.filter(g => g.done);

  const fundRow = (b, title, emoji, color, onTap, onDelete) => {
    const cur = bucketCurrency(b), bal = bucketBalance(b);
    return swipeRow(listRow({
      iconEl: h('span', { class: 'cat-ic', style: { background: (color || '#C9CED6') + '55', fontSize: '19px' } }, emoji),
      title, sub: cur,
      right: money(bal, { cur }),
      rightSub: all && cur !== base ? h('span', { class: 'row-sub' }, `≈ ${money(convert(bal, cur, base))}`) : null,
      chevron: true,
    }), { onTap, onDelete, trash: true });
  };
  const otherBal = bucketBalance('');
  const showOther = show('') && (!state.settings.hideOtherSavings || !ZERO(otherBal));

  const node = h('div', { class: 'page' },
    h('div', { class: 'total-center' },
      h('small', {}, !all ? tr('Total economii în {cur}', { cur: curLabel(curFilter) })
        : currencies.length > 1 ? tr('Total economii · convertit în {cur}', { cur: base }) : tr('Total economii')),
      bigMoney(total, { cur: totalCur })),
    // Tap pe o monedă: arată doar economiile în ea. Tap din nou: înapoi la toate.
    currencies.length > 1
      ? h('div', { class: 'curchips' }, currencies.map(c => h('button', {
        type: 'button', class: curFilter === c ? 'on' : '', 'aria-pressed': String(curFilter === c),
        onclick: () => { curFilter = curFilter === c ? 'all' : c; app.rerender(); },
      }, `${FLAGS[c] || ''} ${money(byCur[c] || 0, { cur: c })}`)))
      : null,
    alloc.length ? card(barBreakdown({ items: alloc, format: v => money(v, { cur: totalCur }), legendOnly: true })) : null,

    sectionHead(tr('Fonduri de economii'), linkBtn(tr('Adaugă'), () => openFundForm())),
    h('div', { class: 'list' },
      show('urgenta') ? listRow({
        iconEl: h('span', { class: 'cat-ic', style: { background: '#4FD1DC40', fontSize: '19px' } }, '🛡️'),
        title: tr('Fond de urgență'), sub: tr('{n} luni din {m}', { n: num(ef.covered, 1), m: ef.months }),
        right: money(ef.balance), onTap: () => go('#/fond'), chevron: true,
      }) : null,
      showOther ? fundRow('', tr('Alte economii'), '🗂️', '#C9CED6', () => go('#/economii/f/alte'), otherBal >= 0 ? removeOther : null) : null,
      state.funds.filter(f => show('f:' + f.id)).map(f => fundRow('f:' + f.id, f.name, f.icon || '💰', f.color, () => go(`#/economii/f/${f.id}`), () => removeFund(f)))),
    !state.funds.length ? h('p', { class: 'hint' }, tr('Creează un fond pentru bani puși deoparte într-o anumită monedă, de exemplu „Economii în euro”.')) : null,

    sectionHead(tr('Goal-uri'), linkBtn(tr('Adaugă'), () => openGoalForm())),
    goals.length ? null : card(emptyState(tr('Niciun goal în această monedă.'))),
    ...active.map(g => goalCard(g, removeGoal)),
    done.length ? h('details', { class: 'done-goals' }, h('summary', {}, tr('Finalizate ({n})', { n: done.length })), h('div', { class: 'stack' }, done.map(g => goalCard(g, removeGoal)))) : null,
    h('p', { class: 'hint center' }, tr('Glisează spre stânga pe un fond sau goal ca să-l ștergi.')),
    exportButton());
  return { title: tr('Economii'), node };
}

export function fundPage(id) {
  const isOther = id === 'alte';
  const f = isOther ? null : state.funds.find(x => x.id === id);
  if (!isOther && !f) return null;
  const b = isOther ? '' : 'f:' + id;
  const base = state.settings.currency, cur = bucketCurrency(b), bal = bucketBalance(b);
  const node = h('div', { class: 'page' },
    h('section', { class: 'card summary' },
      h('span', { class: 'label' }, `${tr('Sold')} · ${cur}`),
      h('strong', { class: 'big' }, money(bal, { cur })),
      cur !== base ? h('span', { class: 'muted' }, `≈ ${money(convert(bal, cur, base))} · ${tr('cu cursul din Setări')}`) : null,
      f?.note ? h('p', { class: 'muted' }, f.note) : null),
    h('div', { class: 'btn-row' },
      bal > 0 ? btn(tr('Retrage'), () => openBucketMove({ bucket: b, dir: 'out' }), 'secondary') : null,
      btn(tr('Adaugă bani'), () => openBucketMove({ bucket: b, dir: 'in' }))),
    sectionHead(tr('Istoric mișcări')),
    movesList(b),
    isOther
      ? h('p', { class: 'hint' }, tr('„Alte economii” e locul implicit pentru banii din contul Economii care nu sunt într-un fond sau goal.'))
      : h('div', { class: 'btn-row' },
        btn(tr('Editează fondul'), () => openFundForm(f), 'secondary'),
        btn(tr('Șterge'), () => confirmDialog({
          title: tr('Ștergi {name}?', { name: f.name }),
          message: bal > 0 ? tr('Banii ({sum}) trec la „Alte economii”.', { sum: money(bal, { cur }) }) : tr('Acțiunea nu poate fi anulată.'),
        }).then(ok => { if (ok) { deleteFund(id); toast(tr('Fond șters')); go('#/economii'); } }), 'ghost danger-text')));
  return { title: isOther ? tr('Alte economii') : f.name, back: '#/economii', node };
}
