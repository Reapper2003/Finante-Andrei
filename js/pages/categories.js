import { state, uid, commit, PALETTE } from '../store.js';
import { plural } from '../fmt.js';
import {
  h, sectionHead, linkBtn, segmented, app, openSheet, field, textInput, btn, invalid, toast, confirmDialog, swipeRow, catIcon,
  emojiPicker, colorPicker, onceHint
} from '../ui.js';
import { listRow } from '../components.js';
import { deleteCategory } from '../actions.js';
import { t as tr, catName } from '../i18n.js';

const EMOJIS = ['🛒', '🍽️', '☕', '🚌', '🚗', '⛽', '🏠', '💡', '📱', '💊', '🎬', '🎮', '🛍️', '👕', '🔁', '📚',
  '🎁', '✈️', '🐶', '👶', '💇', '🏋️', '🍺', '🧾', '🏦', '💼', '💻', '⭐', '🏷️', '📈', '💰', '📦'];
let type = 'cheltuiala';

function openCatForm(existing) {
  const c = existing ? { ...existing } : { type, icon: '🏷️', color: PALETTE[state.categories.length % PALETTE.length] };
  const shown = existing ? catName(existing) : '';
  const name = textInput(shown, { placeholder: tr('ex. Cafea'), maxlength: 24 });
  const typeSeg = segmented([{ value: 'cheltuiala', label: tr('Cheltuială') }, { value: 'venit', label: tr('Venit') }], c.type);
  const used = existing ? state.transactions.filter(t => t.categoryId === c.id).length : 0;
  const sh = openSheet({
    title: existing ? tr('Editează categoria') : tr('Categorie nouă'),
    body: h('div', {},
      field(tr('Nume'), name),
      existing ? null : field(tr('Tip'), typeSeg),
      field(tr('Iconiță'), emojiPicker(EMOJIS, c.icon, v => { c.icon = v; })),
      field(tr('Culoare'), colorPicker(PALETTE, c.color, v => { c.color = v; }))),
    footer: h('div', { class: 'btn-row' },
      existing ? btn(tr('Șterge'), () => confirmDel(existing, used, () => sh.close()), 'ghost danger-text') : null,
      btn(tr('Salvează'), () => {
        // Dacă numele afișat (eventual tradus) nu s-a schimbat, păstrăm numele original.
        const n = existing && name.value.trim() === shown ? existing.name : name.value.trim();
        if (!n) return invalid(name, tr('Scrie un nume'));
        const t = existing ? c.type : typeSeg.get();
        if (state.categories.some(x => x.type === t && x.name.toLowerCase() === n.toLowerCase() && x.id !== c.id)) return invalid(name, tr('Există deja o categorie cu acest nume'));
        const out = { ...c, name: n, type: t };
        if (existing) Object.assign(state.categories.find(x => x.id === c.id), out);
        else state.categories.push({ ...out, id: uid() });
        commit();
        sh.close();
        toast(tr('Categorie salvată'));
      })),
  });
  if (!existing) name.focus({ preventScroll: true });
}

function confirmDel(c, used, after) {
  confirmDialog({
    title: tr('Ștergi categoria {name}?', { name: catName(c) }),
    message: used ? tr('{n} vor rămâne „Fără categorie”.', { n: plural(used, tr('tranzacție'), tr('tranzacții')) }) : tr('Nu e folosită de nicio tranzacție.'),
  }).then(ok => {
    if (!ok) return;
    deleteCategory(c.id);
    toast(tr('Categorie ștearsă'));
    after?.();
  });
}

export function categoriesPage() {
  const list = state.categories.filter(c => c.type === type);
  const node = h('div', { class: 'page' },
    segmented([{ value: 'cheltuiala', label: tr('Cheltuieli') }, { value: 'venit', label: tr('Venituri') }], type, v => { type = v; app.rerender(); }),
    sectionHead(type === 'venit' ? tr('Categorii de venit') : tr('Categorii de cheltuieli'), linkBtn(tr('Adaugă'), () => openCatForm())),
    h('div', { class: 'list' }, list.map(c => {
      const used = state.transactions.filter(t => t.categoryId === c.id).length;
      return swipeRow(listRow({ iconEl: catIcon(c), title: catName(c), sub: plural(used, tr('tranzacție'), tr('tranzacții')) }), {
        onTap: () => openCatForm(c), onEdit: () => openCatForm(c), onDelete: () => confirmDel(c, used),
      });
    })),
    onceHint('swipe-cat', tr('Glisează spre stânga pentru Editează / Șterge.')));
  return { title: tr('Categorii'), back: '#/setari', node };
}
