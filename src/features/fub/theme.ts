// Tokens CBI brand kit reutilizados en todos los widgets FUB.
// Mantener consistencia con AppNav.tsx y el resto del dashboard interno.

export const CBI = {
  // Backgrounds
  bg: 'bg-[#0F0F0F]',
  bgSoft: 'bg-[#161616]',
  bgGold: 'bg-[#C9A84C]',
  bgGoldSoft: 'bg-[#C9A84C]/10',

  // Borders
  border: 'border border-[#C9A84C]/20',
  borderSoft: 'border border-white/8',
  borderGold: 'border border-[#C9A84C]/40',

  // Text
  text: 'text-[#F5F0E8]',     // warm white
  textDim: 'text-[#9A9080]',  // warm gray
  textSoft: 'text-[#D0C8B8]',
  textGold: 'text-[#C9A84C]',
  textBlack: 'text-black',

  // Card base
  card: 'rounded-2xl border border-[#C9A84C]/20 bg-[#0F0F0F] p-5',
  cardSoft: 'rounded-xl border border-white/8 bg-white/4 p-3',
  cardInner: 'rounded-xl border border-white/8 bg-white/4 p-3',

  // Shadows / glows
  goldGlow: 'shadow-[0_2px_14px_rgba(201,168,76,0.25)]',
}

// Colores hex sueltos (para inline style en charts/bars)
export const CBI_HEX = {
  gold: '#C9A84C',
  warmWhite: '#F5F0E8',
  warmGray: '#9A9080',
  warmGraySoft: '#D0C8B8',
  bgDark: '#0F0F0F',

  // Status colors armonizados con paleta cálida
  emerald: '#7FB069',  // good
  amber: '#D4A056',    // warn
  crimson: '#C84B45',  // bad / hot
  rose: '#E8907A',     // warm accent
  violet: '#9888B8',   // viewings
  teal: '#6FA8A3',     // pending
} as const

export const STAGE_COLORS: Record<string, string> = {
  Lead: '#9A9080',
  'A - Hot 1-3 Months': '#C84B45',
  'B - Warm 3-6 Months': '#D4A056',
  'C - Cold 6+ Months': '#6FA8A3',
  Viewings: '#9888B8',
  Pending: '#C9A84C',
  Closed: '#7FB069',
  Sphere: '#7A7060',
  Unresponsive: '#5A5048',
  Trash: '#3A332C',
}
