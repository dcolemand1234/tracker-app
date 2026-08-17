export const SWATCHES = [
  '#b8705c', '#3f8f82', '#bc9440', '#7b6ca6', '#5b7b8b',
  '#4a7ba6', '#8a9a4b', '#c2685a', '#a6873f', '#5c7a99',
  '#9a5c8f', '#6b8a5c',
];

// Samurai theme palette. Previously a cool navy/blue-gray scheme; this
// swaps every core chrome color for the ink-black + gold + rose (torii
// red) language established across the game, its drawer, and the main
// nav drawer - researched from actual samurai-themed UI kits (a CC BY
// 4.0 Figma "Samurai UI" design, GameDev Market's dedicated samurai/
// ninja UI pack) rather than invented from scratch. 35 screens pull
// from this file, so this one change is what actually makes the whole
// app consistent, rather than 35 separate one-off edits.
export const GOLD = '#d9a441';
export const BLUE = '#0c0a0a';
export const CARD = '#1a1512';
export const INK = '#ede6d8';
export const DIM = '#a39a86';
export const ROSE = '#ea5a5f';
export const BORDER = 'rgba(217,164,65,0.18)';
export const INPUT_BG = '#1f1a15';

// Added for more visual depth without abandoning the palette above -
// still gold/rose/ink-black at the core, just with more range to work
// with than one flat gold everywhere. JADE is a traditional companion
// to gold and vermilion in Japanese art, giving screens a third color
// for variety. The GOLD_LIGHT/GOLD_DEEP pair is for real gradients
// (LinearGradient) instead of a single flat fill, and the glow* objects
// are drop-in shadow styles for anything that should feel like it has
// real presence - a primary button, an active nav item, a hero number.
export const JADE = '#4a9a7a';
export const JADE_LIGHT = '#7fc4a3';
export const GOLD_LIGHT = '#f0c368';
export const GOLD_DEEP = '#b8842e';
export const GOLD_GRADIENT = [GOLD_LIGHT, GOLD, GOLD_DEEP];
export const BORDER_STRONG = 'rgba(217,164,65,0.4)';

export const glowGold = {
  shadowColor: GOLD,
  shadowOpacity: 0.55,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
};
export const glowRose = {
  shadowColor: ROSE,
  shadowOpacity: 0.5,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
};
export const glowJade = {
  shadowColor: JADE,
  shadowOpacity: 0.5,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
};

export const shared = {
  safe: { flex: 1, backgroundColor: BLUE },
  centered: { justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, paddingBottom: 100 },
  h1: {
    fontSize: 28, fontWeight: '800', color: GOLD, letterSpacing: 1,
    fontFamily: 'serif', textShadowColor: 'rgba(217,164,65,0.45)', textShadowRadius: 10,
  },
  tagline: { color: DIM, marginTop: 2, marginBottom: 16 },
  block: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // A version of `block` with a bright accent stripe down the left edge -
  // for the one or two things per screen that should visually stand out
  // rather than blend into a row of identical cards.
  blockAccent: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_STRONG,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  blockHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockTitle: { fontSize: 16, fontWeight: '600', color: INK },
  countBadge: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { color: '#1c1206', fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowName: { flex: 1, fontSize: 15, color: INK, marginLeft: 8 },
  rowRight: { fontSize: 13, fontWeight: '600', color: DIM },
  thumb44: { width: 44, height: 44, borderRadius: 10 },
  thumb66: { width: 66, height: 66, borderRadius: 12 },
  searchInput: {
    backgroundColor: INPUT_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
    color: INK,
    borderWidth: 1,
    borderColor: BORDER,
  },
  catHead: {
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
};

