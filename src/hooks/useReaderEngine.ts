/**
 * useReaderEngine — EPUB Okuma Motoru Çekirdeği
 *
 * EpubReader.tsx'in ağır mantığını koordinatörden ayırır:
 *  • Tema enjeksiyonu (iframe CSS variables + style tag)
 *  • İframe kayıt sistemi (contentDocsRef + rendered observer)
 *  • GPU navigasyon (goToNext / goToPrevious / goToPage)
 *  • Font boyutu (rAF ile birleştirilmiş — 60 FPS)
 *  • Görünüm preset değiştirme (beyaz flaş önleyici)
 *
 * Tüm reaktif değerleri ref üzerinden okur; gereksiz render'ı sıfırlar.
 */

import { useCallback, useRef } from 'react'
import {
  buildReaderThemeCss,
  collectFontFaces,
  getReaderFontDefAr,
  getReaderFontDefTr,
  getReaderSurfaceBg,
  resolveReaderSurface,
  type ReaderAppearancePreset,
  type ReaderSurfaceTheme,
} from '../components/reader/readerTheme'
import { useReaderStore } from '../stores/useReaderStore'

/** Tema CSS önbelleği — renk/font imzası değişmezse string yeniden üretilmez */
export interface ThemeCssCache {
  sig: string
  light: string
  sepia: string
  dark: string
  oled: string
}

/** READER_MARGIN_PRESETS — EpubReader.tsx ile aynı sabitler (import edilemez ise kopya) */
const MARGIN_X = [0, 8, 16] as const
const MARGIN_Y = [0, 8, 16] as const

export interface UseReaderEngineOptions {
  isDarkMode: boolean
  readingAppearance: ReaderAppearancePreset
  trColor: string
  arColor: string
  faColor: string
  readerFontIdTr: string
  readerFontIdAr: string
  readerWeightTr: number
  readerWeightAr: number
  /** App-level dark mode setter — tema presetinde ışık/karanlık sync için */
  setDarkMode?: (v: boolean) => void
}

export function useReaderEngine({
  isDarkMode,
  readingAppearance,
  trColor,
  arColor,
  faColor,
  readerFontIdTr,
  readerFontIdAr,
  readerWeightTr,
  readerWeightAr,
  setDarkMode,
}: UseReaderEngineOptions) {
  // ── Reaktif ref'ler (kararlı kimlik, güncel değer) ──────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renditionRef = useRef<any>(null)
  const contentDocsRef = useRef<Set<Document>>(new Set())
  const isFullscreenRef = useRef(false)

  const isDarkModeRef = useRef(isDarkMode)
  isDarkModeRef.current = isDarkMode

  const readingAppearanceRef = useRef(readingAppearance)
  readingAppearanceRef.current = readingAppearance

  const trColorRef = useRef(trColor)
  trColorRef.current = trColor
  const arColorRef = useRef(arColor)
  arColorRef.current = arColor
  const faColorRef = useRef(faColor)
  faColorRef.current = faColor

  const readerFontIdTrRef = useRef(readerFontIdTr)
  readerFontIdTrRef.current = readerFontIdTr
  const readerFontIdArRef = useRef(readerFontIdAr)
  readerFontIdArRef.current = readerFontIdAr

  const readerWeightTrRef = useRef(readerWeightTr)
  readerWeightTrRef.current = readerWeightTr
  const readerWeightArRef = useRef(readerWeightAr)
  readerWeightArRef.current = readerWeightAr

  const readerThemeCssCacheRef = useRef<ThemeCssCache | null>(null)

  // rAF birleştirici — font boyutu için (her değer değişiminde sadece 1 frame)
  const fontSizeUiRafRef = useRef<number | null>(null)
  const fontSizeUiPendingRef = useRef<number | null>(null)

  // ── Layout override ─────────────────────────────────────────────────────────
  /**
   * iframe'e tam sıfır margin/padding + CSS değişkenleri yazar.
   * `!important` yerine `:root` seviyesinde `var()` kullanılır;
   * EPUB içi stiller geçersiz kılınabilir ama performans kazanımı yok değil.
   * Inline backgroundColor → ANINDA efektli (style tag asenkron parse edilir).
   */
  const ensureReaderLayoutOverrides = useCallback((doc: Document) => {
    const head = doc.head || doc.querySelector('head')
    if (!head) return

    // Beyaz flaşı sıfırlayan anlık arka plan
    const bg = getReaderSurfaceBg(
      resolveReaderSurface(readingAppearanceRef.current, isDarkModeRef.current)
    )
    doc.documentElement.style.backgroundColor = bg
    if (doc.body) doc.body.style.backgroundColor = bg

    const STYLE_ID = 'reader-layout-overrides'
    if (!doc.getElementById(STYLE_ID)) {
      const style = doc.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
        :root {
          --reader-pad-x: 0px;
          --reader-pad-y: 0px;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          max-width: none !important;
          box-sizing: border-box !important;
        }
        body {
          padding: var(--reader-pad-y) var(--reader-pad-x) !important;
        }
        body p, body div, body section, body article, body main, body aside,
        body header, body footer, body li, body blockquote, body pre, body figure,
        body h1, body h2, body h3, body h4, body h5, body h6 {
          margin-left: 0 !important;
          margin-right: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        body * { max-width: none !important; }
        img, svg {
          max-width: 100% !important;
          height: auto !important;
          object-fit: contain !important;
        }
        image { max-width: 100% !important; }
      `
      head.appendChild(style)
    }

    const fs = isFullscreenRef.current
    const idx = Math.max(0, Math.min(2, useReaderStore.getState().readerMarginPresetIndex))
    const padX = fs ? 0 : MARGIN_X[idx]
    const padY = fs ? 0 : MARGIN_Y[idx]
    doc.documentElement.style.setProperty('--reader-pad-x', `${padX}px`)
    doc.documentElement.style.setProperty('--reader-pad-y', `${padY}px`)
  }, [])

  // ── Tema CSS enjeksiyonu ────────────────────────────────────────────────────
  /**
   * İmza (sig) aynıysa CSS string'i yeniden üretmez → O(1) hot-path.
   * `<style id="reader-theme-styles">` en sona taşınır; EPUB'ın kendi stilleri
   * aynı özgüllükte çakışırsa bizimki kazanır.
   */
  const injectReaderThemeStyles = useCallback((doc: Document, surface: ReaderSurfaceTheme) => {
    const head = doc.head || doc.querySelector('head')
    if (!head) return

    const tr = trColorRef.current
    const ar = arColorRef.current
    const fa = faColorRef.current
    const idTr = readerFontIdTrRef.current
    const idAr = readerFontIdArRef.current
    const wTr = readerWeightTrRef.current
    const wAr = readerWeightArRef.current
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const sig = `${tr}\0${ar}\0${fa}\0${idTr}\0${idAr}\0${wTr}\0${wAr}\0${origin}`

    let cache = readerThemeCssCacheRef.current
    if (!cache || cache.sig !== sig) {
      const defTr = getReaderFontDefTr(idTr)
      const defAr = getReaderFontDefAr(idAr)
      const faceCss = collectFontFaces(origin, [defTr, defAr])
      const familyTr =
        defTr.file && defTr.face && origin ? `'${defTr.face}', ${defTr.fallbacks}` : defTr.fallbacks
      const familyAr =
        defAr.file && defAr.face && origin ? `'${defAr.face}', ${defAr.fallbacks}` : defAr.fallbacks

      cache = {
        sig,
        light: buildReaderThemeCss('light', tr, ar, fa, familyTr, familyAr, wTr, wAr, faceCss),
        sepia: buildReaderThemeCss('sepia', tr, ar, fa, familyTr, familyAr, wTr, wAr, faceCss),
        dark: buildReaderThemeCss('dark', tr, ar, fa, familyTr, familyAr, wTr, wAr, faceCss),
        oled: buildReaderThemeCss('oled', tr, ar, fa, familyTr, familyAr, wTr, wAr, faceCss),
      }
      readerThemeCssCacheRef.current = cache
    }

    const css = cache[surface]
    const THEME_STYLE_ID = 'reader-theme-styles'
    let el = doc.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null
    if (!el) {
      el = doc.createElement('style')
      el.id = THEME_STYLE_ID
      head.appendChild(el)
    }
    if (el.textContent !== css) {
      el.textContent = css
    }
    // Son eleman olduğunda kazanır — EPUB'ın stilleri ezmez
    try {
      if (el.parentNode === head && head.lastElementChild !== el) {
        head.appendChild(el)
      }
    } catch { /* cross-origin */ }
  }, [])

  // ── Tüm bilinen iframe'lere tema sync ──────────────────────────────────────
  /**
   * contentDocsRef, rendition content hook + rendered observer tarafından güncel
   * tutulur → querySelectorAll'a ihtiyaç yok (DOM traversal = 0).
   */
  const syncReaderThemeToIframes = useCallback(
    (surface: ReaderSurfaceTheme) => {
      const seen = new Set<Document>()
      contentDocsRef.current.forEach((doc) => {
        if (!doc?.head || seen.has(doc)) return
        seen.add(doc)
        try {
          injectReaderThemeStyles(doc, surface)
        } catch { /* cross-origin */ }
      })
    },
    [injectReaderThemeStyles]
  )

  // ── Layout + tema — tek nokta ───────────────────────────────────────────────
  const applyReaderInsets = useCallback(() => {
    const surface = resolveReaderSurface(readingAppearanceRef.current, isDarkModeRef.current)
    const seen = new Set<Document>()
    contentDocsRef.current.forEach((doc) => {
      if (!doc?.head || !doc.body || seen.has(doc)) return
      seen.add(doc)
      try {
        ensureReaderLayoutOverrides(doc)
        injectReaderThemeStyles(doc, surface)
        doc.documentElement.style.overflow = 'hidden'
        doc.body.style.overflow = 'hidden'
      } catch { }
    })
  }, [ensureReaderLayoutOverrides, injectReaderThemeStyles])

  // ── Görünüm preset ──────────────────────────────────────────────────────────
  const applyReadingAppearancePreset = useCallback(
    (preset: ReaderAppearancePreset) => {
      readingAppearanceRef.current = preset
      useReaderStore.getState().setReadingAppearance(preset)

      if (setDarkMode) {
        if (preset === 'light' || preset === 'sepia') setDarkMode(false)
        else if (preset === 'dark' || preset === 'oled') setDarkMode(true)
      }

      const surface: ReaderSurfaceTheme =
        preset === 'system'
          ? resolveReaderSurface('system', isDarkModeRef.current)
          : preset

      const r = renditionRef.current as any
      if (r?.themes?.select) {
        try { r.themes.select(surface) } catch { }
      }

      // Anında + rAF backup → 100 ms gecikme kaldırıldı
      syncReaderThemeToIframes(surface)
      requestAnimationFrame(() => syncReaderThemeToIframes(surface))
    },
    [setDarkMode, syncReaderThemeToIframes]
  )

  // ── Navigasyon (GPU translate3d animasyonu CSS'de) ──────────────────────────
  const goToNext = useCallback(() => {
    renditionRef.current?.next?.()
  }, [])

  const goToPrevious = useCallback(() => {
    renditionRef.current?.prev?.()
  }, [])

  const goToPage = useCallback((page: number) => {
    const r = renditionRef.current
    if (!r || !page) return
    try {
      const locations = r.book?.locations
      if (!locations || typeof locations.length !== 'function') return
      const total = locations.length?.()
      if (!total || isNaN(total)) return
      const clamped = Math.max(1, Math.min(total, Math.floor(page)))
      const pct = (clamped - 0.5) / total
      const cfi = locations.cfiFromPercentage?.(pct)
      if (cfi) r.display?.(cfi)
    } catch (err) {
      console.error('goToPage hatası:', err)
    }
  }, [])

  // ── Font boyutu (rAF birleştirici — 60 FPS) ─────────────────────────────────
  const changeFontSize = useCallback((newSize: number) => {
    const clamped = Math.max(50, Math.min(200, Math.round(newSize)))
    fontSizeUiPendingRef.current = clamped
    if (fontSizeUiRafRef.current != null) return
    fontSizeUiRafRef.current = requestAnimationFrame(() => {
      fontSizeUiRafRef.current = null
      const v = fontSizeUiPendingRef.current
      if (v == null) return
      useReaderStore.getState().setFontSize(v)
      try {
        const r = renditionRef.current
        r?.themes?.fontSize?.(`${v}%`)
        r?.resize?.()
      } catch { }
    })
  }, [])

  return {
    // Refs — EpubReader.tsx onReaderReady ve diğer hook'lar bunları kullanır
    renditionRef,
    contentDocsRef,
    isFullscreenRef,
    isDarkModeRef,
    readingAppearanceRef,
    readerThemeCssCacheRef,
    trColorRef,
    arColorRef,
    faColorRef,
    readerFontIdTrRef,
    readerFontIdArRef,
    readerWeightTrRef,
    readerWeightArRef,
    fontSizeUiRafRef,
    fontSizeUiPendingRef,

    // Temiz API
    ensureReaderLayoutOverrides,
    injectReaderThemeStyles,
    syncReaderThemeToIframes,
    applyReaderInsets,
    applyReadingAppearancePreset,
    goToNext,
    goToPrevious,
    goToPage,
    changeFontSize,
  }
}

export type ReaderEngine = ReturnType<typeof useReaderEngine>
