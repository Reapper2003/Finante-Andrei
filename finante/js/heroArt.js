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
