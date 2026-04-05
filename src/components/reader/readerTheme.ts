export type ReaderSurfaceTheme = 'light' | 'sepia' | 'dark' | 'oled'
export type ReaderAppearancePreset = ReaderSurfaceTheme | 'system'

export const READER_APPEARANCE_LS = 'epubReader_appearance'
export const READER_COLOR_LS_TR = 'epubReader_trColor'
export const READER_COLOR_LS_AR = 'epubReader_arColor'
export const READER_COLOR_LS_FA = 'epubReader_faColor'
export const DEFAULT_READER_TR = '#212121'
export const DEFAULT_READER_AR = '#1565C0'
export const DEFAULT_READER_FA = '#00695C'

export const READER_PALETTE_TR = ['#212121', '#000000', '#424242', '#5D4037', '#1565C0', '#00695C', '#2E7D32', '#6A1B9A', '#C62828', '#E65100'] as const
export const READER_PALETTE_AR = ['#1565C0', '#0D47A1', '#1976D2', '#00838F', '#00695C', '#2E7D32', '#283593', '#4A148C', '#B71C1C', '#212121'] as const
export const READER_PALETTE_FA = ['#00695C', '#004D40', '#00796B', '#00897B', '#1565C0', '#33691E', '#5D4037', '#37474F', '#263238', '#4E342E'] as const

export function readReaderColorLs(key: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  try {
    const v = localStorage.getItem(key)
    if (v && /^#[0-9A-Fa-f]{6}$/.test(v.trim())) return v.trim()
  } catch { /* ignore */ }
  return fallback
}

const READER_APPEARANCE_IDS = new Set<string>(['light', 'sepia', 'dark', 'oled', 'system'])

export function readReaderAppearance(): ReaderAppearancePreset {
  if (typeof window === 'undefined') return 'system'
  try {
    const v = localStorage.getItem(READER_APPEARANCE_LS)?.trim()
    if (v && READER_APPEARANCE_IDS.has(v)) return v as ReaderAppearancePreset
  } catch { /* ignore */ }
  return 'system'
}

export function resolveReaderSurface(preset: ReaderAppearancePreset, isDark: boolean): ReaderSurfaceTheme {
  if (preset === 'system') return isDark ? 'dark' : 'light'
  return preset
}

const READER_SURFACE_SHELL: Record<ReaderSurfaceTheme, { bg: string; link: string }> = {
  light: { bg: '#ffffff', link: '#2563eb' },
  sepia: { bg: '#f4ecd8', link: '#b45309' },
  dark: { bg: '#0f172a', link: '#93c5fd' },
  oled: { bg: '#000000', link: '#60a5fa' },
}

export const READER_FONT_LS_TR = 'epubReader_fontIdTr'
export const READER_FONT_LS_AR = 'epubReader_fontIdAr'
export const READER_FONT_LS_LEGACY = 'epubReader_fontId'
export const SYSTEM_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

/** Türkçe / Latin gövde — Arapça listesiyle ortak font yok. public/font + origin. */
export const READER_FONTS_TR = [
  { id: 'sf-pro-tr', label: 'SF Pro TR', face: 'AppReaderSfProTr', file: 'SF-Pro-TR.ttf', fallbacks: 'sans-serif' },
  { id: 'bnazanin', label: 'B Nazanin', face: 'AppReaderBNazanin', file: 'BNazanin.ttf', fallbacks: 'serif' },
] as const

/** Arapça / Farsça / RTL blokları — yalnızca bu tipografiler. */
export const READER_FONTS_AR = [
  { id: 'scheherazade', label: 'Scheherazade New', face: 'AppReaderScheherazade', file: 'ScheherazadeNew-Regular.ttf', fallbacks: 'serif' },
  { id: 'uthman-taha', label: 'Uthman Taha', face: 'AppReaderUthman', file: 'Uthman Taha Regular.ttf', fallbacks: 'serif' },
  { id: 'amiri', label: 'Amiri', face: 'AppReaderAmiri', file: 'Amiri-Regular.ttf', fallbacks: 'serif' },
] as const

export type ReaderFontDef = (typeof READER_FONTS_TR)[number] | (typeof READER_FONTS_AR)[number]

const READER_FONT_TR_IDS = new Set<string>(READER_FONTS_TR.map((f) => f.id))
const READER_FONT_AR_IDS = new Set<string>(READER_FONTS_AR.map((f) => f.id))

const DEFAULT_READER_FONT_ID_TR = READER_FONTS_TR[0].id
const DEFAULT_READER_FONT_ID_AR = READER_FONTS_AR[0].id

export function readReaderFontIdTr(): string {
  if (typeof window === 'undefined') return DEFAULT_READER_FONT_ID_TR
  try {
    let v = localStorage.getItem(READER_FONT_LS_TR)?.trim()
    if (v && READER_FONT_TR_IDS.has(v)) return v
    const leg = localStorage.getItem(READER_FONT_LS_LEGACY)?.trim()
    if (leg && READER_FONT_TR_IDS.has(leg)) return leg
  } catch { /* ignore */ }
  return DEFAULT_READER_FONT_ID_TR
}

export function readReaderFontIdAr(): string {
  if (typeof window === 'undefined') return DEFAULT_READER_FONT_ID_AR
  try {
    let v = localStorage.getItem(READER_FONT_LS_AR)?.trim()
    if (v && READER_FONT_AR_IDS.has(v)) return v
    const leg = localStorage.getItem(READER_FONT_LS_LEGACY)?.trim()
    if (leg && READER_FONT_AR_IDS.has(leg)) return leg
  } catch { /* ignore */ }
  return DEFAULT_READER_FONT_ID_AR
}

export function getReaderFontDefTr(id: string): (typeof READER_FONTS_TR)[number] {
  return READER_FONTS_TR.find((f) => f.id === id) ?? READER_FONTS_TR[0]
}

export function getReaderFontDefAr(id: string): (typeof READER_FONTS_AR)[number] {
  return READER_FONTS_AR.find((f) => f.id === id) ?? READER_FONTS_AR[0]
}

function fontFaceBlock(origin: string, def: ReaderFontDef): string {
  if (!def.file || !def.face || !origin) return ''
  return `@font-face{font-family:'${def.face}';src:url('${origin}/font/${encodeURIComponent(def.file)}') format('truetype');font-display:swap;}`
}

export function collectFontFaces(origin: string, defs: ReaderFontDef[]): string {
  const seen = new Set<string>()
  let out = ''
  for (const d of defs) {
    if (!d.face || seen.has(d.face)) continue
    const block = fontFaceBlock(origin, d)
    if (block) {
      seen.add(d.face)
      out += block
    }
  }
  return out
}

/** Okuma yüzeyi (açık / sepia / koyu / OLED) — metin renkleri kullanıcı paletinden. */
export function buildReaderThemeCss(
  surface: ReaderSurfaceTheme,
  tr: string,
  ar: string,
  fa: string,
  familyTr: string,
  familyAr: string,
  wTr: number,
  wAr: number,
  faceCss: string
): string {
  const shell = READER_SURFACE_SHELL[surface]
  const arBlock = `
html body [lang="ar"], html body [lang^="ar-"], html body :lang(ar), html body :lang(ara), html body .proepub-arabic {
  color: ${ar} !important;
  font-family: ${familyAr} !important;
  font-weight: ${wAr} !important;
}
html body [lang="ar"] *, html body [lang^="ar-"] *, html body .proepub-arabic * {
  color: ${ar} !important;
  font-family: ${familyAr} !important;
  font-weight: ${wAr} !important;
}
html body :lang(ar) *, html body :lang(ara) * {
  color: ${ar} !important;
  font-family: ${familyAr} !important;
  font-weight: ${wAr} !important;
}
html body *[dir="rtl"]:not([lang="tr"]):not([lang^="tr-"]):not(:lang(tr)) {
  color: ${ar} !important;
  font-family: ${familyAr} !important;
  font-weight: ${wAr} !important;
}
html body *[dir="rtl"]:not([lang="tr"]):not([lang^="tr-"]) span,
html body *[dir="rtl"]:not([lang="tr"]):not([lang^="tr-"]) div,
html body *[dir="rtl"]:not([lang="tr"]):not([lang^="tr-"]) p,
html body *[dir="rtl"]:not([lang="tr"]):not([lang^="tr-"]) i,
html body *[dir="rtl"]:not([lang="tr"]):not([lang^="tr-"]) b,
html body *[dir="rtl"]:not([lang="tr"]):not([lang^="tr-"]) em,
html body *[dir="rtl"]:not([lang="tr"]):not([lang^="tr-"]) strong {
  color: ${ar} !important;
  font-family: ${familyAr} !important;
  font-weight: ${wAr} !important;
}
body[dir="rtl"] {
  color: ${ar} !important;
  font-family: ${familyAr} !important;
  font-weight: ${wAr} !important;
}
body[dir="rtl"] p, body[dir="rtl"] div, body[dir="rtl"] span, body[dir="rtl"] li,
body[dir="rtl"] h1, body[dir="rtl"] h2, body[dir="rtl"] h3, body[dir="rtl"] h4, body[dir="rtl"] h5, body[dir="rtl"] h6,
body[dir="rtl"] blockquote, body[dir="rtl"] section, body[dir="rtl"] article,
body[dir="rtl"] td, body[dir="rtl"] th, body[dir="rtl"] caption, body[dir="rtl"] label {
  color: ${ar} !important;
  font-family: ${familyAr} !important;
  font-weight: ${wAr} !important;
}
`
  const faBlock = `
html body [lang="fa"], html body [lang^="fa-"], html body :lang(fa), html body .proepub-farsi {
  color: ${fa} !important;
  font-family: ${familyAr} !important;
  font-weight: ${wAr} !important;
}
html body [lang="fa"] *, html body [lang^="fa-"] *, html body .proepub-farsi * {
  color: ${fa} !important;
  font-family: ${familyAr} !important;
  font-weight: ${wAr} !important;
}
html body :lang(fa) * {
  color: ${fa} !important;
  font-family: ${familyAr} !important;
  font-weight: ${wAr} !important;
}
`
  return `${faceCss}
html {
  background-color: ${shell.bg} !important;
  color: ${tr} !important;
}
body {
  background-color: ${shell.bg} !important;
  color: ${tr} !important;
  font-family: ${familyTr} !important;
  font-weight: ${wTr} !important;
  line-height: 1.6 !important;
}
p, div, span, section, article, li, blockquote, figcaption, dd, dt, pre, code, td, th, caption, label {
  color: ${tr} !important;
  background-color: transparent !important;
  font-family: ${familyTr} !important;
  font-weight: ${wTr} !important;
}
h1, h2, h3, h4, h5, h6 {
  color: ${tr} !important;
  opacity: 0.9;
  background-color: transparent !important;
  font-family: ${familyTr} !important;
  font-weight: ${wTr} !important;
}
${arBlock}
${faBlock}
a, a:visited {
  color: ${shell.link} !important;
}
`
}

export const READER_WEIGHT_LS_TR = 'epubReader_weightTr'
export const READER_WEIGHT_LS_AR = 'epubReader_weightAr'
export const READER_WEIGHT_CHOICES = [300, 400, 500, 600, 700] as const

export function readReaderWeightLs(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  try {
    const v = parseInt(localStorage.getItem(key) || '', 10)
    if (READER_WEIGHT_CHOICES.includes(v as (typeof READER_WEIGHT_CHOICES)[number])) return v
  } catch { /* ignore */ }
  return fallback
}
