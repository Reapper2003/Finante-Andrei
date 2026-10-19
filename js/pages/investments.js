import { state, uid, commit } from '../store.js';
import { today, fmtDate, monthShort } from '../dates.js';
import { money, pct, parseAmount, CURRENCIES, plural, forInput } from '../fmt.js';
import {
  round2, assetStats, brokerStats, portfolioStats, portfolioSeries, allocation, assetTypeOptions, assetTypeLabel, brokerOfAsset, convert,
} from '../calc.js';
import {
  h, card, sectionHead, linkBtn, stat, btn, go, app, signCls, emptyState, openSheet, field, textInput, amountInput, dateInput,
  segmented, selectInput, switchRow, invalid, toast, confirmDialog, swipeRow, icon,
} from '../ui.js';
import { donut, lineChart, barBreakdown } from '../charts.js';
import { listRow, exportButton } from '../components.js';
import { saveContribution, deleteContribution, deleteAsset, deleteBroker } from '../actions.js';
import { t as tr } from '../i18n.js';
import { INV_ART, INV_PLAIN } from '../heroArt.js';

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

const TYPE_ICON = { etf: '📊', actiune: '📈', crypto: '🪙', obligatiuni: '🏛️', titluri: '🇷🇴', altele: '💼' };
let period = 'all';

export function investmentsPage() {
  if (!state.brokers.length) {
    return {
      title: tr('Investiții'),
      node: h('div', { class: 'page' },
        card(emptyState(tr('Nu ai încă nicio investiție, adaugă primul broker.'), tr('Adaugă broker'), () => openBrokerForm())),
        h('div', { class: 'center' }, linkBtn(tr('Calculator investiții'), () => go('#/calculator'), 'trend')),
        h('p', { class: 'hint center' }, tr('Investițiile sunt separate de restul banilor și nu intră în totalul disponibil.'))),
    };
  }
  const base = state.settings.currency;
  const p = portfolioStats();
  const series = portfolioSeries();
  // „1L” = luna asta față de cea trecută (2 puncte), „3L” = ultimele 3 luni (4 puncte) etc.
  const shown = period === 'all' ? series : series.slice(-(Number(period) + 1));
  const up = p.profit >= 0;

  // Cardul principal: valoarea, câștigul și graficul, împreună.
  const invStyle = INV_ART[state.settings.invStyle] || INV_PLAIN.includes(state.settings.invStyle) ? state.settings.invStyle : 'implicit';
  const art = INV_ART[invStyle] ? h('div', { class: 'hero-art' }) : null;
  if (art) art.innerHTML = INV_ART[invStyle];
  const PERIODS = [['1', '1L'], ['3', '3L'], ['6', '6L'], ['12', '1A'], ['36', '3A'], ['all', tr('Tot')]];
  const periods = series.length > 1 ? h('div', { class: 'inv-periods', role: 'radiogroup' }, PERIODS.map(([v, label]) => h('button', {
    type: 'button', role: 'radio', class: period === v ? 'on' : '', 'aria-checked': String(period === v), onclick: () => { period = v; app.rerender(); },
  }, label))) : null;
  const hero = h('section', { class: `card inv-hero inv-bg-${invStyle}${art ? ' has-art' : ''} bleed-hero hl-mixt` },
    art,
    h('div', { class: 'inv-top' },
      h('span', { class: 'label' }, tr('Valoare portofoliu'))),
    h('strong', { class: 'big' }, money(p.value)),
    h('span', { class: 'inv-pill ' + (up ? 'up' : 'down') }, up ? '▲' : '▼', ` ${money(p.profit, { sign: true })} · ${pct(p.pct, 1, true)}`),
    shown.length > 1 ? lineChart({
      labels: shown.map(x => monthShort(x.m)), bare: true, height: 130,
      series: [
        { name: tr('Valoare'), color: '#FFFFFF', values: shown.map(x => x.value), area: true },
        { name: tr('Total depus'), color: 'rgba(255,255,255,.55)', values: shown.map(x => x.deposited), dashed: true },
      ],
      format: v => money(v),
    }) : null,
    periods);
  const stats = h('div', { class: 'pill-strip' },
    h('div', { class: 'pill' }, h('small', {}, tr('Total depus')), h('b', {}, money(p.deposited))),
    h('div', { class: 'pill' }, h('small', {}, tr('Câștig')), h('b', { class: signCls(p.profit) }, money(p.profit, { sign: true }))),
    h('div', { class: 'pill' }, h('small', {}, tr('Randament')), h('b', { class: signCls(p.profit) }, pct(p.pct, 1, true))));

  // Fiecare broker cu activele lui dedesubt (cele mai mari primele), ca să se vadă că țin împreună.
  const assetCard = (a, b) => {
    const st = assetStats(a), baseValue = convert(st.value, b.currency, base);
    return h('button', { type: 'button', class: 'asset-card', onclick: () => go(`#/investitii/a/${a.id}`) },
      h('div', { class: 'ac-top' }, h('span', { class: 'ac-ic' }, TYPE_ICON[a.type] || '💼'), h('span', { class: 'ac-pct ' + signCls(st.profit) }, pct(st.pct, 1, true))),
      h('b', { class: 'ac-name' }, a.symbol || a.name),
      h('small', {}, a.symbol ? a.name : assetTypeLabel(a.type)),
      h('strong', {}, money(st.value, { cur: b.currency })),
      h('div', { class: 'bar' }, h('i', { style: { width: `${p.value ? Math.min(100, (baseValue / p.value) * 100) : 0}%` } })),
      h('small', { class: 'ac-share' }, tr('{p} din portofoliu', { p: pct(p.value ? baseValue / p.value : 0, 0) })));
  };
  const groups = state.brokers.map(b => {
    const bs = brokerStats(b);
    const list = state.assets.filter(x => x.brokerId === b.id)
      .sort((x, y) => assetStats(y).value - assetStats(x).value);
    return h('section', { class: 'brk' },
      h('button', { type: 'button', class: 'brk-head', onclick: () => go(`#/investitii/b/${b.id}`) },
        h('span', { class: 'cat-ic neutral initial' }, b.name.slice(0, 1).toUpperCase()),
        h('span', { class: 'brk-main' }, h('b', {}, b.name), h('small', {}, `${plural(bs.count, tr('activ'), tr('active'))} · ${b.currency}`)),
        h('span', { class: 'brk-right' }, h('b', {}, money(bs.value, { cur: b.currency })), h('small', { class: signCls(bs.profit) }, pct(bs.pct, 1, true))),
        h('span', { class: 'chev' }, icon('chevR', 18))),
      h('div', { class: 'chips-scroll asset-cards' },
        list.map(x => assetCard(x, b)),
        h('button', { type: 'button', class: 'asset-card add', onclick: () => openAssetForm(b.id) }, icon('plus', 22), tr('Activ nou'))));
  });

  const alloc = allocation(allocBy === 'broker' ? 'broker' : 'tip').map(x => ({ ...x, icon: allocBy === 'broker' ? x.label.slice(0, 1).toUpperCase() : TYPE_ICON[x.id] || '💼' }));

  const node = h('div', { class: 'page' },
    hero,
    stats,
    sectionHead(tr('Brokeri și active'), linkBtn(tr('Broker nou'), () => openBrokerForm())),
    ...groups,
    alloc.length ? card(
      h('div', { class: 'card-head' }, h('h2', {}, tr('Alocare')),
        segmented([{ value: 'tip', label: tr('Pe tip') }, { value: 'broker', label: tr('Pe broker') }], allocBy, v => { allocBy = v; app.rerender(); }, 'seg-sm')),
      barBreakdown({ items: alloc, format: v => `${money(v)} · ${pct(v / (p.value || 1), 0)}` })) : null,
    base !== 'RON' || state.brokers.some(b => b.currency !== base) ? h('p', { class: 'hint center' }, tr('Totalurile sunt convertite cu cursul din Setări.')) : null,
    h('div', { class: 'center' }, linkBtn(tr('Calculator investiții'), () => go('#/calculator'), 'trend')));
  return { title: tr('Investiții'), node, bleed: true };
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
