// Culoarea de bază a fiecărui fundal fix al cardului principal. Cu bifa „Culoarea aplicației după fundal”,
// aplicația o folosește drept culoare principală. Fundalurile care folosesc chiar culoarea principală
// (Aurora, Simplu, Strălucire, Dungi, Sticlă) nu apar aici: la ele rămâne culoarea aleasă de tine.

export const HERO_ACCENT = {
  sunset: '#E8436E', ocean: '#1677C9', forest: '#1E9E62', midnight: '#4F5BD5', gold: '#B8892B',
  bear: '#C2549A', car: '#E1171E', mountains: '#6C6FD8', space: '#6D4AE0', piggy: '#0F9E84', cat: '#6B4FE0', beach: '#F06A4D',
  aquarium: '#0B7FB0', balloons: '#3B8FE0', winter: '#3466AE', city: '#8A4FC0', sailboat: '#2C7BE5', fireflies: '#2E9E6A', rocket: '#7A45D6',
  autumn: '#D9622B', coffee: '#A0643C', kite: '#2F86D8', rain: '#4F6FAE', aurora2: '#2EC98A', puppy: '#E07B2E', garden: '#2E9E5B', xmas: '#E2444A',
  night: '#4A5BC4', fox: '#E06A1E', penguin: '#2F7FD0', plane: '#2A74CF', lighthouse: '#E2444A', panda: '#3E9E58', bike: '#E2444A', music: '#9B3FD6',
  lavender: '#8E6FE0', mint: '#0E9A88', cherry: '#C2274A', peach: '#E8663F', slate: '#5E81AC', galaxy: '#8B5CF6', saturn: '#D98A3A',
  astronaut: '#4F6BE8', spring: '#E0679A', summer: '#F08A24', halloween: '#E2701E', gaming: '#5B4BE0', football: '#2F8A3E',
};

export const followsHero = settings => !!(settings.accentFromHero && HERO_ACCENT[settings.heroStyle]);
export const effectiveAccent = settings => (followsHero(settings) ? HERO_ACCENT[settings.heroStyle] : settings.accent);
