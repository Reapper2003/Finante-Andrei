import { state, uid, commit } from '../store.js';
import { today, fmtDate, monthShort } from '../dates.js';
import { money, pct, parseAmount, CURRENCIES, plural, forInput } from '../fmt.js';
import {
  round2, assetStats, brokerStats, portfolioStats, portfolioSeries, allocation, assetTypeOptions, assetTypeLabel, brokerOfAsset,
} from '../calc.js';
import {
  h, card, sectionHead, linkBtn, stat, btn, go, app, signCls, emptyState, openSheet, field, textInput, amountInput, dateInput,
  segmented, selectInput, switchRow, invalid, toast, confirmDialog, swipeRow,
} from '../ui.js';
import { donut, lineChart } from '../charts.js';
import { listRow, exportButton } from '../components.js';
import { saveContribution, deleteContribution, deleteAsset, deleteBroker } from '../actions.js';
import { t as tr } from '../i18n.js';

const CUR_OPTS = Object.keys(CURRENCIES).map(c => ({ value: c, label: c }));
let allocBy = 'tip';

function statsCard(label, s, cur) {
  return h('section', { class: 'card summary' },
    h('span', { class: 'label' }, label),
    h('strong', { class: 'big' }, money(s.value, { cur })),
    h('div', { class: 'stats3' },
      stat(tr('Total depus'), money(s.deposited, { cur })),
      stat(tr('Profit'), money(s.profit, { cur, sign: true }), signCls(s.profit)),
      stat(tr('Profit %'), pct(s.pct, 1, true), signCls(s.profit))));
}

/* ---------- Formulare ---------- */

function openBrokerForm(existing) {
  const b = existing ? { ...existing } : { currency: state.settings.currency };
  const name = textInput(b.name, { placeholder: tr('ex. XTB, Trading 212'), maxlength: 40 });
  const note = textInput(b.note, { placeholder: tr('Opțional'), maxlength: 140 });
  const cur = segmented(CUR_OPTS, b.currency || 'RON');
  const sh = openSheet({
    title: existing ? tr('Editează brokerul') : tr('Broker nou'),
    body: h('div', {}, field(tr('Nume'), name), field(tr('Monedă'), cur), field(tr('Notă'), note)),
    footer: btn(existing ? tr('Salvează') : tr('Adaugă broker'), () => {
      if (!name.value.trim()) return invalid(name, tr('Scrie numele brokerului'));
      const out = { ...b, name: name.value.trim(), currency: cur.get(), note: note.value.trim() };
      if (existing) Object.assign(state.brokers.find(x => x.id === b.id), out);
      else state.brokers.push({ ...out, id: uid() });
      commit();
      sh.close();
      toast(existing ? tr('Broker actualizat') : tr('Broker adăugat'));
    }),
  });
  if (!existing) name.focus({ preventScroll: true });
}

function openAssetForm(brokerId, existing) {
  const a = existing ? { ...existing } : { brokerId, type: 'etf' };
  const name = textInput(a.name, { placeholder: tr('ex. Vanguard FTSE All-World'), maxlength: 60 });
  const symbol = textInput(a.symbol, { placeholder: tr('ex. VWCE (opțional)'), maxlength: 16, autocapitalize: 'characters' });
  const type = selectInput(assetTypeOptions(), a.type);
  const sh = openSheet({
    title: existing ? tr('Editează activul') : tr('Activ nou'),
    body: h('div', {}, field(tr('Nume'), name), h('div', { class: 'two' }, field(tr('Simbol'), symbol), field(tr('Tip'), type))),
    footer: btn(existing ? tr('Salvează') : tr('Adaugă activ'), () => {
      if (!name.value.trim()) return invalid(name, tr('Scrie numele activului'));
      const out = { ...a, name: name.value.trim(), symbol: symbol.value.trim().toUpperCase(), type: type.value };
      if (existing) Object.assign(state.assets.find(x => x.id === a.id), out);
      else state.assets.push({ ...out, id: uid() });
      commit();
      sh.close();
      toast(existing ? tr('Activ actualizat') : tr('Activ adăugat'));
    }),
  });
  if (!existing) name.focus({ preventScroll: true });
}

function openContributionForm(asset, existing) {
  const b = brokerOfAsset(asset);
  const base = state.settings.currency;
  const amount = amountInput(existing?.amount);
  const date = dateInput(existing?.date || today());
  let fromCurrent = !existing;
  const sh = openSheet({
    title: existing ? tr('Editează contribuția') : `${tr('Contribuție')} · ${asset.name}`,
    body: h('div', {},
      field(tr('Sumă depusă ({cur})', { cur: b.currency }), amount,
        b.currency !== base ? tr('Curs folosit: 1 {cur} = {rate} lei (din Setări)', { cur: b.currency, rate: forInput(state.settings.rates[b.currency]) }) : null),
      field(tr('Data'), date),
      existing
        ? h('p', { class: 'hint' }, existing.txId ? tr('Legată de un transfer din contul Curent; se actualizează și transferul.') : tr('Nu e legată de un transfer din contul Curent.'))
        : switchRow(tr('Scade suma din contul Curent'), true, v => { fromCurrent = v; }, tr('Se înregistrează ca transfer, nu ca cheltuială'))),
    footer: btn(existing ? tr('Salvează') : tr('Adaugă contribuția'), () => {
      const v = parseAmount(amount.value);
      if (!(v > 0)) return invalid(amount, tr('Introdu o sumă mai mare ca 0'));
      saveContribution({ ...(existing || {}), assetId: asset.id, date: date.value || today(), amount: round2(v) }, fromCurrent);
      sh.close();
      toast(existing ? tr('Contribuție actualizată') : tr('Contribuție adăugată'));
    }),
  });
  if (!existing) amount.focus({ preventScroll: true });
}

function openValueForm(asset, existing) {
  const b = brokerOfAsset(asset);
  const value = amountInput(existing?.value);
  const date = dateInput(existing?.date || today());
  const sh = openSheet({
    title: existing ? tr('Editează valoarea') : tr('Actualizează valoarea'),
    body: h('div', {}, field(tr('Valoare curentă ({cur})', { cur: b.currency }), value, tr('Cât valorează acum activul, conform brokerului.')), field(tr('Data'), date)),
    footer: btn(tr('Salvează'), () => {
      const v = parseAmount(value.value);
      if (!(v >= 0) || value.value.trim() === '') return invalid(value, tr('Introdu valoarea'));
      const out = { assetId: asset.id, date: date.value || today(), value: round2(v) };
      if (existing) Object.assign(state.assetValues.find(x => x.id === existing.id), out);
      else state.assetValues.push({ ...out, id: uid() });
      commit();
      sh.close();
      toast(tr('Valoare salvată'));
    }),
  });
  if (!existing) value.focus({ preventScroll: true });
}

/* ---------- Pagini ---------- */

export function investmentsPage() {
  if (!state.brokers.length) {
    return {
      title: tr('Investiții'),
      node: h('div', { class: 'page' },
        card(emptyState(tr('Nu ai încă nicio investiție, adaugă primul broker.'), tr('Adaugă broker'), () => openBrokerForm())),
        h('p', { class: 'hint center' }, tr('Investițiile sunt separate de restul banilor și nu intră în totalul disponibil.'))),
    };
  }
  const base = state.settings.currency;
  const p = portfolioStats();
  const series = portfolioSeries();
  const alloc = allocation(allocBy === 'broker' ? 'broker' : 'tip');

  const node = h('div', { class: 'page' },
    statsCard(tr('Valoare portofoliu'), p, base),
    series.length > 1 ? card(h('h2', {}, tr('Evoluție')), lineChart({
      labels: series.map(x => monthShort(x.m)),
      series: [
        { name: tr('Valoare'), color: 'var(--accent)', values: series.map(x => x.value) },
        { name: tr('Total depus'), color: 'var(--chart2)', values: series.map(x => x.deposited), dashed: true },
      ],
      format: v => money(v),
    })) : null,
    alloc.length ? card(
      h('div', { class: 'card-head' }, h('h2', {}, tr('Alocare')),
        segmented([{ value: 'tip', label: tr('Pe tip') }, { value: 'broker', label: tr('Pe broker') }], allocBy, v => { allocBy = v; app.rerender(); })),
      donut({ items: alloc, title: tr('Total'), format: v => money(v) })) : null,
    sectionHead(tr('Brokeri'), linkBtn(tr('Adaugă'), () => openBrokerForm())),
    h('div', { class: 'list' }, state.brokers.map(b => {
      const s = brokerStats(b);
      return listRow({
        iconEl: h('span', { class: 'cat-ic neutral initial' }, b.name.slice(0, 1).toUpperCase()),
        title: b.name, sub: `${plural(s.count, tr('activ'), tr('active'))} · ${b.currency}`,
        right: money(s.value, { cur: b.currency }),
        rightSub: h('span', { class: 'row-sub ' + signCls(s.profit) }, pct(s.pct, 1, true)),
        onTap: () => go(`#/investitii/b/${b.id}`), chevron: true,
      });
    })),
    h('p', { class: 'hint center' }, base !== 'RON' || state.brokers.some(b => b.currency !== base) ? tr('Totalurile sunt convertite cu cursul din Setări.') : ''),
    exportButton());
  return { title: tr('Investiții'), node };
}

export function brokerPage(id) {
  const b = state.brokers.find(x => x.id === id);
  if (!b) return null;
  const s = brokerStats(b);
  const assets = state.assets.filter(a => a.brokerId === id);
  const node = h('div', { class: 'page' },
    statsCard(`${tr('Valoare')} · ${b.currency}`, s, b.currency),
    b.note ? h('p', { class: 'muted' }, b.note) : null,
    sectionHead(tr('Active'), linkBtn(tr('Adaugă'), () => openAssetForm(id))),
    assets.length
      ? h('div', { class: 'list' }, assets.map(a => {
        const st = assetStats(a);
        return listRow({
          title: a.name, sub: [a.symbol, assetTypeLabel(a.type)].filter(Boolean).join(' · '),
          right: money(st.value, { cur: b.currency }),
          rightSub: h('span', { class: 'row-sub ' + signCls(st.profit) }, pct(st.pct, 1, true)),
          onTap: () => go(`#/investitii/a/${a.id}`), chevron: true,
        });
      }))
      : card(emptyState(tr('Niciun activ încă. Adaugă primul activ (ex. un ETF).'), tr('Adaugă activ'), () => openAssetForm(id))),
    h('div', { class: 'btn-row' },
      btn(tr('Editează brokerul'), () => openBrokerForm(b), 'secondary'),
      btn(tr('Șterge'), () => confirmDialog({
        title: tr('Ștergi {name}?', { name: b.name }),
        message: tr('Se șterg și activele, contribuțiile și istoricul valorilor. Transferurile din contul Curent rămân în istoric.'),
      }).then(ok => { if (ok) { deleteBroker(id); toast(tr('Broker șters')); go('#/investitii'); } }), 'ghost danger-text')));
  return { title: b.name, back: '#/investitii', node };
}

export function assetPage(id) {
  const a = state.assets.find(x => x.id === id);
  if (!a) return null;
  const b = brokerOfAsset(a);
  if (!b) return null;
  const cur = b.currency;
  const st = assetStats(a);
  const contribs = state.contributions.filter(c => c.assetId === id).sort((x, y) => y.date.localeCompare(x.date));
  const values = state.assetValues.filter(v => v.assetId === id).sort((x, y) => y.date.localeCompare(x.date));

  const node = h('div', { class: 'page' },
    statsCard(st.lastDate ? tr('Valoare curentă · actualizată la {date}', { date: fmtDate(st.lastDate) }) : tr('Valoare estimată (fără valoare introdusă)'), st, cur),
    h('div', { class: 'btn-row' },
      btn(tr('Actualizează valoarea'), () => openValueForm(a), 'secondary'),
      btn(tr('Contribuție'), () => openContributionForm(a))),
    sectionHead(tr('Contribuții')),
    contribs.length
      ? h('div', { class: 'list' }, contribs.map(c => swipeRow(
        listRow({ title: money(c.amount, { cur }), sub: [fmtDate(c.date), c.txId ? tr('din contul Curent') : null].filter(Boolean).join(' · ') }),
        {
          onTap: () => openContributionForm(a, c), onEdit: () => openContributionForm(a, c),
          onDelete: () => confirmDialog({ title: tr('Ștergi contribuția?'), message: `${money(c.amount, { cur })} · ${fmtDate(c.date)}${c.txId ? '. ' + tr('Transferul din contul Curent se șterge și el.') : ''}` })
            .then(ok => { if (ok) { deleteContribution(c.id); toast(tr('Contribuție ștearsă')); } }),
        })))
      : h('p', { class: 'muted' }, tr('Nicio contribuție încă.')),
    sectionHead(tr('Istoric valori')),
    values.length
      ? h('div', { class: 'list' }, values.map(v => swipeRow(
        listRow({ title: money(v.value, { cur }), sub: fmtDate(v.date) }),
        {
          onTap: () => openValueForm(a, v), onEdit: () => openValueForm(a, v),
          onDelete: () => confirmDialog({ title: tr('Ștergi valoarea?'), message: `${money(v.value, { cur })} · ${fmtDate(v.date)}` })
            .then(ok => { if (ok) { state.assetValues = state.assetValues.filter(x => x.id !== v.id); commit(); toast(tr('Valoare ștearsă')); } }),
        })))
      : h('p', { class: 'muted' }, tr('Introdu periodic valoarea curentă ca să vezi profitul real.')),
    h('div', { class: 'btn-row' },
      btn(tr('Editează activul'), () => openAssetForm(b.id, a), 'secondary'),
      btn(tr('Șterge'), () => confirmDialog({ title: tr('Ștergi {name}?', { name: a.name }), message: tr('Se șterg contribuțiile și istoricul valorilor. Transferurile din contul Curent rămân în istoric.') })
        .then(ok => { if (ok) { deleteAsset(id); toast(tr('Activ șters')); go(`#/investitii/b/${b.id}`); } }), 'ghost danger-text')));
  return { title: a.name, back: `#/investitii/b/${b.id}`, node };
}
