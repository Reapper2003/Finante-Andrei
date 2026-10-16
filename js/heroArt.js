// Desene pentru fundalurile ilustrate ale cardului principal (desenate în cod, ca să meargă offline).
// Fiecare desen stă în dreapta-sus a cardului; fundalul colorat e în style.css (.hero-bg-<nume>).

const svg = body => `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMid meet" aria-hidden="true">${body}</svg>`;

export const HERO_ART = {
  bear: svg(`
    <path d="M98 18c-3-6-11-4-10 2 1 5 10 10 10 10s9-5 10-10c1-6-7-8-10-2z" fill="#FF6B8A"/>
    <circle cx="38" cy="26" r="13" fill="#9A6440"/><circle cx="38" cy="26" r="7" fill="#E8B98C"/>
    <circle cx="82" cy="26" r="13" fill="#9A6440"/><circle cx="82" cy="26" r="7" fill="#E8B98C"/>
    <ellipse cx="60" cy="98" rx="34" ry="24" fill="#A9714A"/><ellipse cx="60" cy="100" rx="19" ry="14" fill="#E8B98C"/>
    <circle cx="60" cy="50" r="30" fill="#B07A50"/>
    <ellipse cx="60" cy="61" rx="14" ry="11" fill="#F0D2B0"/>
    <ellipse cx="60" cy="56" rx="5" ry="3.6" fill="#3B2416"/>
    <path d="M60 59.5v3.5M55 64q5 4 10 0" stroke="#3B2416" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="48" cy="45" r="3.4" fill="#2A1A10"/><circle cx="72" cy="45" r="3.4" fill="#2A1A10"/>
    <circle cx="49.2" cy="43.8" r="1.1" fill="#fff"/><circle cx="73.2" cy="43.8" r="1.1" fill="#fff"/>
    <circle cx="42" cy="57" r="4.2" fill="#F49BAB" opacity=".75"/><circle cx="78" cy="57" r="4.2" fill="#F49BAB" opacity=".75"/>`),

  car: svg(`
    <ellipse cx="63" cy="83" rx="54" ry="4" fill="#000" opacity=".35"/>
    <path d="M8 56 18 53v6z" fill="#B30F15"/>
    <path d="M8 70c0-8 6-12 16-14l20-4c8-10 18-14 30-14s20 6 28 14l8 2c6 2 8 6 8 12v6c0 2-2 4-4 4H12c-3 0-4-2-4-6z" fill="#E1171E"/>
    <path d="M50 52c6-8 14-10 22-10s14 4 20 10z" fill="#1B1F2A"/>
    <path d="M71 42v10" stroke="#E1171E" stroke-width="2.2"/>
    <path d="M18 63h88" stroke="#FF7373" stroke-width="1.6" opacity=".75"/>
    <path d="M40 68h14" stroke="#8B0D12" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M110 58l7 2" stroke="#FFE08A" stroke-width="3.2" stroke-linecap="round"/>
    <rect x="8" y="61" width="6" height="3.2" rx="1.6" fill="#FFB3B3"/>
    <circle cx="30" cy="77" r="11" fill="#111"/><circle cx="30" cy="77" r="6" fill="#A3A9B5"/><circle cx="30" cy="77" r="2" fill="#111"/>
    <circle cx="94" cy="77" r="11" fill="#111"/><circle cx="94" cy="77" r="6" fill="#A3A9B5"/><circle cx="94" cy="77" r="2" fill="#111"/>`),

  mountains: svg(`
    <circle cx="90" cy="28" r="14" fill="#FFD27A"/><circle cx="90" cy="28" r="20" fill="#FFD27A" opacity=".25"/>
    <path d="M30 26q3-3 6 0q3-3 6 0M46 18q2.5-2.5 5 0q2.5-2.5 5 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M6 100 44 44l18 26 18-20 40 50z" fill="#5B6BD6"/>
    <path d="M44 44l7 11-5-2-4 5-4-6z" fill="#fff"/>
    <path d="M48 100 84 56l36 36v8z" fill="#3E49B0"/>
    <path d="M84 56l7 8-5-1-4 4-4-4z" fill="#fff"/>`),

  space: svg(`
    <circle cx="16" cy="18" r="1.3" fill="#fff"/><circle cx="40" cy="8" r="1" fill="#fff"/><circle cx="108" cy="14" r="1.4" fill="#fff"/>
    <circle cx="86" cy="6" r="1" fill="#fff"/><circle cx="24" cy="60" r="1.2" fill="#fff"/><circle cx="112" cy="44" r="1" fill="#fff"/>
    <circle cx="96" cy="76" r="15" fill="#F59E8B"/><circle cx="91" cy="72" r="3" fill="#E07B6A"/><circle cx="101" cy="81" r="2" fill="#E07B6A"/>
    <ellipse cx="96" cy="76" rx="26" ry="6" fill="none" stroke="#FCD3B6" stroke-width="2.6" transform="rotate(-18 96 76)"/>
    <g transform="rotate(35 60 46)">
      <path d="M55 58q5 24 10 0z" fill="#FBBF24"/><path d="M57.5 58q2.5 13 5 0z" fill="#FB7185"/>
      <path d="M50 50l-8 12 8-2zM70 50l8 12-8-2z" fill="#EF4444"/>
      <path d="M60 12c10 10 12 26 10 46H50c-2-20 0-36 10-46z" fill="#F4F4F8"/>
      <path d="M60 12c4 4 6 7 7 10H53c1-3 3-6 7-10z" fill="#EF4444"/>
      <circle cx="60" cy="33" r="6" fill="#60A5FA" stroke="#94A3B8" stroke-width="2"/>
    </g>`),

  piggy: svg(`
    <circle cx="64" cy="14" r="9" fill="#FCD34D" stroke="#F59E0B" stroke-width="2"/><path d="M64 9.5v9" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
    <path d="M27 60q-9-4-5-11q4-4 6 2" stroke="#F481A4" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <rect x="38" y="76" width="9" height="13" rx="3" fill="#F481A4"/><rect x="74" y="76" width="9" height="13" rx="3" fill="#F481A4"/>
    <ellipse cx="62" cy="62" rx="36" ry="26" fill="#FF9EBB"/>
    <path d="M73 39l11-10 3 16z" fill="#F481A4"/>
    <ellipse cx="96" cy="63" rx="8" ry="9" fill="#F481A4"/><circle cx="94.5" cy="60.5" r="1.7" fill="#9D2B54"/><circle cx="97.5" cy="65.5" r="1.7" fill="#9D2B54"/>
    <circle cx="84" cy="52" r="2.7" fill="#3B1D2A"/>
    <rect x="54" y="37.5" width="16" height="3.6" rx="1.8" fill="#C2457A"/>
    <ellipse cx="47" cy="53" rx="8" ry="5" fill="#fff" opacity=".35"/>`),

  cat: svg(`
    <path d="M86 94c22 0 26-22 14-30" stroke="#F59E42" stroke-width="7" fill="none" stroke-linecap="round"/>
    <ellipse cx="66" cy="86" rx="24" ry="20" fill="#F59E42"/><ellipse cx="66" cy="89" rx="12" ry="12" fill="#FFD3B0"/>
    <path d="M47 38 45 17l15 13zM85 38l2-21-15 13z" fill="#F7A94D"/><path d="M49.5 33 49 23l6.5 6zM82.5 33l.5-10-6.5 6z" fill="#FFD3B0"/>
    <circle cx="66" cy="48" r="22" fill="#F7A94D"/>
    <path d="M60 28l2 6M66 27v7M72 28l-2 6" stroke="#D9772A" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="58" cy="48" rx="3" ry="4" fill="#2B2B2B"/><ellipse cx="74" cy="48" rx="3" ry="4" fill="#2B2B2B"/>
    <circle cx="59" cy="46.5" r="1" fill="#fff"/><circle cx="75" cy="46.5" r="1" fill="#fff"/>
    <path d="M64 55h4l-2 2.5z" fill="#E86A7E"/>
    <path d="M66 57.5q-3 3-6 1M66 57.5q3 3 6 1" stroke="#7A3E1D" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path d="M52 56H40M52 59l-11 3M80 56h12M80 59l11 3" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".9"/>`),

  beach: svg(`
    <circle cx="96" cy="26" r="12" fill="#FFE066"/><circle cx="96" cy="26" r="18" fill="#FFE066" opacity=".25"/>
    <path d="M0 78q15-6 30 0t30 0 30 0 30 0v22H0z" fill="#1EC8E6" opacity=".9"/>
    <path d="M40 100q30-22 80-14v14z" fill="#F7D08A"/>
    <path d="M80 90c-2-18-6-34-14-48" stroke="#8B5A2B" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M66 42c-10-10-22-8-28 0 10-4 20-2 28 0zM66 42c-2-14 6-22 18-22-8 6-14 14-18 22zM66 42c8-10 22-10 28-2-10-2-20 0-28 2zM66 42c-8 0-16 8-16 18 6-8 12-14 16-18z" fill="#22A06B"/>
    <circle cx="67.5" cy="45" r="2.6" fill="#6B3F1D"/><circle cx="63" cy="44" r="2.6" fill="#6B3F1D"/>`),
};

/* ---------- Fundaluri animate (animațiile sunt în style.css, clasele ha-*) ---------- */

// Întârziere + durată pentru elemente repetate, ca să nu se miște toate deodată.
const t = (delay, dur) => `style="animation-delay:${delay}s${dur ? `;animation-duration:${dur}s` : ''}"`;

// Val care se repetă la fiecare 30 de unități, ca deplasarea să pară continuă.
const wave = (y, amp, fill, cls) => {
  let d = `M-60 ${y}`;
  for (let x = -60; x < 180; x += 30) d += ` q7.5 ${-amp} 15 0 t15 0`;
  return `<path class="${cls}" d="${d} V100 H-60z" fill="${fill}"/>`;
};

// Ferestre de bloc: unele clipesc, altele sunt stinse.
const windows = (x0, y0, cols, rows, seed) => {
  let out = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = (seed * 7 + r * 5 + c * 3) % 11;
      const x = x0 + c * 6, y = y0 + r * 8;
      if (k < 3) out += `<rect x="${x}" y="${y}" width="3.4" height="4.4" rx=".6" fill="#FFD36E" opacity=".18"/>`;
      else out += `<rect class="ha-win" x="${x}" y="${y}" width="3.4" height="4.4" rx=".6" fill="#FFD36E" ${t(-k * 0.9, 4 + (k % 4) * 1.7)}/>`;
    }
  }
  return out;
};

const pine = (x, base, hgt, fill) =>
  `<path d="M${x} ${base - hgt}l${-hgt * 0.32} ${hgt * 0.45}h${hgt * 0.12}l${-hgt * 0.16} ${hgt * 0.3}h${hgt * 0.12}l${-hgt * 0.2} ${hgt * 0.25}h${hgt * 0.88}l${-hgt * 0.2} ${-hgt * 0.25}h${hgt * 0.12}l${-hgt * 0.16} ${-hgt * 0.3}h${hgt * 0.12}z" fill="${fill}"/>`;

Object.assign(HERO_ART, {
  aquarium: svg(`
    <g class="ha-weed"><path d="M14 102c-5-10 5-18 0-28s5-16 0-26" stroke="#2BB673" stroke-width="4" fill="none" stroke-linecap="round"/></g>
    <g class="ha-weed" ${t(-1.4, 3.6)}><path d="M24 102c4-8-4-14 0-22s-4-12 0-18" stroke="#16915A" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>
    <g class="ha-weed" ${t(-0.6, 4.4)}><path d="M110 102c-4-8 4-14 0-24" stroke="#2BB673" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>
    <path d="M0 98q30-7 60-2t60-3v7H0z" fill="#F2D49B"/>
    <g class="ha-fish">
      <path d="M96 38l13-9v18z" fill="#FF7A1A"/>
      <ellipse cx="82" cy="38" rx="16" ry="10.5" fill="#FF9F43"/>
      <path d="M77 28.5q6-7 12 0z" fill="#FF7A1A"/>
      <path d="M86 28.5v19M76 30v16" stroke="#fff" stroke-width="3"/>
      <circle cx="71.5" cy="35.5" r="2.8" fill="#fff"/><circle cx="71" cy="35.5" r="1.5" fill="#1A1A1A"/>
    </g>
    <g class="ha-fish r">
      <path d="M37 66l-9-6.5v13z" fill="#2E8FE0"/>
      <ellipse cx="47" cy="66" rx="11" ry="7" fill="#5BC0FF"/>
      <path d="M44 59.5q4-4 7 0z" fill="#2E8FE0"/>
      <circle cx="53.5" cy="64.5" r="1.9" fill="#fff"/><circle cx="54" cy="64.5" r="1" fill="#123"/>
    </g>
    <circle class="ha-bub" cx="64" cy="92" r="2.4" fill="none" stroke="#fff" stroke-width="1.2" ${t(0)}/>
    <circle class="ha-bub" cx="69" cy="94" r="1.6" fill="none" stroke="#fff" stroke-width="1.1" ${t(-1.3)}/>
    <circle class="ha-bub" cx="62" cy="96" r="1.2" fill="#fff" opacity=".8" ${t(-2.4)}/>
    <circle class="ha-bub" cx="100" cy="94" r="2" fill="none" stroke="#fff" stroke-width="1.1" ${t(-0.7, 5)}/>
    <circle class="ha-bub" cx="104" cy="96" r="1.3" fill="#fff" opacity=".8" ${t(-3.1, 5)}/>`),

  balloons: svg(`
    <g class="ha-cloud"><ellipse cx="22" cy="30" rx="12" ry="5" fill="#fff"/><circle cx="18" cy="26" r="5.5" fill="#fff"/><circle cx="25" cy="24.5" r="6.5" fill="#fff"/></g>
    <g class="ha-cloud" ${t(-4, 11)}><ellipse cx="104" cy="74" rx="11" ry="4.5" fill="#fff" opacity=".9"/><circle cx="101" cy="70.5" r="5" fill="#fff" opacity=".9"/><circle cx="107" cy="69.5" r="5.5" fill="#fff" opacity=".9"/></g>
    <g class="ha-float">
      <path d="M80 10c-15 0-23 10-23 22 0 12 12 20 18 27h10c6-7 18-15 18-27 0-12-8-22-23-22z" fill="#FF5D6C"/>
      <path d="M80 10c-6 7-7 15-7 23 0 9 2 18 2 26h10c0-8 2-17 2-26 0-8-1-16-7-23z" fill="#FFD166"/>
      <path d="M80 10c-2 7-2 15-2 23 0 9 1 18 1 26h2c0-8 1-17 1-26 0-8 0-16-2-23z" fill="#FF5D6C"/>
      <path d="M75.5 59l1.5 8.5M84.5 59l-1.5 8.5" stroke="#7A4A2A" stroke-width="1.1"/>
      <rect x="75" y="67" width="10" height="7.5" rx="1.6" fill="#A0522D"/>
    </g>
    <g class="ha-float" ${t(-1.8, 4.6)}>
      <path d="M38 44c-9 0-13.5 6-13.5 13 0 7.5 7 11.5 10.5 16h6c3.5-4.5 10.5-8.5 10.5-16 0-7-4.5-13-13.5-13z" fill="#4ECDC4"/>
      <path d="M38 44c-3.5 4.5-4 9-4 13.5 0 5.5 1 11 1 15.5h6c0-4.5 1-10 1-15.5 0-4.5-.5-9-4-13.5z" fill="#fff" opacity=".85"/>
      <path d="M35.5 73l.8 4M40.5 73l-.8 4" stroke="#7A4A2A" stroke-width="1"/>
      <rect x="35" y="77" width="6" height="4.6" rx="1" fill="#8B4513"/>
    </g>`),

  winter: svg(`
    <circle cx="104" cy="16" r="7" fill="#FFF6D6" opacity=".9"/>
    <path d="M0 86q30-10 60-4t60-6v24H0z" fill="#EEF6FF"/>
    ${pine(28, 90, 52, '#1F7A4D')}
    <rect x="25.5" y="89" width="5" height="6" fill="#6B4226"/>
    <path d="M28 38l-4 6h8zM20 62l-4 4h7zM36 62l4 4h-7z" fill="#fff" opacity=".85"/>
    <circle cx="84" cy="80" r="12.5" fill="#fff"/><circle cx="84" cy="61" r="9.5" fill="#fff"/><circle cx="84" cy="46.5" r="7.5" fill="#fff"/>
    <rect x="78" y="33" width="12" height="8" rx="1" fill="#22252B"/><rect x="75" y="40" width="18" height="2.6" rx="1.2" fill="#22252B"/>
    <circle cx="81.2" cy="45" r="1.1" fill="#22252B"/><circle cx="86.8" cy="45" r="1.1" fill="#22252B"/>
    <path d="M84 47.3l7.5 1.7-7.5 1.6z" fill="#FF8C42"/>
    <path d="M76.5 53.5h15v3.6h-15z" fill="#E63946"/><path d="M87 55.5v9h3.6v-9z" fill="#E63946"/>
    <circle cx="84" cy="60" r="1.2" fill="#22252B"/><circle cx="84" cy="65" r="1.2" fill="#22252B"/>
    <path d="M75.5 60l-10-6M92.5 60l10-7" stroke="#6B4226" stroke-width="1.8" stroke-linecap="round"/>
    ${[[8, 0, 7], [22, -2.2, 8], [40, -4.6, 6.5], [55, -1.2, 7.5], [66, -5.4, 9], [74, -3.1, 6], [96, -0.6, 8.5], [108, -4, 7], [114, -6.2, 6.8], [48, -6.8, 8.2], [14, -5.1, 9.4], [90, -7.3, 7.7]]
      .map(([x, d, dur], i) => `<circle class="ha-snow" cx="${x}" cy="-6" r="${1.1 + (i % 3) * 0.45}" fill="#fff" ${t(d, dur)}/>`).join('')}`),

  city: svg(`
    <circle cx="100" cy="18" r="8.5" fill="#FFF3C4"/><circle cx="103" cy="16" r="1.6" fill="#EADFA8"/><circle cx="98" cy="21" r="1.1" fill="#EADFA8"/>
    <circle class="ha-star" cx="20" cy="12" r="1" fill="#fff" ${t(0, 2.6)}/><circle class="ha-star" cx="62" cy="8" r="1.2" fill="#fff" ${t(-1, 3.2)}/>
    <circle class="ha-star" cx="80" cy="22" r=".9" fill="#fff" ${t(-2, 2.2)}/><circle class="ha-star" cx="44" cy="18" r=".8" fill="#fff" ${t(-0.5, 3.8)}/>
    <path class="ha-shoot" d="M18 8l12 5" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="6" y="50" width="22" height="52" fill="#2E2357"/>${windows(9, 55, 3, 5, 1)}
    <rect x="30" y="30" width="21" height="72" fill="#3A2C6E"/><path d="M40.5 30v-8" stroke="#3A2C6E" stroke-width="2"/>
    <circle class="ha-blink" cx="40.5" cy="21" r="1.7" fill="#FF5A5F"/>${windows(33, 35, 3, 8, 2)}
    <rect x="54" y="56" width="18" height="46" fill="#2A2050"/>${windows(57, 61, 2, 5, 3)}
    <rect x="74" y="40" width="25" height="62" fill="#35296A"/>${windows(77, 45, 4, 7, 4)}
    <rect x="101" y="62" width="19" height="40" fill="#281E4A"/>${windows(104, 67, 3, 4, 5)}`),

  sailboat: svg(`
    <circle cx="98" cy="22" r="10" fill="#FFE27A"/><circle cx="98" cy="22" r="16" fill="#FFE27A" opacity=".25"/>
    <g class="ha-gull"><path class="ha-flap" d="M16 24q4-4.5 8 0q4-4.5 8 0" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>
    <g class="ha-gull" ${t(-6, 14)}><path class="ha-flap" d="M40 14q3-3.5 6 0q3-3.5 6 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" ${t(-0.3)}/></g>
    ${wave(72, 3.5, '#7FD3F7', 'ha-wave')}
    <g class="ha-bob">
      <path d="M66 66V24" stroke="#5A3A22" stroke-width="2"/>
      <path d="M68 26v38h21z" fill="#fff"/><path d="M64 31v33H47z" fill="#F4F1EA"/>
      <path d="M66 23.5l9 3.2-9 3.2z" fill="#E63946"/>
      <path d="M43 66h46l-8 12.5H51z" fill="#8B4A2B"/><path d="M45 69.5h42" stroke="#C47A4A" stroke-width="1.6"/>
    </g>
    ${wave(80, 4, '#2F8FD8', 'ha-wave r')}`),

  fireflies: svg(`
    <circle cx="98" cy="18" r="9" fill="#F7F3C6"/><circle cx="98" cy="18" r="15" fill="#F7F3C6" opacity=".15"/>
    ${pine(18, 102, 58, '#0B231B')}${pine(40, 102, 44, '#0E2A20')}${pine(104, 102, 50, '#0B231B')}
    <path d="M0 92q40-10 80-2t40-2v12H0z" fill="#0A1C15"/>
    ${[[62, 40, 0, 2.2], [78, 58, -1.1, 2.8], [52, 66, -0.4, 3.1], [88, 36, -2, 2.5], [70, 74, -1.6, 2.4], [96, 62, -0.8, 3.4], [58, 28, -2.6, 2.9]]
      .map(([x, y, d, dur]) => `<g class="ha-wander" ${t(d * 2, 7 + dur)}><g class="ha-glow" ${t(d, dur)}><circle cx="${x}" cy="${y}" r="4.5" fill="#E9FF8A" opacity=".3"/><circle cx="${x}" cy="${y}" r="1.7" fill="#F4FFB8"/></g></g>`).join('')}`),

  rocket: svg(`
    ${[[10, 0, 1.6], [30, -0.5, 1.2], [52, -1.1, 1.8], [104, -0.3, 1.4], [114, -1.4, 1.1], [20, -1.7, 2], [96, -0.9, 1.7]]
      .map(([x, d, dur]) => `<rect class="ha-streak" x="${x}" y="-8" width="1.2" height="${5 + dur * 3}" rx=".6" fill="#fff" opacity=".7" ${t(d, dur)}/>`).join('')}
    <circle cx="22" cy="80" r="10" fill="#F4845F"/><ellipse cx="22" cy="80" rx="16" ry="4" fill="none" stroke="#FFD6A5" stroke-width="2" transform="rotate(-18 22 80)"/>
    <g class="ha-hover">
      <g class="ha-flame"><path d="M73.5 68q6.5 24 6.5 24t6.5-24z" fill="#FFB703"/><path d="M77 68q3 14 3 14t3-14z" fill="#FFF3B0"/></g>
      <path d="M69 51l-9.5 12.5v8.5l9.5-6.5z" fill="#FF5A5F"/><path d="M91 51l9.5 12.5v8.5l-9.5-6.5z" fill="#FF5A5F"/>
      <path d="M80 16c8.5 8 11.5 20.5 11.5 33v16h-23V49c0-12.5 3-25 11.5-33z" fill="#F1F3F8"/>
      <path d="M80 16c4.2 4 6.8 8.5 8.3 13.5H71.7c1.5-5 4.1-9.5 8.3-13.5z" fill="#FF5A5F"/>
      <circle cx="80" cy="42" r="6" fill="#4CC9F0" stroke="#9AA3B5" stroke-width="2.2"/>
      <rect x="72.5" y="64" width="15" height="4.5" rx="1.6" fill="#9AA3B5"/>
    </g>`),
});
