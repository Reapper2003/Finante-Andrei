// Pagina Economii: fondul de urgență, fondurile de economii (în orice monedă) și goal-urile.

import { state, uid, commit, PALETTE } from '../store.js';
import { today } from '../dates.js';
import { money, num, parseAmount, forInput, CURRENCIES } from '../fmt.js';
import {
  round2, convert, accountBalance, bucketBalance, bucketCurrency, bucketName, allBuckets, savingsByCurrency, efStats,
} from '../calc.js';
import {
  h, icon, card, sectionHead, linkBtn, stat, btn, go, app, emptyState, openSheet, field, textInput, amountInput,
  segmented, invalid, toast, confirmDialog, emojiPicker, colorPicker,
} from '../ui.js';
import { donut } from '../charts.js';
import { listRow, exportButton, movesList } from '../components.js';
import { openGoalForm, openBucketMove, currencySeg } from '../forms.js';
import { deleteFund, convertBucketHistory } from '../actions.js';
import { goalCard } from './dashboard.js';
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

/* ---------- Pagini ---------- */

const curLabel = c => (c === 'RON' ? 'lei' : CURRENCIES[c]);

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

  const fundRow = (b, title, emoji, color, onTap) => {
    const cur = bucketCurrency(b), bal = bucketBalance(b);
    return listRow({
      iconEl: h('span', { class: 'cat-ic', style: { background: (color || '#C9CED6') + '55', fontSize: '19px' } }, emoji),
      title, sub: cur,
      right: money(bal, { cur }),
      rightSub: all && cur !== base ? h('span', { class: 'row-sub' }, `≈ ${money(convert(bal, cur, base))}`) : null,
      onTap, chevron: true,
    });
  };

  const node = h('div', { class: 'page' },
    currencies.length > 1
      ? segmented([{ value: 'all', label: tr('Toate') }, ...currencies.map(c => ({ value: c, label: curLabel(c) }))], curFilter, v => { curFilter = v; app.rerender(); })
      : null,
    h('section', { class: 'card summary' },
      h('span', { class: 'label' }, all && currencies.length > 1 ? tr('Total economii · convertit în {cur}', { cur: base }) : tr('Total economii')),
      h('strong', { class: 'big' }, money(total, { cur: totalCur })),
      all && currencies.length > 1
        ? h('div', { class: 'stats3' }, currencies.map(c => stat(tr('În {cur}', { cur: curLabel(c) }), money(byCur[c] || 0, { cur: c }))))
        : null),
    alloc.length ? card(h('h2', {}, tr('Împărțire')), donut({ items: alloc, title: tr('Total'), format: v => money(v, { cur: totalCur }), legendLimit: 5, size: 180 })) : null,

    show('urgenta') ? sectionHead(tr('Fond de urgență')) : null,
    show('urgenta') ? h('div', { class: 'list' }, listRow({
      iconEl: h('span', { class: 'cat-ic neutral' }, icon('shield', 20)),
      title: tr('Fond de urgență'), sub: tr('{n} luni din {m}', { n: num(ef.covered, 1), m: ef.months }),
      right: money(ef.balance), onTap: () => go('#/fond'), chevron: true,
    })) : null,

    sectionHead(tr('Fonduri de economii'), linkBtn(tr('Adaugă'), () => openFundForm())),
    h('div', { class: 'list' },
      show('') ? fundRow('', tr('Alte economii'), '🗂️', '#C9CED6', () => go('#/economii/f/alte')) : null,
      state.funds.filter(f => show('f:' + f.id)).map(f => fundRow('f:' + f.id, f.name, f.icon || '💰', f.color, () => go(`#/economii/f/${f.id}`)))),
    !state.funds.length ? h('p', { class: 'hint' }, tr('Creează un fond pentru bani puși deoparte într-o anumită monedă, de exemplu „Economii în euro”.')) : null,

    sectionHead(tr('Goal-uri'), linkBtn(tr('Adaugă'), () => openGoalForm())),
    goals.length ? null : card(emptyState(tr('Niciun goal în această monedă.'))),
    ...active.map(goalCard),
    done.length ? h('details', { class: 'done-goals' }, h('summary', {}, tr('Finalizate ({n})', { n: done.length })), h('div', { class: 'stack' }, done.map(goalCard))) : null,
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
