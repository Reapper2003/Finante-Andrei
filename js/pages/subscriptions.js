import { state, uid, commit, catById, catByName } from '../store.js';
import { today, fmtDate, inDays, daysBetween } from '../dates.js';
import { money, parseAmount } from '../fmt.js';
import { round2, subTotals, freqLabel, freqOptions } from '../calc.js';
import {
  h, card, sectionHead, linkBtn, stat, btn, emptyState, openSheet, field, textInput, amountInput, dateInput, segmented,
  selectInput, switchRow, invalid, toast, confirmDialog, swipeRow, catIcon, onceHint
} from '../ui.js';
import { exportButton } from '../components.js';
import { t as tr, catName } from '../i18n.js';

const PER = { lunar: '/lună', trimestrial: '/trim.', anual: '/an' };

function openSubForm(existing) {
  const s = existing ? { ...existing } : { frequency: 'lunar', nextPayment: today(), autoRecord: true, categoryId: catByName('Abonamente', 'cheltuiala')?.id || '' };
  const name = textInput(s.name, { placeholder: tr('ex. Netflix'), maxlength: 40 });
  const amount = amountInput(s.amount);
  const freq = segmented(freqOptions(), s.frequency);
  const next = dateInput(s.nextPayment);
  const method = textInput(s.paymentMethod, { placeholder: tr('ex. Card Revolut'), maxlength: 40 });
  const cat = selectInput([{ value: '', label: tr('— Fără categorie —') }, ...state.categories.filter(c => c.type === 'cheltuiala').map(c => ({ value: c.id, label: `${c.icon} ${catName(c)}` }))], s.categoryId || '');
  const note = textInput(s.note, { placeholder: tr('Opțional'), maxlength: 140 });

  const sh = openSheet({
    title: existing ? tr('Editează abonamentul') : tr('Abonament nou'),
    body: h('div', {},
      field(tr('Nume'), name),
      field(tr('Sumă'), amount),
      field(tr('Frecvență'), freq),
      h('div', { class: 'two' }, field(tr('Următoarea plată'), next), field(tr('Metodă de plată'), method)),
      field(tr('Categorie'), cat),
      field(tr('Notă'), note),
      switchRow(tr('De anulat?'), s.toCancel, v => { s.toCancel = v; }, tr('Marchează-l ca să-l revizuiești')),
      switchRow(tr('Înregistrează automat plata'), s.autoRecord, v => { s.autoRecord = v; }, tr('La data plății se adaugă cheltuiala din contul Curent'))),
    footer: h('div', { class: 'btn-row' },
      existing ? btn(tr('Șterge'), () => confirmDelete(existing, () => sh.close()), 'ghost danger-text') : null,
      btn(existing ? tr('Salvează') : tr('Adaugă'), () => {
        if (!name.value.trim()) return invalid(name, tr('Scrie numele abonamentului'));
        const a = parseAmount(amount.value);
        if (!(a > 0)) return invalid(amount, tr('Introdu o sumă mai mare ca 0'));
        if (!next.value) return invalid(next, tr('Alege data următoarei plăți'));
        const out = {
          ...s, name: name.value.trim(), amount: round2(a), frequency: freq.get(), nextPayment: next.value, anchorDay: Number(next.value.slice(8)),
          paymentMethod: method.value.trim(), categoryId: cat.value || null, note: note.value.trim(), toCancel: !!s.toCancel, autoRecord: !!s.autoRecord,
        };
        if (existing) Object.assign(state.subscriptions.find(x => x.id === s.id), out);
        else state.subscriptions.push({ ...out, id: uid() });
        commit();
        sh.close();
        toast(existing ? tr('Abonament actualizat') : tr('Abonament adăugat'));
      })),
  });
  if (!existing) name.focus({ preventScroll: true });
}

function confirmDelete(s, after) {
  confirmDialog({ title: tr('Ștergi {name}?', { name: s.name }), message: tr('Plățile deja înregistrate rămân în tranzacții.') }).then(ok => {
    if (!ok) return;
    state.subscriptions = state.subscriptions.filter(x => x.id !== s.id);
    commit();
    toast(tr('Abonament șters'));
    after?.();
  });
}

export function subscriptionsPage() {
  const tot = subTotals();
  const t = today();
  const list = [...state.subscriptions].sort((a, b) => (a.nextPayment || '9').localeCompare(b.nextPayment || '9'));
  const node = h('div', { class: 'page' },
    h('section', { class: 'card summary' },
      h('span', { class: 'label' }, tr('Total lunar')),
      h('strong', { class: 'big' }, money(tot.monthly)),
      h('div', { class: 'stats2' }, stat(tr('Total anual'), money(tot.annual)), stat(tr('Abonamente'), String(list.length)))),
    sectionHead(tr('Următoarele plăți'), linkBtn(tr('Adaugă'), () => openSubForm())),
    list.length
      ? h('div', { class: 'list' }, list.map(s => {
        const soon = s.nextPayment && s.nextPayment >= t && daysBetween(t, s.nextPayment) <= 7;
        const content = h('div', { class: 'row' + (soon ? ' soon' : '') },
          catIcon(catById(s.categoryId) || { icon: '🔁', color: '#C9CED6' }),
          h('div', { class: 'row-main' },
            h('div', { class: 'row-title' }, s.name, s.toCancel ? h('span', { class: 'tag warn' }, tr('De anulat?')) : null),
            h('div', { class: 'row-sub' }, [freqLabel(s.frequency), s.paymentMethod].filter(Boolean).join(' · ')),
            h('div', { class: 'row-sub' + (soon ? ' accent' : '') }, s.nextPayment ? `${tr('Următoarea plată: {date}', { date: fmtDate(s.nextPayment) })}${soon ? ` · ${inDays(s.nextPayment)}` : ''}` : '')),
          h('div', { class: 'row-right' }, h('span', { class: 'amt' }, money(s.amount)), h('span', { class: 'row-sub' }, tr(PER[s.frequency]))));
        return swipeRow(content, { onTap: () => openSubForm(s), onEdit: () => openSubForm(s), onDelete: () => confirmDelete(s) });
      }))
      : card(emptyState(tr('Nu ai niciun abonament. Adaugă-le ca să știi cât te costă pe lună.'), tr('Adaugă abonament'), () => openSubForm())),
    list.length ? onceHint('swipe-sub', tr('Glisează spre stânga pentru Editează / Șterge.')) : null);
  return { title: tr('Abonamente'), back: '#/acasa', node };
}
