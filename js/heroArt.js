// Desene pentru fundalurile ilustrate ale cardului principal (desenate în cod, ca să meargă offline).
// Fiecare desen stă în dreapta-sus a cardului; fundalul colorat e în style.css (.hero-bg-<nume>).

const svg = body => `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMid meet" aria-hidden="true">${body}</svg>`;

// Peisaje (cu sol, apă sau orizont jos): pe cardul de sus partea din stânga se estompează, ca solul să nu se oprească brusc.
export const HERO_SCENES = new Set(['mountains', 'beach', 'aquarium', 'winter', 'city', 'sailboat', 'fireflies', 'autumn', 'aurora2',
  'garden', 'fox', 'lighthouse', 'bike', 'summer', 'football']);

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

/* ---------- Fundaluri animate noi pentru Acasă ---------- */

const leaf = (x, y, fill, d, dur) =>
  `<g class="ha-leaf" ${t(d, dur)}><path d="M${x} ${y}q4-5 9 0q-4 5-9 0z" fill="${fill}"/><path d="M${x} ${y}h9" stroke="#7A3E1D" stroke-width=".6"/></g>`;
const flower = (x, base, hgt, petal, d) => `<g class="ha-sway" ${t(d, 3.4)}>
  <path d="M${x} ${base}V${base - hgt}" stroke="#2F9E44" stroke-width="2.4"/><path d="M${x} ${base - hgt / 2}q7-5 10 1q-6 3-10-1z" fill="#3CB55A"/>
  <g fill="${petal}"><circle cx="${x}" cy="${base - hgt - 7}" r="5"/><circle cx="${x + 7}" cy="${base - hgt}" r="5"/><circle cx="${x}" cy="${base - hgt + 7}" r="5"/><circle cx="${x - 7}" cy="${base - hgt}" r="5"/></g>
  <circle cx="${x}" cy="${base - hgt}" r="4.2" fill="#FFD43B"/></g>`;

Object.assign(HERO_ART, {
  autumn: svg(`
    <path d="M0 94q30-6 60-2t60-3v11H0z" fill="#7A3E1D" opacity=".45"/>
    <path d="M82 96V62M82 74l-10-9M82 70l9-8" stroke="#5A2E14" stroke-width="5" stroke-linecap="round" fill="none"/>
    <circle cx="70" cy="46" r="16" fill="#E2552D"/><circle cx="92" cy="42" r="18" fill="#F08A24"/><circle cx="82" cy="28" r="15" fill="#F6B336"/>
    <circle cx="101" cy="58" r="11" fill="#D9452B"/><circle cx="64" cy="60" r="10" fill="#F2A03D"/>
    ${leaf(70, 56, '#E2552D', 0, 6)}${leaf(96, 60, '#F6B336', -2, 7)}${leaf(84, 50, '#D9452B', -4, 6.5)}${leaf(60, 50, '#F08A24', -1.2, 7.5)}${leaf(104, 48, '#F2A03D', -5.4, 6.8)}`),

  coffee: svg(`
    <path class="ha-steam" d="M62 44c-4-6 4-10 0-16s4-10 0-14" stroke="#FFF" stroke-width="2.6" fill="none" stroke-linecap="round" ${t(0)}/>
    <path class="ha-steam" d="M73 42c-4-6 4-10 0-16s4-10 0-14" stroke="#FFF" stroke-width="2.6" fill="none" stroke-linecap="round" ${t(-1.1)}/>
    <path class="ha-steam" d="M84 44c-4-6 4-10 0-16s4-10 0-14" stroke="#FFF" stroke-width="2.6" fill="none" stroke-linecap="round" ${t(-2.2)}/>
    <ellipse cx="73" cy="90" rx="36" ry="7" fill="#F4E6D8"/><ellipse cx="73" cy="89" rx="24" ry="4" fill="#E2CDB8"/>
    <path d="M97 58c11 0 12 15 0 16" stroke="#FFF7EE" stroke-width="5" fill="none"/>
    <path d="M49 52h48v18c0 12-10 20-24 20s-24-8-24-20z" fill="#FFF7EE"/>
    <ellipse cx="73" cy="52" rx="24" ry="5" fill="#7B4A2A"/>
    <path d="M73 55.5c-3-3.4-7.5-.2-4.2 3.2L73 62l4.2-3.3c3.3-3.4-1.2-6.6-4.2-3.2z" fill="#E8C9A6"/>`),

  kite: svg(`
    <g class="ha-cloud"><ellipse cx="22" cy="72" rx="13" ry="5" fill="#FFF"/><circle cx="18" cy="68" r="6" fill="#FFF"/><circle cx="26" cy="66.5" r="7" fill="#FFF"/></g>
    <g class="ha-cloud" ${t(-3, 12)}><ellipse cx="50" cy="22" rx="10" ry="4" fill="#FFF" opacity=".85"/><circle cx="48" cy="19" r="5" fill="#FFF" opacity=".85"/></g>
    <g class="ha-kite">
      <path d="M86 52Q66 80 30 100" stroke="#FFF" stroke-width="1" opacity=".8" fill="none"/>
      <path d="M86 12l15 19-15 21-15-21z" fill="#FF5D6C"/><path d="M86 12l15 19H86z" fill="#FFD166"/><path d="M71 31h15v21z" fill="#4ECDC4"/>
      <path d="M86 12v40M71 31h30" stroke="#FFF" stroke-width="1.2" opacity=".85"/>
      <path class="ha-tail" d="M86 52c-5 8 5 12 0 20s5 12 0 18" stroke="#FFF" stroke-width="1.4" fill="none"/>
      <path d="M82 62l4 2-4 2zM90 72l-4 2 4 2zM82 82l4 2-4 2z" fill="#FF5D6C"/>
    </g>`),

  rain: svg(`
    ${[[52, 0, 0.9], [60, -0.3, 1.1], [68, -0.6, 1], [76, -0.15, 1.2], [84, -0.45, 0.95], [92, -0.75, 1.05], [100, -0.25, 1.15], [56, -0.55, 1.25], [88, -0.9, 0.9], [72, -1, 1.1]]
      .map(([x, d, dur]) => `<rect class="ha-rain" x="${x}" y="30" width="1.5" height="7" rx=".75" fill="#D6E6FF" ${t(d, dur)}/>`).join('')}
    <g fill="#D9DFEA"><ellipse cx="76" cy="26" rx="28" ry="10"/><circle cx="64" cy="20" r="10"/><circle cx="82" cy="15" r="13"/><circle cx="96" cy="22" r="9"/></g>
    <path d="M58 74a26 26 0 0 1 52 0z" fill="#FF5A5F"/>
    <path d="M58 74q6.5-5 13 0q6.5-5 13 0q6.5-5 13 0q6.5-5 13 0" fill="#E2444A"/>
    <path d="M84 48v2M84 74v18q0 5-5 5t-5-5" stroke="#3A2A2A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse class="ha-ripple" cx="100" cy="96" rx="9" ry="2.2" fill="none" stroke="#D6E6FF" stroke-width="1"/>
    <ellipse class="ha-ripple" cx="62" cy="97" rx="8" ry="2" fill="none" stroke="#D6E6FF" stroke-width="1" ${t(-0.8)}/>`),

  aurora2: svg(`
    <circle class="ha-star" cx="18" cy="10" r=".9" fill="#FFF" ${t(0, 2.6)}/><circle class="ha-star" cx="58" cy="8" r="1.1" fill="#FFF" ${t(-1, 3.1)}/>
    <circle class="ha-star" cx="104" cy="12" r="1" fill="#FFF" ${t(-2, 2.4)}/><circle class="ha-star" cx="38" cy="22" r=".8" fill="#FFF" ${t(-0.6, 3.6)}/>
    <path class="ha-aurora" d="M6 52C26 22 48 60 68 32S108 42 122 18" stroke="#4BF0A6" stroke-width="11" stroke-linecap="round" fill="none"/>
    <path class="ha-aurora" d="M14 62C34 36 56 66 78 44S110 50 122 34" stroke="#A78BFA" stroke-width="8" stroke-linecap="round" fill="none" ${t(-2.5, 7)}/>
    <path d="M0 100 30 66l14 14 22-26 26 30 14-12 14 28z" fill="#06121F"/>
    ${pine(20, 100, 20, '#03080F')}${pine(110, 100, 16, '#03080F')}`),

  puppy: svg(`
    <path class="ha-heart" d="M40 40c-3-4-9-1-6 4l6 5 6-5c3-5-3-8-6-4z" fill="#FF7A9A"/>
    <path class="ha-heart" d="M30 56c-2-3-6-1-4 3l4 3 4-3c2-4-2-6-4-3z" fill="#FF9AB3" ${t(-1.6)}/>
    <path class="ha-wag" d="M96 84q15-5 13-24" stroke="#C98A4B" stroke-width="6" fill="none" stroke-linecap="round"/>
    <ellipse cx="78" cy="80" rx="20" ry="16" fill="#C98A4B"/>
    <path d="M60 38c-9 4-9 19-2 23 5-7 7-15 2-23zM96 38c9 4 9 19 2 23-5-7-7-15-2-23z" fill="#8A5A2E"/>
    <circle cx="78" cy="49" r="18" fill="#D99A5B"/>
    <ellipse cx="78" cy="58" rx="9.5" ry="7.5" fill="#F3D2A6"/>
    <ellipse cx="78" cy="54" rx="3.6" ry="2.7" fill="#2A1A10"/>
    <path class="ha-pant" d="M75.5 61q2.5 8 5 0z" fill="#FF7A8A"/>
    <circle cx="71" cy="46" r="2.7" fill="#2A1A10"/><circle cx="85" cy="46" r="2.7" fill="#2A1A10"/>
    <circle cx="71.9" cy="45" r=".9" fill="#FFF"/><circle cx="85.9" cy="45" r=".9" fill="#FFF"/>
    <ellipse cx="70" cy="94" rx="6.5" ry="3.6" fill="#E8B07A"/><ellipse cx="86" cy="94" rx="6.5" ry="3.6" fill="#E8B07A"/>`),

  garden: svg(`
    <circle cx="104" cy="16" r="8" fill="#FFE27A"/><circle cx="104" cy="16" r="13" fill="#FFE27A" opacity=".25"/>
    ${flower(70, 100, 30, '#FF6B9A', 0)}${flower(92, 100, 40, '#B07CFF', -1.3)}${flower(110, 100, 22, '#FF9F43', -0.7)}
    <path d="M0 100V93q10-6 20 0t20 0 20 0 20 0 20 0 20 0V100z" fill="#5BBF5A"/>
    <g class="ha-fly"><g class="ha-wings">
      <path d="M40 30c-9-9-15 2-7 6-7 4 0 13 7 4z" fill="#A66BFF"/><path d="M40 30c9-9 15 2 7 6 7 4 0 13-7 4z" fill="#C49BFF"/></g>
      <path d="M40 27v13" stroke="#3B2A55" stroke-width="1.7" stroke-linecap="round"/></g>`),

  xmas: svg(`
    ${[[10, 0, 7], [26, -2.4, 8], [46, -4.8, 6.6], [58, -1.4, 7.6], [112, -3.6, 8.4], [36, -5.6, 9]]
      .map(([x, d, dur], i) => `<circle class="ha-snow" cx="${x}" cy="-6" r="${1.1 + (i % 3) * 0.4}" fill="#FFF" ${t(d, dur)}/>`).join('')}
    ${pine(86, 96, 72, '#1E8A4C')}
    <rect x="83" y="94" width="6" height="5" fill="#6B4226"/>
    <path d="M60 50q26 10 50 2M64 68q22 9 44 1M58 84q28 8 56 0" stroke="#FFD166" stroke-width="1" fill="none" opacity=".7"/>
    ${[[72, 52, '#FF5D6C'], [86, 56, '#4ECDC4'], [100, 51, '#FFD166'], [68, 71, '#C49BFF'], [82, 73, '#FF5D6C'], [96, 72, '#FFD166'], [106, 69, '#4ECDC4'], [64, 86, '#FFD166'], [78, 88, '#4ECDC4'], [94, 88, '#C49BFF'], [108, 86, '#FF5D6C'], [80, 38, '#FFD166'], [92, 40, '#FF5D6C']]
      .map(([x, y, c], i) => `<circle class="ha-win" cx="${x}" cy="${y}" r="2.2" fill="${c}" ${t(-i * 0.37, 1.6 + (i % 4) * 0.5)}/>`).join('')}
    <path class="ha-glow" d="M86 14l2.6 5.4 5.9.7-4.4 4 1.2 5.8-5.3-3-5.3 3 1.2-5.8-4.4-4 5.9-.7z" fill="#FFD43B"/>
    <rect x="50" y="84" width="14" height="12" rx="1.5" fill="#E2444A"/><path d="M57 84v12M50 89h14" stroke="#FFD166" stroke-width="2"/>
    <rect x="104" y="86" width="12" height="10" rx="1.5" fill="#4F7BE8"/><path d="M110 86v10M104 90.5h12" stroke="#FFF" stroke-width="1.8"/>`),
});

/* ---------- Fundaluri pentru cardul de la Investiții (separat de Acasă) ---------- */

const coinStack = (x, n, top = 94) => Array.from({ length: n }, (_, i) =>
  `<ellipse cx="${x}" cy="${top - i * 6 + 2}" rx="11" ry="4" fill="#C9902A"/><ellipse cx="${x}" cy="${top - i * 6}" rx="11" ry="4" fill="#FFD166"/>`).join('');

export const INV_ART = {
  coins: svg(`
    ${coinStack(62, 3)}${coinStack(86, 5)}${coinStack(108, 8)}
    <g class="ha-coin"><ellipse cx="108" cy="48" rx="11" ry="4" fill="#C9902A"/><ellipse cx="108" cy="46" rx="11" ry="4" fill="#FFE08A"/></g>
    <path class="ha-star" d="M70 40l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#FFF" ${t(0, 2.2)}/>
    <path class="ha-star" d="M94 26l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" fill="#FFF" ${t(-1.1, 2.6)}/>`),

  tree: svg(`
    <path d="M70 84h30l-4 14H74z" fill="#C2703D"/><path d="M68 82h34v5H68z" fill="#D9844E"/>
    <path d="M85 84V56M85 66l-8-6M85 62l7-6" stroke="#6B4226" stroke-width="4.5" stroke-linecap="round" fill="none"/>
    <circle cx="74" cy="44" r="14" fill="#2FA866"/><circle cx="96" cy="42" r="15" fill="#3CC17A"/><circle cx="85" cy="28" r="14" fill="#4FD38B"/>
    ${[[72, 40], [80, 26], [92, 32], [100, 46], [86, 46], [76, 52], [96, 22]].map(([x, y], i) =>
      `<g class="ha-win" ${t(-i * 0.5, 2.4 + (i % 3) * 0.6)}><circle cx="${x}" cy="${y}" r="4" fill="#FFD166"/><circle cx="${x}" cy="${y}" r="2.2" fill="#FFE9A8"/></g>`).join('')}
    <g class="ha-leaf" ${t(-1, 5)}><circle cx="98" cy="54" r="3.6" fill="#FFD166"/></g>`),

  growth: svg(`
    ${[[60, 22], [72, 34], [84, 30], [96, 48], [108, 62]].map(([x, hh]) => `<rect x="${x - 4}" y="${96 - hh}" width="8" height="${hh}" rx="2" fill="#FFF" opacity=".14"/>`).join('')}
    <path class="ha-draw" d="M52 84 64 72 74 76 86 58 96 62 112 30" stroke="#7CF0B8" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="ha-arrow" d="M103 28l11-2-2 11z" fill="#7CF0B8"/>
    <circle class="ha-glow" cx="112" cy="30" r="7" fill="#7CF0B8" opacity=".35"/>`),

  candles: svg(`
    <path d="M50 70 66 60 80 64 94 46 110 36" stroke="#FFF" stroke-width="1.2" stroke-dasharray="3 3" fill="none" opacity=".55"/>
    ${[[56, 62, 22, '#FF6B6B'], [68, 54, 26, '#4ADE80'], [80, 58, 18, '#FF6B6B'], [92, 42, 30, '#4ADE80'], [104, 34, 28, '#4ADE80']].map(([x, y, hh, c], i) =>
      `<g class="ha-candle" ${t(-i * 0.4, 2.6 + (i % 2) * 0.6)}><path d="M${x} ${y - 6}v${hh + 12}" stroke="${c}" stroke-width="1.4"/><rect x="${x - 4.5}" y="${y}" width="9" height="${hh}" rx="1.5" fill="${c}"/></g>`).join('')}`),

  vault: svg(`
    <rect x="56" y="30" width="56" height="60" rx="8" fill="#9AA6B8"/><rect x="60" y="34" width="48" height="52" rx="6" fill="#C5CEDB"/>
    <circle cx="84" cy="60" r="17" fill="#8C97AA"/><circle cx="84" cy="60" r="13" fill="#DCE3EC"/>
    <g class="ha-spin"><circle cx="84" cy="60" r="13" fill="none"/><path d="M84 49v22M73 60h22M76.5 52.5l15 15M91.5 52.5l-15 15" stroke="#6B768A" stroke-width="2.4" stroke-linecap="round"/></g>
    <circle cx="84" cy="60" r="4" fill="#4A5468"/>
    <rect x="58" y="90" width="8" height="5" rx="1" fill="#6B768A"/><rect x="102" y="90" width="8" height="5" rx="1" fill="#6B768A"/>
    <path d="M30 92l6-12h16l6 12z" fill="#FFD166"/><path d="M36 80h16l2 4H34z" fill="#FFE9A8"/>
    <path class="ha-star" d="M46 70l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" fill="#FFF" ${t(0, 2.4)}/>`),

  globe: svg(`
    <defs><clipPath id="inv-globe-clip"><circle cx="80" cy="52" r="22"/></clipPath></defs>
    <circle cx="80" cy="52" r="22" fill="#2E86DE"/>
    <g clip-path="url(#inv-globe-clip)"><g class="ha-lands">
      <path d="M48 38q8-6 14 0t4 12-10 4-8-16zM70 58q10-4 14 4t-6 12-8-16zM86 32q8-4 12 2t-4 8-8-10zM96 38q8-6 14 0t4 12-10 4-8-16zM118 58q10-4 14 4t-6 12-8-16zM134 32q8-4 12 2t-4 8-8-10z" fill="#4ADE80"/>
    </g></g>
    <circle cx="80" cy="52" r="22" fill="none" stroke="#FFF" stroke-width="1" opacity=".5"/>
    <ellipse cx="80" cy="52" rx="9" ry="22" fill="none" stroke="#FFF" stroke-width=".8" opacity=".35"/>
    <path d="M58 52h44M61 41h38M61 63h38" stroke="#FFF" stroke-width=".8" opacity=".35"/>
    <circle cx="80" cy="52" r="31" fill="none" stroke="#FFF" stroke-width=".8" stroke-dasharray="2 4" opacity=".45"/>
    <g class="ha-orbit"><circle cx="80" cy="52" r="31" fill="none"/>
      <circle cx="111" cy="52" r="4.6" fill="#FFD166"/><circle cx="111" cy="52" r="2.4" fill="#FFE9A8"/></g>`),
};

/* ---------- Și mai multe fundaluri animate pentru Acasă ---------- */

const note = (x, y, d, dur) => `<g class="ha-note" ${t(d, dur)}><path d="M${x + 2} ${y}v-13l9-3v13" stroke="#FFF" stroke-width="1.8" fill="none"/>
  <ellipse cx="${x}" cy="${y}" rx="2.8" ry="2.2" fill="#FFF"/><ellipse cx="${x + 9}" cy="${y - 3}" rx="2.8" ry="2.2" fill="#FFF"/></g>`;

Object.assign(HERO_ART, {
  night: svg(`
    ${[[14, 12, 0, 2.6], [40, 8, -1, 3.2], [62, 20, -2, 2.2], [24, 30, -0.5, 3.6], [112, 14, -1.6, 2.8], [52, 40, -2.4, 3]]
      .map(([x, y, d, dur]) => `<circle class="ha-star" cx="${x}" cy="${y}" r="1" fill="#FFF" ${t(d, dur)}/>`).join('')}
    <circle class="ha-halo" cx="88" cy="36" r="25" fill="#FFF4CC" opacity=".16"/>
    <circle cx="88" cy="36" r="16" fill="#FFF4CC"/><circle cx="83" cy="31" r="3" fill="#EADFA8"/><circle cx="93" cy="41" r="2.2" fill="#EADFA8"/><circle cx="92" cy="29" r="1.6" fill="#EADFA8"/>
    <g class="ha-cloud" ${t(0, 10)}><ellipse cx="74" cy="56" rx="18" ry="6" fill="#B8C2EE" opacity=".7"/><circle cx="68" cy="52" r="7" fill="#B8C2EE" opacity=".7"/><circle cx="78" cy="50" r="8" fill="#B8C2EE" opacity=".7"/></g>
    <g class="ha-cloud" ${t(-5, 13)}><ellipse cx="106" cy="70" rx="14" ry="5" fill="#9AA6DC" opacity=".6"/><circle cx="102" cy="67" r="6" fill="#9AA6DC" opacity=".6"/></g>`),

  fox: svg(`
    <path d="M0 96q40-8 80-2t40-2v8H0z" fill="#2C5A34" opacity=".55"/>
    <g class="ha-foxtail"><path d="M96 92c15 2 23-9 19-23-2 8-8 12-17 12z" fill="#F07B2B"/><path d="M113 71c4 6 4 12 2 16-2-4-4-7-7-9z" fill="#FFF3E6"/></g>
    <path d="M70 96c-4-18 2-34 14-38 12 4 18 20 14 38z" fill="#F07B2B"/>
    <path d="M84 62c-6 6-8 20-4 34h8c4-14 2-28-4-34z" fill="#FFF3E6"/>
    <path d="M70 46l-6-17 14 9h12l14-9-6 17c0 10-8 16-14 16s-14-6-14-16z" fill="#F07B2B"/>
    <path d="M66 32l6 9-5 1zM102 32l-6 9 5 1z" fill="#3A2216"/>
    <path d="M71 49c4 8 8 11 13 11s9-3 13-11c-4 2-8 3-13 3s-9-1-13-3z" fill="#FFF3E6"/>
    <circle cx="84" cy="57" r="2.2" fill="#2A1A10"/>
    <g class="ha-eyes"><ellipse cx="77" cy="47" rx="1.9" ry="2.5" fill="#2A1A10"/><ellipse cx="91" cy="47" rx="1.9" ry="2.5" fill="#2A1A10"/></g>`),

  penguin: svg(`
    ${[[30, 0, 7], [50, -2.5, 8], [108, -4.2, 7.5], [16, -5.5, 9], [64, -1.4, 8.6]]
      .map(([x, d, dur], i) => `<circle class="ha-snow" cx="${x}" cy="-6" r="${1 + (i % 2) * 0.5}" fill="#FFF" ${t(d, dur)}/>`).join('')}
    <path d="M40 94q42-7 84 0v6H40z" fill="#F4FAFF"/><path d="M52 95h60" stroke="#CFE4F7" stroke-width="1.4"/>
    <g class="ha-waddle">
      <path d="M65 66c-7 8-7 17-2 21 2-6 4-13 4-21zM99 66c7 8 7 17 2 21-2-6-4-13-4-21z" fill="#1F2A3A"/>
      <ellipse cx="82" cy="68" rx="17" ry="24" fill="#1F2A3A"/>
      <ellipse cx="82" cy="73" rx="11.5" ry="17" fill="#FFF"/>
      <circle cx="77" cy="54" r="2.6" fill="#FFF"/><circle cx="87" cy="54" r="2.6" fill="#FFF"/>
      <circle cx="77.5" cy="54.4" r="1.3" fill="#111"/><circle cx="86.5" cy="54.4" r="1.3" fill="#111"/>
      <path d="M79 59h6l-3 4z" fill="#FFB020"/>
      <path d="M70 62q12 5 24 0v4q-12 5-24 0z" fill="#E2444A"/>
      <ellipse cx="76" cy="92" rx="5.5" ry="2.4" fill="#FFB020"/><ellipse cx="88" cy="92" rx="5.5" ry="2.4" fill="#FFB020"/>
    </g>`),

  plane: svg(`
    <g class="ha-drift2"><ellipse cx="40" cy="74" rx="16" ry="6" fill="#FFF" opacity=".9"/><circle cx="34" cy="69" r="7" fill="#FFF" opacity=".9"/><circle cx="44" cy="68" r="8" fill="#FFF" opacity=".9"/></g>
    <g class="ha-drift2" ${t(-3.5, 8)}><ellipse cx="96" cy="86" rx="12" ry="4.5" fill="#FFF" opacity=".75"/><circle cx="92" cy="83" r="5.5" fill="#FFF" opacity=".75"/></g>
    <path class="ha-trail" d="M58 52H4" stroke="#FFF" stroke-width="2.2" stroke-dasharray="9 7" stroke-linecap="round" opacity=".75"/>
    <g class="ha-hover">
      <path d="M60 46h44c6 0 10 3 10 6s-4 6-10 6H64l-8-6z" fill="#FFF"/>
      <path d="M80 52l-11 18h8l15-18z" fill="#D9E6F5"/><path d="M82 46l-7-10h7l11 10z" fill="#D9E6F5"/>
      <path d="M60 46l-6-12h6l9 12z" fill="#E2444A"/>
      <path d="M105 48h4c2 0 4 2 4 4h-8z" fill="#7FB6F2"/>
      <circle cx="90" cy="51" r="1.4" fill="#7FB6F2"/><circle cx="85" cy="51" r="1.4" fill="#7FB6F2"/><circle cx="80" cy="51" r="1.4" fill="#7FB6F2"/><circle cx="75" cy="51" r="1.4" fill="#7FB6F2"/>
    </g>`),

  lighthouse: svg(`
    <defs><linearGradient id="lh-beam" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#FFF3B0" stop-opacity=".75"/><stop offset="1" stop-color="#FFF3B0" stop-opacity="0"/></linearGradient></defs>
    <circle class="ha-star" cx="20" cy="12" r="1" fill="#FFF" ${t(0, 2.8)}/><circle class="ha-star" cx="50" cy="20" r=".9" fill="#FFF" ${t(-1.4, 3.4)}/>
    <path class="ha-beam" d="M86 38 18 18v40z" fill="url(#lh-beam)"/>
    ${wave(86, 3, '#2A5C93', 'ha-wave')}
    <path d="M78 88l4-46h8l4 46z" fill="#F4F4F4"/>
    <path d="M79.5 76h13l.8 8H78.7zM80.6 60h10.8l.7 8H79.9z" fill="#E2444A"/>
    <rect x="80" y="34" width="12" height="8" rx="1" fill="#FFE27A"/><path d="M78 34l8-7 8 7z" fill="#E2444A"/>
    <path d="M64 98q6-12 18-10t16-2 16 12z" fill="#262A35"/>
    ${wave(93, 3.5, '#1D4677', 'ha-wave r')}`),

  panda: svg(`
    <g class="ha-sway" ${t(0, 3.6)}><path d="M28 100V30" stroke="#5FAE55" stroke-width="5"/><path d="M28 52l-10-6M28 40l10-8" stroke="#5FAE55" stroke-width="2.4" stroke-linecap="round"/><path d="M24 70h8M24 50h8" stroke="#3E8E3A" stroke-width="1.6"/></g>
    <g class="ha-sway" ${t(-1.5, 4.2)}><path d="M44 100V48" stroke="#73C064" stroke-width="4"/><path d="M44 62l9-7" stroke="#73C064" stroke-width="2.2" stroke-linecap="round"/><path d="M41 78h6" stroke="#3E8E3A" stroke-width="1.4"/></g>
    <ellipse cx="82" cy="82" rx="22" ry="17" fill="#FFF"/>
    <ellipse cx="70" cy="96" rx="8.5" ry="5" fill="#222"/><ellipse cx="94" cy="96" rx="8.5" ry="5" fill="#222"/>
    <path d="M58 92 98 48" stroke="#7CC36B" stroke-width="3.6" stroke-linecap="round"/><path d="M96 50l8-4M92 55l9 1" stroke="#5FAE55" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="70" cy="78" rx="6" ry="10" fill="#222" transform="rotate(35 70 78)"/><ellipse cx="94" cy="76" rx="6" ry="10" fill="#222" transform="rotate(-35 94 76)"/>
    <circle cx="68" cy="38" r="6.5" fill="#222"/><circle cx="96" cy="38" r="6.5" fill="#222"/>
    <circle cx="82" cy="52" r="18" fill="#FFF"/>
    <ellipse cx="75" cy="52" rx="5" ry="6.5" fill="#222" transform="rotate(-20 75 52)"/><ellipse cx="89" cy="52" rx="5" ry="6.5" fill="#222" transform="rotate(20 89 52)"/>
    <g class="ha-eyes"><circle cx="75.6" cy="51" r="1.6" fill="#FFF"/><circle cx="88.4" cy="51" r="1.6" fill="#FFF"/></g>
    <ellipse cx="82" cy="59" rx="2.6" ry="1.8" fill="#222"/>
    <path class="ha-chew" d="M79 63q3 3 6 0" stroke="#222" stroke-width="1.4" fill="none" stroke-linecap="round"/>`),

  bike: svg(`
    <circle cx="100" cy="24" r="11" fill="#FFF1C2"/><circle cx="100" cy="24" r="17" fill="#FFF1C2" opacity=".25"/>
    <path d="M0 88q20-14 40-6t40-8 40 4v22H0z" fill="#E58B3A" opacity=".55"/>
    <path d="M0 95h120" stroke="#5A4636" stroke-width="3"/>
    <path class="ha-road" d="M0 99h120" stroke="#FFF" stroke-width="1.6" stroke-dasharray="8 8"/>
    <g class="ha-hover">
      <circle cx="64" cy="82" r="12" fill="none" stroke="#2E2A33" stroke-width="2.6"/><circle cx="102" cy="82" r="12" fill="none" stroke="#2E2A33" stroke-width="2.6"/>
      <g class="ha-wheel"><circle cx="64" cy="82" r="12" fill="none"/><path d="M64 70v24M52 82h24M55.5 73.5l17 17M72.5 73.5l-17 17" stroke="#2E2A33" stroke-width=".9"/></g>
      <g class="ha-wheel"><circle cx="102" cy="82" r="12" fill="none"/><path d="M102 70v24M90 82h24M93.5 73.5l17 17M110.5 73.5l-17 17" stroke="#2E2A33" stroke-width=".9"/></g>
      <path d="M64 82l14-20h18l6 20M78 62l4 20h-4M96 62l-3-9" stroke="#E2444A" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M74 60h9" stroke="#2E2A33" stroke-width="3" stroke-linecap="round"/><path d="M89 52h8" stroke="#2E2A33" stroke-width="2.4" stroke-linecap="round"/>
    </g>`),

  music: svg(`
    ${note(30, 64, 0, 4.2)}${note(46, 76, -1.4, 4.6)}${note(22, 82, -2.8, 4)}
    <path d="M62 66a22 22 0 0 1 44 0" stroke="#1F1A2E" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect x="55" y="60" width="13" height="22" rx="6" fill="#1F1A2E"/><rect x="100" y="60" width="13" height="22" rx="6" fill="#1F1A2E"/>
    <rect x="65" y="63" width="5" height="16" rx="2.5" fill="#FF6BB5"/><rect x="98" y="63" width="5" height="16" rx="2.5" fill="#FF6BB5"/>
    ${[66, 72, 78, 84, 90, 96, 102].map((x, i) => `<rect class="ha-eq" x="${x - 2}" y="84" width="4" height="12" rx="2" fill="#FFF" opacity=".85" ${t(-i * 0.17, 0.8 + (i % 3) * 0.25)}/>`).join('')}`),
});

/* ---------- Și mai multe fundaluri pentru Investiții ---------- */

Object.assign(INV_ART, {
  bull: svg(`
    <path d="M30 84l12-12 8 6 14-16" stroke="#7CF0B8" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
    <path d="M58 54 63 52 61 57z" fill="#7CF0B8" opacity=".7"/>
    <path d="M70 42c-10-2-16-10-14-18 4 6 10 10 16 10zM98 42c10-2 16-10 14-18-4 6-10 10-16 10z" fill="#F4E6D0"/>
    <ellipse cx="66" cy="48" rx="7" ry="3.2" fill="#6E4630" transform="rotate(-20 66 48)"/><ellipse cx="102" cy="48" rx="7" ry="3.2" fill="#6E4630" transform="rotate(20 102 48)"/>
    <path d="M70 44c0-8 6-12 14-12s14 4 14 12v10c0 10-6 18-14 18s-14-8-14-18z" fill="#8A5A3C"/>
    <ellipse cx="84" cy="64" rx="10.5" ry="7.5" fill="#C49A7A"/>
    <circle cx="80" cy="64" r="1.7" fill="#3A2216"/><circle cx="88" cy="64" r="1.7" fill="#3A2216"/>
    <circle cx="84" cy="70" r="3" fill="none" stroke="#FFD166" stroke-width="1.5"/>
    <circle cx="77" cy="50" r="2.1" fill="#1A1A1A"/><circle cx="91" cy="50" r="2.1" fill="#1A1A1A"/>
    <g class="ha-puff-l"><circle cx="72" cy="71" r="3.2" fill="#FFF"/><circle cx="68" cy="73" r="2.3" fill="#FFF"/></g>
    <g class="ha-puff-r"><circle cx="96" cy="71" r="3.2" fill="#FFF"/><circle cx="100" cy="73" r="2.3" fill="#FFF"/></g>`),

  diamond: svg(`
    <defs><clipPath id="inv-dia-clip"><path d="M68 40h32l10 12-26 34-26-34z"/></clipPath></defs>
    <path d="M68 40h32l10 12H58z" fill="#A8ECFF"/><path d="M58 52h52L84 86z" fill="#5CCBF0"/>
    <path d="M68 40l-4 12 20 34 20-34-4-12M76 40l-4 12 12 34 12-34-4-12M58 52h52" stroke="#FFF" stroke-width=".8" opacity=".55" fill="none"/>
    <g clip-path="url(#inv-dia-clip)"><g transform="rotate(20 84 62)"><rect class="ha-shine" x="40" y="20" width="9" height="90" fill="#FFF" opacity=".55"/></g></g>
    <path class="ha-star" d="M52 34l1.5 3.6 3.6 1.5-3.6 1.5-1.5 3.6-1.5-3.6-3.6-1.5 3.6-1.5z" fill="#FFF" ${t(0, 2.2)}/>
    <path class="ha-star" d="M112 70l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" fill="#FFF" ${t(-1.2, 2.6)}/>
    <path class="ha-star" d="M104 30l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#FFF" ${t(-0.6, 3)}/>`),

  goldbars: svg(`
    <defs><clipPath id="inv-gold-clip"><path d="M50 94l5-14h22l5 14zM84 94l5-14h22l5 14zM67 80l5-14h22l5 14zM60 66l4-12h18l4 12zM88 66l4-12h18l4 12z"/></clipPath></defs>
    <g fill="#E0A82E"><path d="M50 94l5-14h22l5 14zM84 94l5-14h22l5 14zM67 80l5-14h22l5 14z"/></g>
    <g fill="#FFD166"><path d="M55 80h22l-2-4H57zM89 80h22l-2-4H91zM72 66h22l-2-4H74z"/></g>
    <g fill="#E0A82E"><path d="M60 66l4-12h18l4 12zM88 66l4-12h18l4 12z" opacity=".9"/></g>
    <g fill="#FFE08A"><path d="M64 54h18l-1.6-3.4H65.6zM92 54h18l-1.6-3.4H93.6z"/></g>
    <g clip-path="url(#inv-gold-clip)"><g transform="rotate(20 84 74)"><rect class="ha-shine" x="40" y="30" width="8" height="90" fill="#FFF" opacity=".6"/></g></g>
    <path class="ha-star" d="M114 46l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z" fill="#FFF" ${t(0, 2.4)}/>
    <path class="ha-star" d="M50 60l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#FFF" ${t(-1.3, 2.8)}/>`),

  sprout: svg(`
    ${coinStack(72, 3)}${coinStack(96, 2)}
    <ellipse cx="84" cy="80" rx="22" ry="5" fill="#5A3A22"/>
    <g class="ha-grow"><path d="M84 80V50" stroke="#4ADE80" stroke-width="3" stroke-linecap="round"/>
      <path class="ha-pop" d="M84 60c-12 0-18-8-16-16 10 0 16 6 16 16z" fill="#4ADE80"/>
      <path class="ha-pop" d="M84 54c12-2 18-12 14-20-10 2-15 10-14 20z" fill="#7CF0B8" ${t(-0.3)}/></g>
    <path class="ha-star" d="M108 36l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" fill="#FFF" ${t(0, 2.6)}/>`),

  compass: svg(`
    <circle cx="84" cy="54" r="30" fill="#E9EEF5"/><circle cx="84" cy="54" r="30" fill="none" stroke="#B9C3D2" stroke-width="3"/>
    <circle cx="84" cy="54" r="24" fill="#FFF"/>
    <path d="M84 32v5M84 71v5M62 54h5M101 54h5" stroke="#5B6678" stroke-width="2" stroke-linecap="round"/>
    <text x="84" y="44" text-anchor="middle" font-size="7" font-weight="700" fill="#E2444A" font-family="sans-serif">N</text>
    <g class="ha-needle"><circle cx="84" cy="54" r="24" fill="none"/><path d="M84 36l5 18H79z" fill="#E2444A"/><path d="M84 72l5-18H79z" fill="#3E4A5C"/></g>
    <circle cx="84" cy="54" r="2.6" fill="#FFD166"/>`),

  target: svg(`
    <circle cx="86" cy="54" r="28" fill="#FFF"/><circle cx="86" cy="54" r="22" fill="#E2444A"/><circle cx="86" cy="54" r="16" fill="#FFF"/>
    <circle cx="86" cy="54" r="10" fill="#E2444A"/><circle cx="86" cy="54" r="4.5" fill="#FFF"/>
    <g class="ha-dart"><path d="M86 54 52 40" stroke="#3E3A46" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M52 40l-8-6 2 6-6 2z" fill="#FFD166"/><circle cx="86" cy="54" r="2" fill="#3E3A46"/></g>`),
});

/* ---------- Fundaluri noi: spațiu, anotimpuri, hobby (Acasă) ---------- */

const petal = (x, y, d, dur) => `<g class="ha-leaf" ${t(d, dur)}><path d="M${x} ${y}q3-4 6 0q-3 4-6 0z" fill="#FFC2D6"/></g>`;
const blossom = (x, y, r = 5) => `<g><circle cx="${x}" cy="${y - r * .8}" r="${r * .62}" fill="#FFD1E0"/><circle cx="${x + r * .78}" cy="${y - r * .2}" r="${r * .62}" fill="#FFD1E0"/>
  <circle cx="${x + r * .5}" cy="${y + r * .7}" r="${r * .62}" fill="#FFD1E0"/><circle cx="${x - r * .5}" cy="${y + r * .7}" r="${r * .62}" fill="#FFD1E0"/><circle cx="${x - r * .78}" cy="${y - r * .2}" r="${r * .62}" fill="#FFD1E0"/>
  <circle cx="${x}" cy="${y}" r="${r * .35}" fill="#FF7AA8"/></g>`;
const bat = (x, y, d) => `<g class="ha-glide" ${t(d, 11)}><path d="M${x} ${y}q4-5 8-1q2-3 4 0q2-3 4 0q4-4 8 1q-5 0-8 4q-2-2-4 0q-3-4-8-4z" fill="#1A0E24"/></g>`;

Object.assign(HERO_ART, {
  galaxy: svg(`
    ${[[12, 14, 0, 2.6], [30, 60, -1.2, 3.2], [56, 10, -2, 2.4], [112, 84, -0.8, 3.4], [22, 88, -2.6, 2.8], [110, 10, -1.6, 3]]
      .map(([x, y, d, dur]) => `<circle class="ha-star" cx="${x}" cy="${y}" r="1" fill="#FFF" ${t(d, dur)}/>`).join('')}
    <circle cx="84" cy="50" r="30" fill="#B07CFF" opacity=".12"/>
    <g class="ha-galaxy"><circle cx="84" cy="50" r="34" fill="none"/>
      <path d="M84 50c11-2 19 6 17 17s-15 17-28 13" stroke="#C49BFF" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/>
      <path d="M84 50c-11 2-19-6-17-17s15-17 28-13" stroke="#7FB6F2" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/>
      <path d="M84 50c5 6 2 14-6 17M84 50c-5-6-2-14 6-17" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>
      <circle cx="106" cy="66" r="1.4" fill="#FFF"/><circle cx="62" cy="34" r="1.4" fill="#FFF"/><circle cx="96" cy="78" r="1" fill="#FFF"/><circle cx="72" cy="22" r="1" fill="#FFF"/></g>
    <circle cx="84" cy="50" r="7" fill="#FFF3D6"/><circle cx="84" cy="50" r="12" fill="#FFF3D6" opacity=".25"/>`),

  saturn: svg(`
    ${[[16, 16, 0, 2.6], [40, 70, -1.4, 3.1], [112, 18, -2.2, 2.4], [28, 40, -0.6, 3.6]]
      .map(([x, y, d, dur]) => `<circle class="ha-star" cx="${x}" cy="${y}" r="1" fill="#FFF" ${t(d, dur)}/>`).join('')}
    <g transform="rotate(-16 84 52)">
      <ellipse cx="84" cy="52" rx="34" ry="8" fill="none" stroke="#E8C98E" stroke-width="4" opacity=".85"/>
      <circle cx="84" cy="52" r="18" fill="#E9A85B"/>
      <path d="M67 46h34M66 52h36M68 58h32" stroke="#C9813A" stroke-width="2.4" opacity=".6"/>
      <path d="M50 52a34 8 0 0 0 68 0" fill="none" stroke="#F3DCA8" stroke-width="4"/>
    </g>
    <circle cx="84" cy="52" r="34" fill="none" stroke="#FFF" stroke-width=".6" stroke-dasharray="1.5 4" opacity=".35"/>
    <g class="ha-orbit" ${t(0, 12)}><circle cx="84" cy="52" r="34" fill="none"/><circle cx="118" cy="52" r="3.6" fill="#D9E2F0"/></g>`),

  astronaut: svg(`
    ${[[14, 20, 0, 2.6], [44, 84, -1.3, 3.2], [114, 14, -2, 2.4], [24, 60, -0.7, 3.4], [100, 92, -1.8, 2.9]]
      .map(([x, y, d, dur]) => `<circle class="ha-star" cx="${x}" cy="${y}" r="1" fill="#FFF" ${t(d, dur)}/>`).join('')}
    <g class="ha-floaty">
      <rect x="68" y="50" width="30" height="30" rx="10" fill="#D7DEE8"/>
      <rect x="72" y="54" width="22" height="24" rx="8" fill="#FFF"/>
      <path d="M72 60c-8 2-12 8-12 14M94 60c8 2 12 8 12 14" stroke="#FFF" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M76 78v10M90 78v10" stroke="#FFF" stroke-width="7" stroke-linecap="round"/>
      <circle cx="83" cy="40" r="15" fill="#FFF"/><circle cx="83" cy="40" r="15" fill="none" stroke="#D7DEE8" stroke-width="2"/>
      <ellipse cx="83" cy="41" rx="10" ry="8" fill="#2C3E73"/><path d="M78 37q3-3 7-2" stroke="#8FB8FF" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <rect x="78" y="64" width="10" height="5" rx="1.5" fill="#E2444A"/>
    </g>`),

  spring: svg(`
    <path d="M120 10C96 16 84 30 74 50M98 18c-4 8-2 16 4 20M84 32c-8 0-14 6-16 12" stroke="#7A4A33" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${blossom(104, 22)}${blossom(92, 34, 4.4)}${blossom(78, 46)}${blossom(70, 40, 3.8)}${blossom(110, 40, 4.2)}${blossom(86, 18, 3.6)}
    ${petal(80, 52, 0, 6)}${petal(100, 44, -2, 7)}${petal(70, 46, -3.6, 6.6)}${petal(108, 30, -1.2, 7.4)}${petal(90, 38, -4.8, 6.2)}`),

  summer: svg(`
    <g class="ha-galaxy" ${t(0, 30)}><circle cx="86" cy="36" r="30" fill="none"/>
      ${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<path d="M${(86 + Math.cos(a) * 22).toFixed(1)} ${(36 + Math.sin(a) * 22).toFixed(1)}L${(86 + Math.cos(a) * 29).toFixed(1)} ${(36 + Math.sin(a) * 29).toFixed(1)}" stroke="#FFE27A" stroke-width="3" stroke-linecap="round"/>`; }).join('')}</g>
    <circle cx="86" cy="36" r="17" fill="#FFD43B"/>
    <path d="M73 33h10a4 4 0 0 1-10 0zM89 33h10a4 4 0 0 1-10 0zM83 34h6" stroke="#1F1A2E" stroke-width="1.6" fill="#1F1A2E"/>
    <path d="M79 43q7 5 14 0" stroke="#B5651D" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${wave(80, 3, '#5CCBF0', 'ha-wave')}${wave(88, 3.5, '#2E9AD8', 'ha-wave r')}`),

  halloween: svg(`
    <circle cx="100" cy="20" r="12" fill="#FFE9A8"/><circle cx="104" cy="17" r="10" fill="#3A1A4E" opacity=".35"/>
    ${bat(20, 22, 0)}${bat(40, 38, -5)}
    <path d="M70 52q14-6 28 0" stroke="#3E8E3A" stroke-width="3" fill="none"/>
    <path d="M84 52c2-6 6-8 8-8" stroke="#3E8E3A" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="72" cy="72" rx="13" ry="18" fill="#E2701E"/><ellipse cx="96" cy="72" rx="13" ry="18" fill="#E2701E"/><ellipse cx="84" cy="72" rx="14" ry="20" fill="#F08A2A"/>
    <g class="ha-flicker"><path d="M73 66l5-6 5 6zM85 66l5-6 5 6z" fill="#FFD43B"/><path d="M72 76q12 10 24 0l-4 4-4-3-4 3-4-3-4 3z" fill="#FFD43B"/></g>`),

  gaming: svg(`
    <g class="ha-floaty" ${t(0, 3.4)}>
      <path d="M60 46h48a14 14 0 0 1 13.7 16.8l-2.8 14a8 8 0 0 1-13.8 3.8L99 74H69l-6.1 6.6a8 8 0 0 1-13.8-3.8l-2.8-14A14 14 0 0 1 60 46z" fill="#2B2F45"/>
      <path d="M64 56v12M58 62h12" stroke="#E9ECF5" stroke-width="3.4" stroke-linecap="round"/>
      <circle class="ha-win" cx="100" cy="56" r="3.4" fill="#4ADE80" ${t(0, 1.6)}/><circle class="ha-win" cx="108" cy="62" r="3.4" fill="#FF5D6C" ${t(-0.4, 1.9)}/>
      <circle class="ha-win" cx="92" cy="62" r="3.4" fill="#4FA8F0" ${t(-0.8, 1.7)}/><circle class="ha-win" cx="100" cy="68" r="3.4" fill="#FFD166" ${t(-1.2, 2.1)}/>
    </g>
    <path class="ha-note" d="M34 50h4v-4h4v4h4v4h-4v4h-4v-4h-4z" fill="#FFD166" ${t(0, 3.6)}/>
    <path class="ha-note" d="M24 70c-3-4-8-1-5 3l5 4 5-4c3-4-2-7-5-3z" fill="#FF7AA8" ${t(-1.8, 3.6)}/>`),

  football: svg(`
    <path d="M0 92h120v8H0z" fill="#2F8A3E"/><path d="M0 92h120" stroke="#FFF" stroke-width="1.4" opacity=".6"/>
    <path d="M90 92V48h28v44" stroke="#FFF" stroke-width="2.4" fill="none"/>
    <path d="M90 56h28M90 64h28M90 72h28M90 80h28M97 48v44M104 48v44M111 48v44" stroke="#FFF" stroke-width=".7" opacity=".45"/>
    <ellipse class="ha-shadow" cx="58" cy="93" rx="10" ry="2.4" fill="#000" opacity=".25"/>
    <g class="ha-bounce"><circle cx="58" cy="80" r="11" fill="#FFF"/>
      <path d="M58 74l5 3.6-2 6h-6l-2-6zM58 69v5M63 77.6l5-2M61 83.6l3 4.4M55 83.6l-3 4.4M53 77.6l-5-2" stroke="#1F2430" stroke-width="1.3" fill="none"/>
      <path d="M58 74l5 3.6-2 6h-6l-2-6z" fill="#1F2430"/></g>`),
});

/* ---------- Fundaluri noi pentru Investiții ---------- */

Object.assign(INV_ART, {
  crypto: svg(`
    <g class="ha-flip"><circle cx="84" cy="50" r="24" fill="#F7A531"/><circle cx="84" cy="50" r="19" fill="#FFC14D"/>
      <text x="84" y="59" text-anchor="middle" font-size="26" font-weight="800" fill="#FFF" font-family="sans-serif">₿</text></g>
    <path class="ha-star" d="M52 30l1.5 3.6 3.6 1.5-3.6 1.5-1.5 3.6-1.5-3.6-3.6-1.5 3.6-1.5z" fill="#FFF" ${t(0, 2.2)}/>
    <path class="ha-star" d="M114 72l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" fill="#FFF" ${t(-1.1, 2.6)}/>`),

  map: svg(`
    <g fill="#5A8FC7" opacity=".55">
      <path d="M40 30q10-8 22-4t14 10-8 12-18 2-10-20zM46 56q8-2 12 6t-2 18-8 2-2-26zM78 26q10-4 18 2t16 4 6 10-12 8-18-4-10-20zM88 52q8 0 10 8t-6 10-6-18zM106 70q6-2 8 4t-6 6-2-10z"/>
    </g>
    ${[[56, 40, 0], [92, 34, -0.8], [96, 62, -1.6], [52, 66, -2.4]].map(([x, y, d]) =>
      `<circle class="ha-ping" cx="${x}" cy="${y}" r="5" fill="none" stroke="#7CF0B8" stroke-width="1.4" ${t(d, 3.2)}/><path d="M${x} ${y + 1}c-4-5-5-7-5-9a5 5 0 0 1 10 0c0 2-1 4-5 9z" fill="#FFD166"/><circle cx="${x}" cy="${y - 8}" r="1.6" fill="#7A5A12"/>`).join('')}`),

  realestate: svg(`
    <path d="M46 92V64l14-12 14 12v28z" fill="#E8EEF6"/><path d="M42 66l18-16 18 16" stroke="#E2444A" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M78 92V48l18-14 18 14v44z" fill="#FFF"/><path d="M74 50l22-18 22 18" stroke="#E2444A" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    ${[[52, 70], [62, 70], [84, 56], [100, 56], [84, 70], [100, 70]].map(([x, y], i) =>
      `<rect class="ha-win" x="${x}" y="${y}" width="6" height="6" rx="1" fill="#FFD36E" ${t(-i * 0.6, 3 + (i % 3))}/>`).join('')}
    <rect x="90" y="80" width="12" height="12" rx="1.5" fill="#8A5A3C"/>
    <g class="ha-sway" ${t(0, 2.4)}><path d="M114 30v10" stroke="#FFF" stroke-width="1"/><path d="M106 40h16l-2 10h-12z" fill="#4ADE80"/><path d="M114 43v4M112 45h4" stroke="#0F3D2E" stroke-width="1.2"/></g>`),
});

// Fundaluri de la Investiții fără desen (doar culori).
export const INV_PLAIN = ['implicit', 'graphite', 'navy', 'emerald', 'burgundy'];
