// Listă de dorințe și idei de cadouri. Doar o listă pentru tine: nu atinge banii din aplicație.

import { state, uid, commit } from '../store.js';
import { today } from '../dates.js';
import { money, parseAmount } from '../fmt.js';
import { round2, convert } from '../calc.js';
import {
  h, icon, card, sectionHead, linkBtn, btn, app, emptyState, openSheet, field, textInput, amountInput, segmented,
  switchRow, invalid, toast, confirmDialog, emojiPicker, swipeRow, onceHint
} from '../ui.js';
import { currencySeg, openGoalForm } from '../forms.js';
import { t as tr } from '../i18n.js';

const EMOJIS = ['🎁', '📱', '💻', '🎧', '👟', '👕', '⌚', '📚', '🎮', '🏠', '✈️', '💄', '🧸', '🍳', '🚲', '💍'];
let kindFilter = '';

// Acceptă și „www.site.ro” sau „site.ro/produs”; doar linkuri http / https.
function normalizeLink(v) {
  const s = v.trim();
  if (!s) return '';
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : 'https://' + s;
  try {
    const u = new URL(withScheme);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.') ? u.href : null;
  } catch { return null; }
}
const hostOf = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

function openWishForm(existing) {
  const w = existing ? { ...existing } : { kind: kindFilter || 'dorinta', icon: '🎁', currency: state.settings.currency };
  let kind = w.kind, cur = w.currency || state.settings.currency;
  const name = textInput(w.name, { placeholder: tr('ex. Căști wireless'), maxlength: 60 });
  const forWho = textInput(w.forWho, { placeholder: tr('ex. Mama'), maxlength: 40 });
  const forField = field(tr('Pentru cine'), forWho);
  forField.hidden = kind !== 'cadou';
  const kindSeg = segmented([{ value: 'dorinta', label: tr('Pentru mine') }, { value: 'cadou', label: tr('Cadou') }], kind, v => { kind = v; forField.hidden = v !== 'cadou'; });
  const price = amountInput(w.price ?? '');
  const curSeg = currencySeg(cur, v => { cur = v; });
  const link = h('input', { type: 'url', inputmode: 'url', autocomplete: 'off', autocapitalize: 'off', spellcheck: false, placeholder: 'https://…', value: w.link || '' });
  const note = h('textarea', { class: 'goal-notes', rows: 3, maxlength: 1000, placeholder: tr('Mărime, culoare, magazin, idei…') });
  note.value = w.note || '';

  const sh = openSheet({
    title: existing ? tr('Editează') : tr('Adaugă în listă'),
    body: h('div', {},
      field(tr('Ce anume?'), name),
      field(tr('Tip'), kindSeg),
      forField,
      field(tr('Cât costă (opțional)'), price),
      field(tr('Monedă'), curSeg),
      field(tr('Link către produs (opțional)'), link),
      field(tr('Notițe'), note),
      field(tr('Iconiță'), emojiPicker(EMOJIS, w.icon, v => { w.icon = v; })),
      existing ? switchRow(kind === 'cadou' ? tr('Cadoul e luat') : tr('Am luat-o'), w.done, v => { w.done = v; }) : null,
      // o dorință cu preț devine obiectiv: se completează numele, suma și moneda, iar dorința se mută din listă
      existing && !existing.done && existing.price > 0 ? btn(`🎯 ${tr('Începe să strângi')}`, () => {
        sh.close();
        openGoalForm(null, { name: existing.name, target: existing.price, currency: existing.currency || state.settings.currency, icon: existing.icon || '🎯' },
          () => { state.wishes = state.wishes.filter(x => x.id !== existing.id); });
      }, 'secondary') : null,
      existing && !existing.done && existing.price > 0 ? h('p', { class: 'hint' }, tr('Devine obiectiv la Economii și dispare din listă.')) : null),
    footer: h('div', { class: 'btn-row' },
      existing ? btn(tr('Șterge'), () => confirmDialog({ title: tr('Ștergi {name}?', { name: existing.name }) }).then(ok => {
        if (!ok) return;
        removeWish(existing);
        sh.close();
      }), 'ghost danger-text') : null,
      btn(existing ? tr('Salvează') : tr('Adaugă'), () => {
        if (!name.value.trim()) return invalid(name, tr('Scrie ce îți dorești'));
        const p = price.value.trim() ? parseAmount(price.value) : null;
        if (p != null && !(p >= 0)) return invalid(price, tr('Suma trebuie să fie pozitivă'));
        const url = normalizeLink(link.value);
        if (url === null) return invalid(link, tr('Linkul nu pare valid'));
        const out = {
          ...w, name: name.value.trim(), kind, forWho: kind === 'cadou' ? forWho.value.trim() : '', price: p == null ? null : round2(p),
          currency: cur, link: url, note: note.value.trim(), done: !!w.done,
        };
        if (existing) Object.assign(state.wishes.find(x => x.id === w.id), out);
        else state.wishes.push({ ...out, id: uid(), createdAt: today() });
        commit();
        sh.close();
        toast(existing ? tr('Salvat') : tr('Adăugat în listă'));
      })),
  });
  if (!existing) name.focus({ preventScroll: true });
}

function removeWish(w) {
  state.wishes = state.wishes.filter(x => x.id !== w.id);
  commit();
  toast(tr('Șters din listă'));
}

function wishRow(w) {
  const sub = [w.kind === 'cadou' ? (w.forWho ? tr('Cadou pentru {name}', { name: w.forWho }) : tr('Cadou')) : null, w.note].filter(Boolean).join(' · ');
  const content = h('div', { class: 'row wish' + (w.done ? ' faded' : '') },
    h('span', { class: 'cat-ic', style: { background: w.kind === 'cadou' ? '#FF8AC640' : '#B48CFF40', fontSize: '19px' } }, w.done ? '✅' : w.icon || '🎁'),
    h('div', { class: 'row-main' },
      h('div', { class: 'row-title' }, w.name),
      sub ? h('div', { class: 'row-sub wish-note' }, sub) : null,
      w.link ? h('a', {
        class: 'wish-link', href: w.link, target: '_blank', rel: 'noopener noreferrer',
        onclick: e => e.stopPropagation(), onpointerdown: e => e.stopPropagation(),
      }, icon('link', 15), hostOf(w.link)) : null),
    w.price != null ? h('div', { class: 'row-right' }, h('span', { class: 'amt' }, money(w.price, { cur: w.currency }))) : null);
  return swipeRow(content, { onTap: () => openWishForm(w), onDelete: () => removeWish(w), trash: true });
}

export function wishlistPage() {
  const base = state.settings.currency;
  const match = w => !kindFilter || w.kind === kindFilter;
  const all = state.wishes.filter(match);
  const open = all.filter(w => !w.done), done = all.filter(w => w.done);
  const priced = open.filter(w => w.price != null);
  const total = priced.reduce((a, w) => a + convert(w.price, w.currency || base, base), 0);

  const node = h('div', { class: 'page' },
    h('section', { class: 'card summary' },
      h('span', { class: 'label' }, tr('Cât ar costa tot ce e pe listă')),
      h('strong', { class: 'big' }, money(total)),
      h('span', { class: 'muted' }, tr('{n} pe listă', { n: open.length }))),
    h('div', { class: 'chips-scroll' },
      [['', 'Toate'], ['dorinta', 'Pentru mine'], ['cadou', 'Cadouri']].map(([v, label]) =>
        h('button', { type: 'button', class: 'pchip' + (kindFilter === v ? ' on' : ''), onclick: () => { kindFilter = v; app.rerender(); } }, tr(label)))),
    sectionHead(tr('Pe listă'), linkBtn(tr('Adaugă'), () => openWishForm())),
    open.length
      ? h('div', { class: 'list' }, open.map(wishRow))
      : card(emptyState(tr('Lista e goală. Adaugă lucruri pe care ți le dorești sau idei de cadouri.'), tr('Adaugă'), () => openWishForm())),
    open.length ? onceHint('swipe-wish', tr('Apasă pe un rând ca să-l editezi. Glisează spre stânga ca să-l ștergi.')) : null,
    done.length ? h('details', { class: 'done-goals' }, h('summary', {}, tr('Luate ({n})', { n: done.length })), h('div', { class: 'list' }, done.map(wishRow))) : null);
  return { title: tr('Listă de dorințe'), back: '#/acasa', node };
}
