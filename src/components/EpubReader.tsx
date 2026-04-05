import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ReactReader, ReactReaderStyle } from 'react-reader'
import { ChevronLeft, ChevronRight, Settings, BookOpen, ArrowLeft, RotateCcw, Bookmark, BookmarkCheck, BookmarkPlus, Menu, X, AlertTriangle, Minimize, Maximize, Sun, Moon, Highlighter, CheckCircle2, XCircle, Info, Search } from 'lucide-react'
import { saveReadingProgress, getReadingProgress, addBookmark, getBookmarks, deleteBookmark, type Bookmark as BookmarkType, addHighlight, getHighlights, updateHighlight, deleteHighlight, type Highlight } from '../lib/progressService'
import { trackEvent } from '../lib/analytics'
import { BookmarkNoteModal } from './BookmarkNoteModal'
import { HighlightModal } from './HighlightModal'
import { HighlightPanel } from './HighlightPanel'
import { ReaderContextMenu } from './reader/ReaderContextMenu'
import { ReaderBookmarkPanel } from './reader/ReaderBookmarkPanel'
import { ReaderSearchPanel, type TextSearchResult } from './reader/ReaderSearchPanel'
import { ReaderSettingsPanel } from './reader/ReaderSettingsPanel'
import { useReaderStore } from '../stores/useReaderStore'
import {
  buildReaderThemeCss,
  collectFontFaces,
  getReaderFontDefAr,
  getReaderFontDefTr,
  resolveReaderSurface,
  SYSTEM_FONT_STACK,
  type ReaderAppearancePreset,
  type ReaderSurfaceTheme,
} from './reader/readerTheme'

export type { ReaderAppearancePreset, ReaderSurfaceTheme } from './reader/readerTheme'
export { resolveReaderSurface } from './reader/readerTheme'

interface EpubReaderProps {
  bookUrl: string
  bookTitle: string
  bookId: string
  userId?: string  // Optional for guest mode
  onBackToLibrary: () => void
  onLoginRequired?: () => void  // Called when guest tries to use account features
  isDarkMode?: boolean
  toggleDarkMode?: () => void
  /** Açık/Sepia → false, Koyu/OLED → true; "Sistem" seçilince çağrılmaz */
  setDarkMode?: (dark: boolean) => void
  initialLocation?: string
  initialHighlightCfi?: string
}

function resolveEpubDisplayUrl(raw: string): string | null {
  if (!raw || raw === 'demo-placeholder.epub') return null
  const u = raw.trim()
  if (/^https?:\/\//i.test(u)) return u
  if (typeof window !== 'undefined') {
    if (u.startsWith('/')) return `${window.location.origin}${u}`
    try {
      return new URL(u, window.location.origin).href
    } catch {
      return u
    }
  }
  return u
}

// iOS için haptic feedback, TTS ve Clipboard
let haptics: any = null
let tts: any = null
let nativeClipboard: any = null
if (typeof window !== 'undefined' && (window as any).Capacitor) {
  import('@capacitor/haptics').then(({ Haptics }) => {
    haptics = Haptics
  }).catch(() => {
    console.log('Haptics plugin yüklenemedi')
  })
  import('@capacitor-community/text-to-speech').then((mod) => {
    tts = mod.TextToSpeech || mod
  }).catch(() => {
    console.log('TextToSpeech plugin yüklenemedi')
  })
  try {
    nativeClipboard = (window as any).Capacitor?.Plugins?.Clipboard || null
  } catch {
    nativeClipboard = null
  }
}

export const EpubReader: React.FC<EpubReaderProps> = ({
  bookUrl,
  bookTitle,
  bookId,
  userId,
  onBackToLibrary,
  onLoginRequired,
  isDarkMode = false,
  toggleDarkMode,
  setDarkMode,
  initialLocation,
  initialHighlightCfi
}) => {
  const { t } = useTranslation()
  const [location, setLocation] = useState<string | number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const readingAppearance = useReaderStore((s) => s.readingAppearance)
  const trColor = useReaderStore((s) => s.trColor)
  const arColor = useReaderStore((s) => s.arColor)
  const faColor = useReaderStore((s) => s.faColor)
  const readerFontIdTr = useReaderStore((s) => s.readerFontIdTr)
  const readerFontIdAr = useReaderStore((s) => s.readerFontIdAr)
  const readerWeightTr = useReaderStore((s) => s.readerWeightTr)
  const readerWeightAr = useReaderStore((s) => s.readerWeightAr)
  const fontSize = useReaderStore((s) => s.fontSize)
  const progressPercentage = useReaderStore((s) => s.progressPercentage)
  const setProgressPercentage = useReaderStore((s) => s.setProgressPercentage)

  const readingAppearanceRef = useRef(readingAppearance)
  readingAppearanceRef.current = readingAppearance
  const trColorRef = useRef(trColor)
  const arColorRef = useRef(arColor)
  const faColorRef = useRef(faColor)
  trColorRef.current = trColor
  arColorRef.current = arColor
  faColorRef.current = faColor
  const readerFontIdTrRef = useRef(readerFontIdTr)
  const readerFontIdArRef = useRef(readerFontIdAr)
  readerFontIdTrRef.current = readerFontIdTr
  readerFontIdArRef.current = readerFontIdAr
  const readerWeightTrRef = useRef(readerWeightTr)
  const readerWeightArRef = useRef(readerWeightAr)
  readerWeightTrRef.current = readerWeightTr
  readerWeightArRef.current = readerWeightAr

  const displayUrl = useMemo(() => resolveEpubDisplayUrl(bookUrl), [bookUrl])
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([])
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showBookmarkNoteModal, setShowBookmarkNoteModal] = useState(false)
  const [pendingBookmarkLocation, setPendingBookmarkLocation] = useState<string>('')

  // Highlight states
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [showHighlights, setShowHighlights] = useState(false)
  const [showHighlightModal, setShowHighlightModal] = useState(false)
  const [pendingHighlight, setPendingHighlight] = useState<{
    cfiRange: string
    selectedText: string
    chapterTitle?: string
  } | null>(null)
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null)
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null)
  const [toastEnter, setToastEnter] = useState(false)
  const [ttsLanguage, setTtsLanguage] = useState<string>('tr-TR')

  // Search states
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchScope, setSearchScope] = useState<'toc' | 'text'>('toc')
  const [textSearchResults, setTextSearchResults] = useState<TextSearchResult[]>([])
  const [isSearchingText, setIsSearchingText] = useState(false)

  // Scroll mode state - infinity scroll için
  // Scroll mode state - infinity scroll için
  const [scrollMode, setScrollMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`scrollMode_${bookId}`)
      if (saved !== null) {
        return saved === 'true'
      }
      // Android cihazlarda varsayılan olarak scroll modunda aç
      const isAndroid = /Android/i.test(navigator.userAgent)
      return isAndroid
    }
    return false
  })

  // Context menu states
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })

  const renditionRef = useRef<any>(null)
  const suppressNextSelectionRef = useRef<boolean>(false)
  // Android seçim davranışı için timeout ref'i (seçim bitince menü açmak için)
  const androidSelectionTimeoutRef = useRef<number | null>(null)
  // iOS seçim durumu için ref'ler
  const iosIsTouchSelectingRef = useRef<boolean>(false)
  const iosLastSelectionTextRef = useRef<string>('')
  const iosLastSelectionChangeTimeRef = useRef<number>(0)
  const iosMenuShownForSelectionRef = useRef<boolean>(false)
  const lastLocationRef = useRef<string | number>(0)
  const lastWindowHeightRef = useRef<number | null>(null)
  const tocRef = useRef<any>(null)
  const bottomNavRef = useRef<HTMLDivElement | null>(null)
  const isFullscreenRef = useRef<boolean>(false)
  const prevIsFullscreenRef = useRef<boolean>(false)
  const contentDocsRef = useRef<Set<Document>>(new Set())
  /** Renk/font/ağırlık aynıyken tüm iframe’lere aynı CSS string’i yeniden birleştirmeyi atla. */
  const readerThemeCssCacheRef = useRef<{
    sig: string
    light: string
    sepia: string
    dark: string
    oled: string
  } | null>(null)
  const isDarkModeRef = useRef(isDarkMode)
  const searchHighlightCfiRef = useRef<string | null>(null)
  const hasNavigatedToInitialHighlightRef = useRef<boolean>(false)
  const hasNavigatedToInitialLocationRef = useRef<boolean>(false)
  const preExitLocationRef = useRef<string | null>(null)

  useEffect(() => {
    isFullscreenRef.current = isFullscreen
  }, [isFullscreen])

  useEffect(() => {
    isDarkModeRef.current = isDarkMode
  }, [isDarkMode])

  // ReactReader default olarak reader alanını soldan/sağdan 50px daraltıyor.
  // Fullscreen'de gerçek "tam ekran" hissi için bu inset'leri küçültüyoruz.
  const fullscreenReaderStyles = useMemo(() => {
    if (!isFullscreen) return undefined
    return {
      ...ReactReaderStyle,
      titleArea: {
        ...ReactReaderStyle.titleArea,
        display: 'none'
      },
      reader: {
        ...ReactReaderStyle.reader,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      },
      swipeWrapper: {
        ...ReactReaderStyle.swipeWrapper,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      },
      // Tam ekranda ok butonlarını gizle
      arrow: {
        ...ReactReaderStyle.arrow,
        display: 'none'
      }
    }
  }, [isFullscreen])

  const ensureReaderLayoutOverrides = useCallback((doc: Document) => {
    const head = doc.head || doc.querySelector('head')
    if (!head) return
    const STYLE_ID = 'reader-layout-overrides'
    if (!doc.getElementById(STYLE_ID)) {
      const style = doc.createElement('style')
      style.id = STYLE_ID
      style.textContent = `
        :root {
          --reader-pad-x: 20px;
          --reader-pad-y: 20px;
        }
        html, body {
          margin: 0 !important;
          max-width: none !important;
        }
        body {
          padding: var(--reader-pad-y) var(--reader-pad-x) !important;
          box-sizing: border-box !important;
        }
        /* Bazı EPUB'lar wrapper'lara margin/max-width koyuyor */
        body * {
          max-width: none !important;
        }
        
        /* Görselleri ve SVG'leri ekran genişliğine sığdır (body * kuralını ezer) */
        img, svg {
          max-width: 100% !important;
          height: auto !important;
          object-fit: contain !important;
        }
        
        /* Özel durum: SVG içindeki resimler */
        image {
          max-width: 100% !important;
        }
      `
      head.appendChild(style)
    }

    const padX = isFullscreenRef.current ? 6 : 20
    const padY = isFullscreenRef.current ? 10 : 20
    doc.documentElement.style.setProperty('--reader-pad-x', `${padX}px`)
    doc.documentElement.style.setProperty('--reader-pad-y', `${padY}px`)
  }, [])

  /** EPUB iframe içinde tema; tek style#reader-theme-styles — CSS imzası aynıysa string önbellekten. */
  const injectReaderThemeStyles = useCallback((doc: Document, surface: ReaderSurfaceTheme) => {
    const head = doc.head || doc.querySelector('head')
    if (!head) return
    const READER_THEME_STYLE_ID = 'reader-theme-styles'
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
      let familyTr: string = defTr.fallbacks
      if (defTr.file && defTr.face && origin) {
        familyTr = `'${defTr.face}', ${defTr.fallbacks}`
      }
      let familyAr: string = defAr.fallbacks
      if (defAr.file && defAr.face && origin) {
        familyAr = `'${defAr.face}', ${defAr.fallbacks}`
      }
      cache = {
        sig,
        light: buildReaderThemeCss('light', tr, ar, fa, familyTr, familyAr, wTr, wAr, faceCss),
        sepia: buildReaderThemeCss('sepia', tr, ar, fa, familyTr, familyAr, wTr, wAr, faceCss),
        dark: buildReaderThemeCss('dark', tr, ar, fa, familyTr, familyAr, wTr, wAr, faceCss),
        oled: buildReaderThemeCss('oled', tr, ar, fa, familyTr, familyAr, wTr, wAr, faceCss)
      }
      readerThemeCssCacheRef.current = cache
    }
    const css = cache[surface]
    let el = doc.getElementById(READER_THEME_STYLE_ID) as HTMLStyleElement | null
    if (!el) {
      el = doc.createElement('style')
      el.id = READER_THEME_STYLE_ID
      head.appendChild(el)
    }
    if (el.textContent !== css) {
      el.textContent = css
    }
    // EPUB içi stiller sonradan eklenebiliyor; aynı özgüllükte son kazansın diye style'ı head sonuna al.
    try {
      if (el.parentNode === head && head.lastElementChild !== el) {
        head.appendChild(el)
      }
    } catch { /* ignore */ }
  }, [])

  const syncReaderThemeToIframes = useCallback(
    (surface: ReaderSurfaceTheme) => {
      const seen = new Set<Document>()
      const injectOne = (d: Document | null | undefined) => {
        if (!d?.head || seen.has(d)) return
        seen.add(d)
        try {
          injectReaderThemeStyles(d, surface)
        } catch { /* cross-origin veya kapalı belge */ }
      }
      contentDocsRef.current.forEach((doc) => injectOne(doc))
      document.querySelectorAll<HTMLIFrameElement>('.react-reader-container iframe').forEach((iframe) => {
        try {
          injectOne(iframe.contentDocument || iframe.contentWindow?.document || null)
        } catch { }
      })
    },
    [injectReaderThemeStyles]
  )

  // Hedef: içerik scroll olmasın; sayfalar "paginated" olarak ileri/geri gitsin.
  const applyReaderInsets = useCallback(() => {
    const surface = resolveReaderSurface(readingAppearanceRef.current, isDarkModeRef.current)
    const seen = new Set<Document>()
    const applyOne = (doc: Document | null | undefined) => {
      if (!doc?.head || !doc.body || seen.has(doc)) return
      seen.add(doc)
      try {
        ensureReaderLayoutOverrides(doc)
        injectReaderThemeStyles(doc, surface)
        doc.documentElement.style.overflow = 'hidden'
        doc.body.style.overflow = 'hidden'
      } catch { }
    }
    contentDocsRef.current.forEach((doc) => applyOne(doc))

    document.querySelectorAll<HTMLIFrameElement>('.react-reader-container iframe').forEach((iframe) => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (!iframeDoc?.body) return
        contentDocsRef.current.add(iframeDoc)
        applyOne(iframeDoc)
      } catch (error) {
        console.log('reader inset uygulama hatası:', error)
      }
    })
  }, [ensureReaderLayoutOverrides, injectReaderThemeStyles])

  // Sayfa bilgileri için yeni state'ler
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [pageInput, setPageInput] = useState<string>('')
  const [currentChapter, setCurrentChapter] = useState('')
  const [toc, setToc] = useState<any[]>([])
  const [lastSelectedText, setLastSelectedText] = useState<string>('')

  const flatToc = useMemo(() => {
    const result: any[] = []

    const walk = (items: any[], parentLabel?: string) => {
      if (!items) return
      items.forEach((item) => {
        const label = (item.label || '').toString()
        const fullLabel = parentLabel ? `${parentLabel} › ${label}` : label
        result.push({
          ...item,
          fullLabel
        })
        if (item.subitems && item.subitems.length > 0) {
          walk(item.subitems, fullLabel)
        }
      })
    }

    walk(toc || [])
    return result
  }, [toc])

  const filteredToc = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return flatToc
    return flatToc.filter((item) =>
      (item.fullLabel || '').toLowerCase().includes(q)
    )
  }, [flatToc, searchQuery])

  // Tipografi / renk / tema değişince paint öncesi iframe’lere uygula (useEffect gecikmesi epub.js ile yarışabiliyordu).
  useLayoutEffect(() => {
    applyReaderInsets()
    try {
      const r = renditionRef.current
      if (r?.themes?.fontSize) {
        r.themes.fontSize(`${useReaderStore.getState().fontSize}%`)
      }
    } catch { /* ignore */ }
  }, [
    trColor,
    arColor,
    faColor,
    readerFontIdTr,
    readerFontIdAr,
    readerWeightTr,
    readerWeightAr,
    readingAppearance,
    fontSize,
    applyReaderInsets,
  ])

  // Component mount olduğunda debug bilgisi
  useEffect(() => {
    console.log('EpubReader mounted with props:', {
      bookUrl,
      bookTitle,
      bookId,
      userId,
      isDarkMode
    })
  }, [])

  // Sekme görünürlüğü değişiminde agresif yan etkileri devre dışı bıraktık

  // Menü/paneller dış tıklama veya dokunmada kapansın
  useEffect(() => {
    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement
      if (!target) return

      // Menü için
      if (showMenu && !target.closest('.menu-container')) {
        setShowMenu(false)
      }

      // Yer işaretleri paneli için
      if (showBookmarks && !target.closest('.bookmark-panel')) {
        setShowBookmarks(false)
      }

      // Vurgulama paneli için
      if (showHighlights && !target.closest('.highlight-panel')) {
        setShowHighlights(false)
      }

      // Context menu için (iOS'ta text selector handle'larına dokununca da kapanır)
      if (showContextMenu && !target.closest('.context-menu')) {
        // Dışarı tıklamayla context menü kapanırken, seçimleri de temizle
        setShowContextMenu(false)
        setPendingHighlight(null)
        clearSelectionsAndSuppress(500)
      }

      // Ayarlar paneli için
      if (showSettings && !target.closest('.settings-panel')) {
        setShowSettings(false)
      }

      // Arama paneli için
      if (showSearch && !target.closest('.search-panel')) {
        setShowSearch(false)
      }
    }

    document.addEventListener('mousedown', handlePointerOutside)
    document.addEventListener('touchstart', handlePointerOutside)
    return () => {
      document.removeEventListener('mousedown', handlePointerOutside)
      document.removeEventListener('touchstart', handlePointerOutside)
    }
  }, [showMenu, showBookmarks, showSettings, showHighlights, showContextMenu, showSearch])

  // ESC tuşu ile panelleri kapatma
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false)
        } else if (showBookmarks) {
          setShowBookmarks(false)
        } else if (showHighlights) {
          setShowHighlights(false)
        } else if (showContextMenu) {
          // ESC ile context menü kapanırken de seçimleri temizle
          setShowContextMenu(false)
          setPendingHighlight(null)
          clearSelectionsAndSuppress(500)
        } else if (showSearch) {
          setShowSearch(false)
        } else if (showMenu) {
          setShowMenu(false)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSettings, showBookmarks, showMenu, showHighlights, showContextMenu, showSearch])

  // Timeout için yükleme kontrolü
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.error('EPUB yükleme timeout')
        setError(t('reader.downloadError'))
        setIsLoading(false)
      }
    }, 15000) // 15 saniye timeout

    return () => clearTimeout(timeout)
  }, [isLoading])

  // "Sistem" ön ayarı: uygulama koyu/açık değişince okuma yüzeyi de light/dark olur
  useEffect(() => {
    if (readingAppearance !== 'system') return
    const surface = isDarkMode ? 'dark' : 'light'
    if (renditionRef.current) {
      try {
        renditionRef.current.themes.select(surface)
      } catch { /* ignore */ }
      setTimeout(() => syncReaderThemeToIframes(surface), 100)
    } else {
      setTimeout(() => syncReaderThemeToIframes(surface), 100)
    }
  }, [isDarkMode, readingAppearance, syncReaderThemeToIframes])

  // Gelişmiş ilerleme hesaplama fonksiyonu
  const calculateAdvancedProgress = (book: any, cfi: string) => {
    try {
      let progress = 0

      // Önce locations API'sini kullan (en doğru)
      if (book.locations && book.locations.length()) {
        try {
          const percentage = book.locations.percentageFromCfi(cfi)
          if (typeof percentage === 'number' && !isNaN(percentage)) {
            progress = Math.round(percentage * 100)
            setProgressPercentage(progress)

            if (userId && bookId) {
              saveReadingProgress(userId, bookId, cfi, progress)
            }
            return
          }
        } catch (error) {
          console.log('Locations API hatası, spine tabanlı hesaplamaya geçiliyor:', error)
        }
      }

      // Locations API çalışmazsa spine tabanlı hesaplama
      if (book && book.spine && book.spine.items) {
        const spineItems = book.spine.items

        // CFI'den spine index'i çıkar
        let currentIndex = -1

        if (cfi.includes('epubcfi')) {
          // Farklı CFI formatlarını dene
          const patterns = [
            /epubcfi\(\/6\/(\d+)/,  // Standart format
            /epubcfi\(\/(\d+)/,     // Alternatif format
            /\/6\/(\d+)/,           // Basitleştirilmiş
          ]

          for (const pattern of patterns) {
            const match = cfi.match(pattern)
            if (match && match[1]) {
              let spineIndex = parseInt(match[1])
              if (pattern === patterns[0]) { // Standart format için /2
                spineIndex = Math.floor(spineIndex / 2)
              }
              if (!isNaN(spineIndex) && spineIndex >= 0 && spineIndex < spineItems.length) {
                currentIndex = spineIndex
                break
              }
            }
          }
        }

        // Eğer CFI'den çıkarılamadıysa, spine.get ile dene
        if (currentIndex === -1) {
          const currentSection = book.spine.get(cfi)
          if (currentSection) {
            currentIndex = spineItems.findIndex((item: any) => item.href === currentSection.href)
          }
        }

        if (currentIndex >= 0 && currentIndex < spineItems.length) {
          // Spine tabanlı ilerleme hesaplama
          const baseProgress = (currentIndex / spineItems.length) * 100

          // Spine içindeki konuma göre ek düzeltme
          let adjustedProgress = baseProgress

          // Eğer locations mevcutsa, daha hassas hesaplama yap
          if (book.locations && book.locations.length()) {
            try {
              const totalLocations = book.locations.length()
              const currentLocation = book.locations.locationFromCfi(cfi)
              if (currentLocation && currentLocation.start) {
                const locationIndex = currentLocation.start.index
                if (locationIndex >= 0) {
                  adjustedProgress = (locationIndex / totalLocations) * 100
                }
              }
            } catch (error) {
              console.log('Location tabanlı hesaplama hatası:', error)
            }
          }

          progress = Math.round(adjustedProgress)
          setProgressPercentage(progress)

          if (userId && bookId) {
            saveReadingProgress(userId, bookId, cfi, progress)
          }
          return
        }
      }

      // Hiçbiri çalışmazsa varsayılan
      setProgressPercentage(0)
      if (userId && bookId) {
        saveReadingProgress(userId, bookId, cfi, 0)
      }

    } catch (error) {
      console.warn('İlerleme hesaplama hatası:', error)
      setProgressPercentage(0)
      if (userId && bookId) {
        saveReadingProgress(userId, bookId, cfi, 0)
      }
    }
  }

  // Mevcut konumun bookmark olup olmadığını kontrol et
  const checkCurrentBookmark = (cfi: string) => {
    const bookmark = bookmarks.find(b => b.location === cfi)
    setIsBookmarked(!!bookmark)
  }

  const onReaderReady = useCallback((rendition: any) => {
    console.log('=== READER READY ===')
    console.log('EPUB Reader hazır:', rendition)
    console.log('Rendition object:', rendition)
    console.log('Okuma ön ayarı:', readingAppearanceRef.current)
    console.log('Mevcut isDarkMode:', isDarkMode)
    console.log('scrollMode:', scrollMode)

    renditionRef.current = rendition
    setIsLoading(false)
    setError(null)

    // Scroll mode'u rendition üzerinde zorla uygula
    if (scrollMode && rendition) {
      try {
        // epubjs'in flow metodunu kullanarak scroll moduna geç
        if (typeof rendition.flow === 'function') {
          rendition.flow('scrolled-doc')
          console.log('Rendition flow scrolled-doc olarak ayarlandı')
        }
        // Spread'i de kapatmamız gerekebilir
        if (typeof rendition.spread === 'function') {
          rendition.spread('none')
        }
      } catch (err) {
        console.error('Scroll mode ayarlanırken hata:', err)
      }
    }

    // Mobile cihaz tespiti
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isAndroid = /Android/i.test(navigator.userAgent)
    const isMobile = isIOS || isAndroid

    // EPUB içerik iframe'lerine mobil için özel CSS ve event injection
    if (rendition?.hooks?.content) {
      try {
        rendition.hooks.content.register((contents: any) => {
          try {
            const doc = contents.document as Document | undefined
            if (!doc) return
            contentDocsRef.current.add(doc)
            // İçerik her yüklendiğinde layout override'larını enjekte et
            ensureReaderLayoutOverrides(doc)
            try {
              const surface = resolveReaderSurface(readingAppearanceRef.current, isDarkModeRef.current)
              injectReaderThemeStyles(doc, surface)
            } catch (injectErr) {
              console.warn('reader-theme-styles inject:', injectErr)
            }

            const head = doc.querySelector('head')
            const TOUCH_SELECT_STYLE_ID = 'reader-touch-select-overrides'
            if (head && !doc.getElementById(TOUCH_SELECT_STYLE_ID)) {
              const style = doc.createElement('style')
              style.id = TOUCH_SELECT_STYLE_ID

              // Eğer iOS + Capacitor ortamındaysak ve native Clipboard eklentisi yoksa,
              // sistemin kendi "Kopyala" menüsünü engelleme (kullanıcı sistem menüsünü kullanabilsin).
              const disableNativeCallout = !(isIOS && (window as any).Capacitor && !nativeClipboard)

              style.textContent = `
                * {
                  ${disableNativeCallout ? '-webkit-touch-callout: none !important;' : ''}
                  -webkit-user-select: text;
                  user-select: text;
                }
              `
              head.appendChild(style)
            }

            // Native context menu'yü sadece iOS + Capacitor + nativeClipboard varken kapat
            // (yani sistem menüsüne ihtiyaç duymadığımız durumda)
            if (!(isIOS && (window as any).Capacitor && !nativeClipboard)) {
              doc.addEventListener('contextmenu', (e) => {
                e.preventDefault()
              })
            }

            // EPUB içeriğinde herhangi bir dokunuşta açık context menüyü kapat
            // (özellikle mobilde text selection handle'larına dokunulduğunda)
            doc.addEventListener('touchstart', () => {
              setShowContextMenu(false)
              setPendingHighlight(null)
            })

            // Mobil veya Dokunmatik Cihazlarda:
            // - Seçim değiştiği anda context menüyü kapat
            // - Tam ekranda swipe/tap hareketlerini yönet
            if (isMobile || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)) {
              doc.addEventListener('selectionchange', () => {
                if (suppressNextSelectionRef.current) return
                setShowContextMenu(false)
                setPendingHighlight(null)
              })

              // Tam ekranda içerik üzerinde yatay swipe ve tap ile sayfa değiştir
              let touchStartX: number | null = null
              let touchStartY: number | null = null
              let touchStartTime: number | null = null

              const handleSwipeStart = (e: TouchEvent) => {
                if (!isFullscreenRef.current) return
                try {
                  const touch = e.touches[0]
                  if (!touch) return
                  touchStartX = touch.clientX
                  touchStartY = touch.clientY
                  touchStartTime = Date.now()
                } catch { }
              }

              const handleSwipeEnd = (e: TouchEvent) => {
                if (!isFullscreenRef.current) return

                const startX = touchStartX
                const startY = touchStartY
                const startTime = touchStartTime

                touchStartX = null
                touchStartY = null
                touchStartTime = null

                if (startX == null || startY == null || startTime == null) return

                try {
                  const touch = e.changedTouches[0]
                  if (!touch) return

                  const dx = touch.clientX - startX
                  const dy = touch.clientY - startY
                  const dt = Date.now() - startTime

                  const HORIZONTAL_THRESHOLD = 40  // piksel
                  const VERTICAL_THRESHOLD = 120   // dikey sapma limiti
                  const MAX_DURATION = 800         // ms

                  // Tap (kısa dokunuş) kontrolü: Tam ekran modunda kenarlara dokunarak sayfa değiştirme
                  if (dt < 300 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
                    const width = window.innerWidth
                    const clientX = touch.clientX
                    // Bazı durumlarda (column layout) clientX ekran genişliğinin katı kadar ötelenebiliyor.
                    // Bu yüzden mod alarak normalize ediyoruz.
                    const normalizedX = clientX % width

                    // Dokunma metin seçimi veya etkileşimli öğe üzerinde değilse
                    const target = e.target as HTMLElement | null
                    if (target && target.closest('a, button, input, textarea, select, label')) return

                    // Metin seçimi kontrolü (seçim varsa tap ile sayfa değişmesin)
                    try {
                      const sel = doc.getSelection?.()
                      if (sel && sel.toString().trim()) {
                        return
                      }
                    } catch { }

                    if (normalizedX < width * 0.20) {
                      // Event'i tamamen tüket
                      if (e.cancelable) e.preventDefault()
                      e.stopPropagation()
                      e.stopImmediatePropagation()

                      renditionRef.current?.prev?.()
                    } else if (normalizedX > width * 0.80) {
                      // Event'i tamamen tüket
                      if (e.cancelable) e.preventDefault()
                      e.stopPropagation()
                      e.stopImmediatePropagation()

                      renditionRef.current?.next?.()
                    }
                    return
                  }

                  // Çok uzun basılı tutma veya fazla dikey hareket: swipe sayma
                  if (dt > MAX_DURATION) return
                  if (Math.abs(dx) < HORIZONTAL_THRESHOLD) return
                  if (Math.abs(dy) > VERTICAL_THRESHOLD) return

                  // Bu dokunma metin seçimi ile sonuçlandıysa sayfa değiştirme (seçimi bozmayalım)
                  try {
                    const sel = doc.getSelection?.()
                    if (sel && sel.toString().trim()) {
                      return
                    }
                  } catch { }

                  const target = e.target as HTMLElement | null
                  if (target && target.closest('a, button, input, textarea, select, label')) {
                    return
                  }

                  // dx < 0: sola doğru swipe (sonraki sayfa)
                  if (dx < 0) {
                    renditionRef.current?.next?.()
                  } else {
                    // dx > 0: sağa doğru swipe (önceki sayfa)
                    renditionRef.current?.prev?.()
                  }
                } catch { }
              }

              doc.addEventListener('touchstart', handleSwipeStart, { passive: true })
              doc.addEventListener('touchend', handleSwipeEnd, { passive: false })
            }
          } catch (err) {
            console.log('EPUB content hook hatası:', err)
          }
        })
      } catch (err) {
        console.log('rendition.hooks.content.register hatası:', err)
      }
    }

    // Text selection event listener ekle (Android + Web için ana mekanizma, iOS için global handler kullanılır)
    rendition.on('selected', (cfiRange: string) => {
      // Eğer bastırma bayrağı aktifse, bu selection event'ini yok say
      if (suppressNextSelectionRef.current) {
        console.log('Rendition selection event bastırıldı')
        return
      }

      try {
        console.log('Text selected:', cfiRange)

        // iOS'ta selection'ı global handler üzerinden yönetiyoruz
        if (isIOS) {
          console.log('iOS: rendition selected event alındı, ancak global/polling handler kullanılacak')
          return
        }
        const range = rendition.getRange(cfiRange)
        const selectedText = range ? range.toString().trim() : ''

        if (selectedText && selectedText.length > 0) {
          console.log('Selected text:', selectedText)

          // Aynı metin tekrar seçilmişse menüyü açma
          if (selectedText === lastSelectedText) {
            console.log('Aynı metin tekrar seçildi, menü açılmıyor')
            return
          }

          // Mevcut bölüm bilgisini al
          const chapterTitle = currentChapter || ''

          setPendingHighlight({
            cfiRange,
            selectedText,
            chapterTitle
          })

          // Son seçilen metni kaydet
          setLastSelectedText(selectedText)

          // Android ve Web'de: seçime göre menüyü konumlandır
          const computeAndShowMenu = () => {
            try {
              const rect = range?.getBoundingClientRect()
              if (rect) {
                let x = rect.left + rect.width / 2
                // Menü yüksekliği yaklaşık olarak: 60 (header) + 4*44 (items) + 8 (padding) = ~264px
                const isMobileView = window.innerWidth < 768
                const estimatedMenuHeight = isMobileView ? 240 : 264
                const padding = 10

                // Önce seçimin altına yerleştirmeyi dene
                let y = rect.bottom + padding

                try {
                  const iframeEl =
                    ((range as any)?.startContainer as any)?.ownerDocument
                      ?.defaultView?.frameElement as HTMLIFrameElement | null
                  if (iframeEl) {
                    const iframeRect = iframeEl.getBoundingClientRect()
                    let globalY = iframeRect.top + y

                    // Eğer ekranın altına taşacaksa, seçimin üstüne yerleştir
                    if (globalY + estimatedMenuHeight > window.innerHeight - 10) {
                      y = rect.top - estimatedMenuHeight - padding
                      // Eğer hala üst kenara çok yakınsa, minimum padding bırak
                      if (iframeRect.top + y < 10) {
                        y = 10 - iframeRect.top
                      }
                    }

                    x = iframeRect.left + x
                    y = iframeRect.top + y
                  } else {
                    // iframe yoksa, global koordinatları kullan
                    let globalY = y
                    if (globalY + estimatedMenuHeight > window.innerHeight - 10) {
                      y = rect.top - estimatedMenuHeight - padding
                      if (y < 10) {
                        y = 10
                      }
                    }
                  }
                } catch { }

                setContextMenuPosition({ x, y })
              } else {
                setContextMenuPosition({
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2
                })
              }
              setShowContextMenu(true)

              // Android'de: seçim sonrası sayfa konumunun bozulmasını engellemek için
              // bulunduğumuz CFI konumunu tekrar yükle (özellikle bazı bölümlerde
              // sayfanın yarısının önceki, yarısının sonraki sayfa görünmesi hatasını azaltmak için)
              /*
              if (isAndroid && renditionRef.current && lastLocationRef.current) {
                try {
                  renditionRef.current.display(lastLocationRef.current)
                } catch (err) {
                  console.log('Android selection sonrası display hatası:', err)
                }
              }
              */
            } catch {
              setContextMenuPosition({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
              })
              setShowContextMenu(true)
            }
          }

          // Platforma göre menüyü ve haptics'i sadece seçim tamamlandığında göster
          if (isAndroid) {
            // Android'de: her yeni selection event'inde önce eski timeout'u iptal et
            if (androidSelectionTimeoutRef.current !== null) {
              window.clearTimeout(androidSelectionTimeoutRef.current)
            }
            // Seçim durulduktan kısa bir süre sonra (parmak kalktıktan sonra) menüyü aç
            androidSelectionTimeoutRef.current = window.setTimeout(() => {
              // Son timeout çalışırken, highlight bilgisi hâlâ geçerliyse menüyü göster
              try {
                if (haptics) {
                  haptics.impact({ style: 'light' }).catch(() => { })
                }
              } catch { }
              computeAndShowMenu()
              androidSelectionTimeoutRef.current = null
            }, 260)
          } else if (!isMobile) {
            // Desktop/Web: hemen göster, haptics varsa çalıştır
            try {
              if (haptics) {
                haptics.impact({ style: 'light' }).catch(() => { })
              }
            } catch { }
            computeAndShowMenu()
          }

          // Seçimi context menu kapandıktan sonra temizle
          // contents.window.getSelection().removeAllRanges() - KALDIRILDI: Kullanıcı seçimini bozuyor
        }
      } catch (error) {
        console.error('Text selection error:', error)
      }
    })

    // Gelişmiş tema ayarları - KAPSAMLI
    rendition.themes.register('light', {
      body: {
        color: '#1f2937',
        background: '#ffffff',
        'font-family': SYSTEM_FONT_STACK,
        'line-height': '1.6',
        'padding': '20px',
        'margin': '0',
      },
      'p, div, span, section, article': {
        color: '#1f2937',
        'background-color': 'transparent'
      },
      'h1, h2, h3, h4, h5, h6': {
        color: '#111827',
        'background-color': 'transparent'
      },
      'html, body': {
        'background-color': '#ffffff',
        color: '#1f2937'
      }
    })

    rendition.themes.register('dark', {
      body: {
        color: '#e5e7eb',
        background: '#0f172a',
        'font-family': SYSTEM_FONT_STACK,
        'line-height': '1.6',
        'padding': '20px',
        'margin': '0',
      },
      'p, div, span, section, article': {
        color: '#e5e7eb',
        'background-color': 'transparent'
      },
      'h1, h2, h3, h4, h5, h6': {
        color: '#f9fafb',
        'background-color': 'transparent'
      },
      'html, body': {
        'background-color': '#0f172a',
        color: '#e5e7eb'
      }
    })

    rendition.themes.register('sepia', {
      body: {
        color: '#3e2723',
        background: '#f4ecd8',
        'font-family': SYSTEM_FONT_STACK,
        'line-height': '1.6',
        'padding': '20px',
        'margin': '0',
      },
      'p, div, span, section, article': {
        color: '#3e2723',
        'background-color': 'transparent'
      },
      'h1, h2, h3, h4, h5, h6': {
        color: '#2d1f18',
        'background-color': 'transparent'
      },
      'html, body': {
        'background-color': '#f4ecd8',
        color: '#3e2723'
      }
    })

    rendition.themes.register('oled', {
      body: {
        color: '#e5e5e5',
        background: '#000000',
        'font-family': SYSTEM_FONT_STACK,
        'line-height': '1.6',
        'padding': '20px',
        'margin': '0',
      },
      'p, div, span, section, article': {
        color: '#e5e5e5',
        'background-color': 'transparent'
      },
      'h1, h2, h3, h4, h5, h6': {
        color: '#fafafa',
        'background-color': 'transparent'
      },
      'html, body': {
        'background-color': '#000000',
        color: '#e5e5e5'
      }
    })

    // Tam ekranda ekranın sağına/soluna tıklayarak sayfa değiştirme
    try {
      rendition.on('click', (event: any) => {
        try {
          // Sadece tam ekran modunda çalışsın
          if (!isFullscreenRef.current) return

          const target = event?.target as HTMLElement | null

          // Metin seçimi varken sayfa değiştirme (örneğin selection'ı düzeltmek isterken) tetiklenmesin
          if (hasActiveTextSelection()) return

          // Link, buton vb. etkileşimli elementlere tıklamayı bozma
          if (target) {
            if (target.closest('a, button, input, textarea, select, label')) {
              return
            }
          }

          // Tıklamanın konumuna göre yön belirle
          const view = (event?.view as Window | undefined) || target?.ownerDocument?.defaultView || window
          const localWindow = view || window
          const width = localWindow.innerWidth || window.innerWidth
          const clientX: number | undefined =
            (event && typeof event.clientX === 'number' && event.clientX) ||
            (event && typeof event.screenX === 'number' && event.screenX)

          if (!width || clientX == null) return

          const ratio = clientX / width

          // Sol 1/3: önceki sayfa, sağ 1/3: sonraki sayfa
          if (ratio < 0.33) {
            goToPrevious()
          } else if (ratio > 0.66) {
            goToNext()
          }
        } catch (clickErr) {
          console.log('Fullscreen click navigation error:', clickErr)
        }
      })
    } catch (err) {
      console.log('Rendition click handler eklenemedi:', err)
    }

    const initialSurface = resolveReaderSurface(readingAppearanceRef.current, isDarkModeRef.current)
    console.log('Uygulanacak okuma yüzeyi:', initialSurface)
    rendition.themes.select(initialSurface)

    // Font boyutunu uygula
    rendition.themes.fontSize(`${useReaderStore.getState().fontSize}%`)

    // İlk render sonrası inset/padding uygula
    setTimeout(() => applyReaderInsets(), 80)

    // Kitap bilgilerini ve TOC'u al
    if (rendition.book) {
      // TOC bilgilerini al
      rendition.book.loaded.navigation.then((navigation: any) => {
        if (navigation && navigation.toc) {
          setToc(navigation.toc)
          console.log('TOC yüklendi:', navigation.toc)
        }
      }).catch((error: any) => {
        console.warn('TOC yüklenirken hata:', error)
      })

      // Locations'ı oluştur (ilerleme hesaplama ve sayfa navigasyonu için)
      rendition.book.ready
        .then(() => {
          return rendition.book.locations.generate(1024) // 1024 karakterde bir konum oluştur
        })
        .then(() => {
          console.log('Locations oluşturuldu')
          try {
            const locations = rendition.book.locations
            if (locations && typeof locations.length === 'function') {
              const total = locations.length()
              if (typeof total === 'number' && !isNaN(total) && total > 0) {
                setTotalPages(total)
              }
            }
          } catch (err) {
            console.warn('Toplam sayfa sayısı hesaplanırken hata:', err)
          }
          // Locations hazır olduğunda highlight'ları render et
          renderHighlights()
        })
        .catch((error: any) => {
          console.warn('Locations oluşturulurken hata:', error)
        })
    }

    console.log('=== READER READY TAMAMLANDI ===')
  }, [currentChapter, applyReaderInsets, scrollMode, injectReaderThemeStyles])

  // Highlight'ları render et
  const renderHighlights = useCallback(() => {
    if (!renditionRef.current || highlights.length === 0) return

    try {
      console.log('Highlight render başlıyor, toplam:', highlights.length)

      // Mevcut highlight'ları temizle
      renditionRef.current.annotations.remove('highlight')

      // Color map tanımı
      const colorMap: { [key: string]: any } = {
        yellow: { fill: '#fef3c7', 'fill-opacity': '0.85', 'mix-blend-mode': 'normal' },
        blue: { fill: '#dbeafe', 'fill-opacity': '0.85', 'mix-blend-mode': 'normal' },
        green: { fill: '#d1fae5', 'fill-opacity': '0.85', 'mix-blend-mode': 'normal' },
        pink: { fill: '#fce7f3', 'fill-opacity': '0.85', 'mix-blend-mode': 'normal' },
        red: { fill: '#fee2e2', 'fill-opacity': '0.85', 'mix-blend-mode': 'normal' },
        purple: { fill: '#e9d5ff', 'fill-opacity': '0.85', 'mix-blend-mode': 'normal' }
      }

      // CSS fallback'i uygulayan yardımcı
      const applyCssHighlight = (highlight: any) => {
        const waitMs = isIOSDevice ? 1200 : 500
        setTimeout(() => {
          try {
            const iframes = document.querySelectorAll('.react-reader-container iframe')
            console.log(`CSS fallback başlıyor - ${iframes.length} iframe bulundu`)

            iframes.forEach((iframe: any, iframeIndex: number) => {
              try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
                if (iframeDoc) {
                  console.log(`iframe ${iframeIndex} işleniyor...`)

                  // Önce bu highlight'a ait eski span'leri temizle (tekrarlı wrap'i önlemek için)
                  try {
                    const existingSpans = iframeDoc.querySelectorAll(`span.highlight-${highlight.id}, [data-highlight-id="${highlight.id}"]`)
                    existingSpans.forEach((span: Element) => {
                      const text = span.textContent || ''
                      const textNode = iframeDoc.createTextNode(text)
                      span.replaceWith(textNode)
                    })
                  } catch (cleanupErr) {
                    console.log('Eski highlight span temizleme hatası:', cleanupErr)
                  }

                  // Highlight için CSS style ekle
                  const highlightStyle = iframeDoc.createElement('style')
                  const colorStyle = colorMap[highlight.color]
                  const highlightClass = `highlight-${highlight.id}`

                  highlightStyle.textContent = `
                    .${highlightClass} {
                      background-color: ${colorStyle?.fill || '#fef3c7'} !important;
                      opacity: ${colorStyle?.['fill-opacity'] || '0.85'} !important;
                      mix-blend-mode: normal !important;
                      padding: 2px 4px !important;
                      border-radius: 3px !important;
                      box-shadow: 0 0 0 1px rgba(0,0,0,0.15) !important;
                      cursor: pointer !important;
                      transition: all 0.2s ease !important;
                      font-weight: 500 !important;
                      color: #000000 !important;
                      -webkit-text-fill-color: #000000 !important;
                    }
                    .${highlightClass}:hover {
                      opacity: 1 !important;
                      transform: scale(1.02) !important;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.25) !important;
                    }
                  `

                  // Mevcut style'ı kontrol et
                  const existingStyle = iframeDoc.querySelector(`#style-${highlight.id}`)
                  if (!existingStyle) {
                    highlightStyle.id = `style-${highlight.id}`
                    iframeDoc.head.appendChild(highlightStyle)
                  }

                  // Önce tüm text'i topla ve kontrol et
                  const allText = iframeDoc.body.textContent || ''
                  console.log(`iframe ${iframeIndex} text uzunluğu:`, allText.length)
                  console.log(`Aranan text: "${highlight.selected_text}"`)
                  console.log(`Text mevcut mu:`, allText.includes(highlight.selected_text))

                  if (allText.includes(highlight.selected_text)) {
                    // Gelişmiş text bulma - multiple approaches
                    let foundAndHighlighted = false

                    // Approach 1: TreeWalker ile tam eşleşme
                    const walker = iframeDoc.createTreeWalker(
                      iframeDoc.body,
                      NodeFilter.SHOW_TEXT,
                      null
                    )

                    let node: any
                    // @ts-ignore - while ile atama
                    while (node = walker.nextNode() && !foundAndHighlighted) {
                      if (node.textContent && node.textContent.includes(highlight.selected_text)) {
                        console.log(`Text node bulundu: "${node.textContent.substring(0, 100)}..."`)
                        const parent = node.parentElement
                        if (parent && !parent.querySelector(`.${highlightClass}`)) {
                          // Inline text highlighting
                          try {
                            const text = node.textContent
                            const startIndex = text.indexOf(highlight.selected_text)

                            if (startIndex >= 0) {
                              const before = text.substring(0, startIndex)
                              const highlightText = highlight.selected_text
                              const after = text.substring(startIndex + highlightText.length)

                              const fragment = iframeDoc.createDocumentFragment()

                              if (before) {
                                fragment.appendChild(iframeDoc.createTextNode(before))
                              }

                              const span = iframeDoc.createElement('span')
                              span.className = highlightClass
                              span.textContent = highlightText
                              span.setAttribute('data-highlight-id', highlight.id)
                              span.setAttribute('data-highlight-text', highlight.selected_text)
                              span.style.cursor = 'pointer'

                              // Highlight'a tıklama event'i ekle
                              span.addEventListener('click', (e: Event) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('Highlight span tıklandı:', highlight.id, highlight.selected_text)

                                // Highlight panel'ini aç
                                setShowHighlights(true)

                                // Haptic feedback
                                if (haptics) {
                                  haptics.impact({ style: 'light' }).catch(() => { })
                                }
                              })

                              fragment.appendChild(span)

                              if (after) {
                                fragment.appendChild(iframeDoc.createTextNode(after))
                              }

                              parent.replaceChild(fragment, node)
                              foundAndHighlighted = true
                              console.log(`Text node highlight başarılı`)
                            }
                          } catch (nodeError) {
                            console.log('Text node highlight hatası:', nodeError)
                          }
                        }
                      }
                    }

                    // Approach 2: Eğer tam eşleşme bulunamazsa, basit DOM query
                    if (!foundAndHighlighted) {
                      console.log(`TreeWalker başarısız, DOM query deneniyor...`)
                      try {
                        // Tüm text node'ları topla
                        const textNodes: Node[] = []
                        const collectTextNodes = (element: Node) => {
                          if (element.nodeType === Node.TEXT_NODE) {
                            textNodes.push(element)
                          } else {
                            element.childNodes.forEach(collectTextNodes)
                          }
                        }
                        collectTextNodes(iframeDoc.body)

                        console.log(`${textNodes.length} text node bulundu`)

                        for (const textNode of textNodes) {
                          if (textNode.textContent && textNode.textContent.includes(highlight.selected_text)) {
                            console.log(`DOM query ile text bulundu: "${textNode.textContent.substring(0, 50)}..."`)
                            const parent = (textNode as any).parentElement as HTMLElement | null
                            if (parent && !parent.querySelector(`.${highlightClass}`)) {
                              const text = textNode.textContent
                              const startIndex = text.indexOf(highlight.selected_text)

                              if (startIndex >= 0) {
                                const before = text.substring(0, startIndex)
                                const highlightText = highlight.selected_text
                                const after = text.substring(startIndex + highlightText.length)

                                const fragment = iframeDoc.createDocumentFragment()

                                if (before) fragment.appendChild(iframeDoc.createTextNode(before))

                                const span = iframeDoc.createElement('span')
                                span.className = highlightClass
                                span.textContent = highlightText
                                span.setAttribute('data-highlight-id', highlight.id)
                                span.setAttribute('data-highlight-text', highlight.selected_text)
                                span.style.cursor = 'pointer'

                                // Highlight'a tıklama event'i ekle
                                span.addEventListener('click', (e: Event) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  console.log('Highlight span tıklandı:', highlight.id, highlight.selected_text)

                                  // Highlight panel'ini aç
                                  setShowHighlights(true)

                                  // Haptic feedback
                                  if (haptics) {
                                    haptics.impact({ style: 'light' }).catch(() => { })
                                  }
                                })

                                fragment.appendChild(span)

                                if (after) fragment.appendChild(iframeDoc.createTextNode(after))

                                parent.replaceChild(fragment, textNode)
                                foundAndHighlighted = true
                                console.log(`DOM query highlight başarılı`)
                                break
                              }
                            }
                          }
                        }
                      } catch (domError) {
                        console.log('DOM query hatası:', domError)
                      }
                    }

                    if (foundAndHighlighted) {
                      console.log(`✅ Highlight ${highlight.id} CSS ile eklendi`)
                    } else {
                      console.log(`⚠️ Highlight ${highlight.id} tüm yöntemler başarısız`)
                    }
                  } else {
                    console.log(`⚠️ iframe ${iframeIndex}'de text bulunamadı`)
                  }
                }
              } catch (cssError) {
                console.log('CSS highlight hatası:', cssError)
              }
            })
          } catch (generalError) {
            console.error('CSS highlight genel hatası:', generalError)
          }
        }, waitMs)
      }

      const isAndroid = /Android/i.test(navigator.userAgent)
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      const isWeb = !isAndroid && !isIOSDevice

      // Yeni highlight'ları ekle
      highlights.forEach((highlight, index) => {
        try {
          console.log(`Highlight ${index + 1} render ediliyor:`, highlight)

          // CFI range'i al - orijinal formatı koru
          let cleanCfiRange = highlight.cfi_range

          console.log('Orijinal CFI range:', cleanCfiRange)

          // iOS CFI formatını kontrol et - daha geniş pattern
          const isIOSFormat = cleanCfiRange.includes('!/4/4[id') && cleanCfiRange.includes('):')

          console.log('CFI format kontrolü:', {
            hasIdPattern: cleanCfiRange.includes('!/4/4[id'),
            hasColonParen: cleanCfiRange.includes('):'),
            isIOSFormat,
            cfi: cleanCfiRange
          })

          if (isIOSFormat) {
            console.log('iOS CFI formatı tespit edildi, orijinal format korunuyor')
          } else {
            console.log('Web CFI formatı tespit edildi')
          }

          // Tüm platformlarda: Annotation'ı atla, doğrudan CSS highlight uygula (tutarlılık ve siyah yazı)
          console.log('Tüm platformlarda CSS highlight uygulanıyor')
          applyCssHighlight(highlight)
          return

          // Android ve Web: Annotation'ı atla, doğrudan CSS fallback uygula (siyah yazı için tutarlı)
          if (isAndroid || isWeb) {
            console.log(`${isAndroid ? 'Android' : 'Web'} tespit edildi: Annotation atlanıyor, CSS highlight uygulanıyor`)
            applyCssHighlight(highlight)
            return
          }

          // Highlight'ı ekle - Önce annotation dene, başarısızsa CSS fallback
          try {
            console.log(`Highlight ${index + 1} annotation API ile deneniyor...`)
            renditionRef.current.annotations.add(
              'highlight',
              cleanCfiRange,
              {},
              null,
              'hl',
              colorMap[highlight.color] || colorMap.yellow
            )
            console.log(`✅ Highlight ${index + 1} annotation ile başarıyla render edildi`)
          } catch (annotationError) {
            console.warn(`❌ Highlight ${index + 1} annotation başarısız, CSS fallback kullanılıyor:`, annotationError)

            // CSS-based highlight fallback (hem iOS hem Web için)
            applyCssHighlight(highlight)
          }

          // ... existing code ...
        } catch (error) {
          console.error('Highlight render hatası:', error)
        }
      })

      console.log('Tüm highlight\'lar render edildi')

    } catch (error) {
      console.error('Render highlights genel hatası:', error)
    }
  }, [highlights])

  // Highlight'lar değiştiğinde render et
  useEffect(() => {
    if (renditionRef.current) {
      renderHighlights()
    }
  }, [highlights, renderHighlights])

  const locationChanged = (epubcifi: string | number) => {
    // epubcifi: 'epubcfi(/6/14!/4/2/2/2/2:0)'
    if (!epubcifi) return

    // Debug log for location change
    console.log('Location changed:', {
      previous: location,
      new: epubcifi,
      currentChapter,
      progressPercentage
    })

    setLocation(epubcifi)

    // YENİ: Tekrarlanan sayfa kaydını önlemek için debounce
    // Eğer aynı konumu tekrar kaydediyorsak ve son kayıt üzerinden 2 saniye geçmediyse kaydetme
    // Ancak ilk açılışta (lastLocationRef.current === 0) kaydetmeye izin ver
    if (epubcifi === lastLocationRef.current && lastLocationRef.current !== 0) {
      // Sadece zaman kontrolü
      // ...
    }
    lastLocationRef.current = epubcifi

    // İlerleme yüzdesini ve sayfa bilgilerini hesapla
    if (renditionRef.current) {
      const rendition = renditionRef.current
      const book = rendition.book

      try {
        // Mevcut sayfa/bölüm bilgilerini al
        if (rendition.location) {
          const location = rendition.location
          if (location.start) {
            // Mevcut bölüm bilgisini güncelle
            const currentSpine = book.spine.get(location.start.href)
            if (currentSpine) {
              setCurrentChapter(
                currentSpine.navitem?.label ||
                currentSpine.href ||
                t('reader.unknownChapter')
              )
            }
          }
        }

        // Global sayfa ve toplam sayfa bilgilerini al (locations API ile)
        if (book?.locations && typeof book.locations.length === 'function' && book.locations.length()) {
          try {
            const total = book.locations.length()
            if (typeof total === 'number' && !isNaN(total) && total > 0) {
              if (total !== totalPages) {
                setTotalPages(total)
              }
              const percentage = book.locations.percentageFromCfi(String(epubcifi))
              if (typeof percentage === 'number' && !isNaN(percentage)) {
                let page = Math.round(percentage * total)
                if (!page || page < 1) page = 1
                if (page > total) page = total
                setCurrentPage(page)
                setPageInput(String(page))
              }
            }
          } catch (pageError) {
            console.warn('Global sayfa bilgileri alınırken hata:', pageError)
          }
        }
      } catch (error) {
        console.warn('Sayfa bilgileri alınırken hata:', error)
      }

      // İlerleme yüzdesini hesapla - Gelişmiş sistem
      calculateAdvancedProgress(book, String(epubcifi))
    }

    // Mevcut konumun bookmark olup olmadığını kontrol et
    checkCurrentBookmark(String(epubcifi))

    // Yeni bölüme/geçerli konuma geçildiğinde highlight'ları yeniden uygula
    if (renditionRef.current && highlights.length > 0) {
      setTimeout(() => {
        try {
          renderHighlights()
        } catch (err) {
          console.error('locationChanged highlight re-render hatası:', err)
        }
      }, 600)
    }
  }

  // Highlight fonksiyonları
  const handleSaveHighlight = async (color: string, note: string) => {
    if (!pendingHighlight || !userId || !bookId) {
      // Guest mode - show login prompt
      if (!userId) onLoginRequired?.()
      return
    }

    try {
      const highlightId = await addHighlight(
        userId,
        bookId,
        pendingHighlight.cfiRange,
        pendingHighlight.selectedText,
        color as any,
        note || undefined,
        pendingHighlight.chapterTitle
      )

      if (highlightId) {
        const newHighlight: Highlight = {
          id: highlightId,
          user_id: userId,
          book_id: bookId,
          cfi_range: pendingHighlight.cfiRange,
          selected_text: pendingHighlight.selectedText,
          color: color as any,
          note: note || undefined,
          chapter_title: pendingHighlight.chapterTitle,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setHighlights([...highlights, newHighlight])

        // PostHog: Track highlight created
        trackEvent({
          event: 'risaleinurai_highlight_created',
          properties: {
            book_id: bookId,
            color: color
          }
        })

        showToastMessage(t('reader.toasts.highlightAdded'), 'success')
      }
    } catch (error) {
      console.error('Highlight kaydetme hatası:', error)
      showToastMessage(t('reader.toasts.highlightAddError'), 'error')
    }

    setPendingHighlight(null)
  }

  const handleUpdateHighlight = async (color: string, note: string) => {
    if (!editingHighlight) return

    try {
      const success = await updateHighlight(editingHighlight.id, { color: color as any, note: note || undefined })

      if (success) {
        setHighlights(highlights.map(h =>
          h.id === editingHighlight.id
            ? { ...h, color: color as any, note: note || undefined, updated_at: new Date().toISOString() }
            : h
        ))
        showToastMessage(t('reader.toasts.highlightUpdated'), 'success')
      }
    } catch (error) {
      console.error('Highlight güncelleme hatası:', error)
      showToastMessage(t('reader.toasts.highlightUpdateError'), 'error')
    }

    setEditingHighlight(null)
  }

  const handleDeleteHighlight = async (highlightId: string) => {
    try {
      const success = await deleteHighlight(highlightId)

      if (success) {
        setHighlights(highlights.filter(h => h.id !== highlightId))
        showToastMessage(t('reader.toasts.highlightDeleted'), 'success')
      }
    } catch (error) {
      console.error('Highlight silme hatası:', error)
      showToastMessage(t('reader.toasts.highlightDeleteError'), 'error')
    }
  }

  const showToastMessage = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setShowToast({ message, type })
    setTimeout(() => setShowToast(null), 3000)
  }

  // Seçimleri temizle ve kısa süreli selection event'lerini bastır
  const clearSelectionsAndSuppress = (suppressMs: number = 500) => {
    // Bastırma bayrağı
    suppressNextSelectionRef.current = true
    setTimeout(() => {
      suppressNextSelectionRef.current = false
    }, suppressMs)

    // Ana pencere seçimini temizle ve kullanıcı seçimini geçici olarak devre dışı bırak
    try {
      const selection = window.getSelection()
      if (selection) selection.removeAllRanges()
      const activeEl = document.activeElement as HTMLElement | null
      if (activeEl && typeof activeEl.blur === 'function') activeEl.blur()
      const setUserSelect = (el: HTMLElement | null, value: string) => {
        if (!el) return
          ; (el.style as any).webkitUserSelect = value
        el.style.userSelect = value
      }
      setUserSelect(document.documentElement, 'none')
      setUserSelect(document.body, 'none')
      setTimeout(() => {
        setUserSelect(document.documentElement, '')
        setUserSelect(document.body, '')
      }, 350)
    } catch { }

    // iframe'lerdeki seçimleri temizle ve user-select'i geçici olarak kapat
    const iframes = document.querySelectorAll('.react-reader-container iframe')
    iframes.forEach((iframe: any) => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (iframeDoc) {
          const sel = iframeDoc.getSelection()
          if (sel) sel.removeAllRanges()
          const activeEl = iframeDoc.activeElement as HTMLElement | null
          if (activeEl && typeof (activeEl as any).blur === 'function') (activeEl as any).blur()
          const setUserSelect = (el: HTMLElement | null, value: string) => {
            if (!el) return
              ; (el.style as any).webkitUserSelect = value
            el.style.userSelect = value
          }
          setUserSelect(iframeDoc.documentElement, 'none')
          setUserSelect(iframeDoc.body, 'none')
          setTimeout(() => {
            setUserSelect(iframeDoc.documentElement, '')
            setUserSelect(iframeDoc.body, '')
          }, 350)
        }
      } catch { }
    })
  }

  // Context menu handlers
  const handleHighlightFromContext = () => {
    // Önce context menüyü kapat
    setShowContextMenu(false)

    // Son seçilen metni hatırla (aynı seçimde tekrar menü açılmasını engelle)
    if (pendingHighlight?.selectedText) {
      setLastSelectedText(pendingHighlight.selectedText)
    }

    // Tüm seçimleri temizle ve selection event'ini kısa süre bastır
    clearSelectionsAndSuppress(500)

    // Ardından highlight modalını aç
    setShowHighlightModal(true)
  }

  const handleCopyFromContext = async () => {
    const text = pendingHighlight?.selectedText
    if (!text || !text.trim()) {
      setShowContextMenu(false)
      setPendingHighlight(null)
      return
    }

    // iOS + Capacitor ortamında ve native Clipboard eklentisi yoksa,
    // programatik kopyalama genellikle başarısız oluyor. Bu durumda
    // kullanıcıya sistemin kendi "Kopyala" menüsünü kullanmasını söyle.
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    const isCapacitorEnv = typeof window !== 'undefined' && (window as any).Capacitor

    if (isIOS && isCapacitorEnv && !nativeClipboard) {
      showToastMessage(t('reader.toasts.copySystem'), 'info')
      setShowContextMenu(false)
      setPendingHighlight(null)
      return
    }

    let copied = false

    // 1) Capacitor Clipboard (native) – özellikle iOS için
    if (!copied && nativeClipboard) {
      try {
        await nativeClipboard.write({ string: text })
        copied = true
      } catch (err) {
        console.log('Native clipboard yazma hatası:', err)
      }
    }

    // 2) Modern Web API
    if (!copied && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        copied = true
      } catch (err) {
        console.log('navigator.clipboard hata:', err)
      }
    }

    // 3) Eski execCommand fallback (WebView / eski browser)
    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.top = '-1000px'
        textarea.style.left = '-1000px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (ok) {
          copied = true
        }
      } catch (err) {
        console.log('execCommand copy hata:', err)
      }
    }

    if (copied) {
      showToastMessage(t('reader.toasts.copySuccess'), 'success')
    } else {
      showToastMessage(t('reader.toasts.copyError'), 'error')
    }

    setShowContextMenu(false)
    setPendingHighlight(null)
  }

  const handleSearchFromContext = () => {
    if (pendingHighlight?.selectedText) {
      const searchQuery = encodeURIComponent(pendingHighlight.selectedText)
      window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank')
      showToastMessage(t('reader.toasts.searchOpened'), 'info')
    }
    setShowContextMenu(false)
    setPendingHighlight(null)
  }

  const handleCloseContextMenu = () => {
    setShowContextMenu(false)
    setPendingHighlight(null)

    // Tüm seçimleri temizle ve selection event'ini kısa süre bastır
    clearSelectionsAndSuppress(500)
  }

  const handleHighlightClick = (highlight: Highlight) => {
    if (renditionRef.current) {
      console.log('Highlight tıklandı:', highlight)

      // Toast mesajı göster
      showToastMessage(t('reader.toasts.navigatingTo', { quote: `${highlight.selected_text.substring(0, 50)}${highlight.selected_text.length > 50 ? '...' : ''}` }), 'info')

      try {
        // CFI range'i temizle ve parse et
        let cleanCfiRange = (highlight.cfi_range || '').trim()

        // Eğer CFI bir range ise (ör: epubcfi(...):0,38), sadece ilk epubcfi(...) kısmını al
        const rangeMatch = cleanCfiRange.match(/^(epubcfi\([^)]*\))/)
        if (rangeMatch && rangeMatch[1]) {
          cleanCfiRange = rangeMatch[1]
        }

        // iOS CFI formatını kontrol et
        const isIOSFormat = cleanCfiRange.includes('!/4/4[id') && cleanCfiRange.includes('):')

        console.log('Navigation CFI kontrolü:', {
          cfi: cleanCfiRange,
          isIOSFormat,
          originalCfi: highlight.cfi_range
        })

        if (isIOSFormat) {
          console.log('iOS highlight tıklandı, özel navigation kullanılıyor')

          // iOS CFI'den spine bilgilerini çıkar - daha geniş pattern
          const iosCfiPatterns = [
            /epubcfi\(\/6\/(\d+)!\/4\/4\[id\d+\]/,
            /epubcfi\(\/6\/(\d+)/,
            /\/6\/(\d+)/
          ]

          let spineIndex = -1
          for (const pattern of iosCfiPatterns) {
            const match = cleanCfiRange.match(pattern)
            if (match && match[1]) {
              spineIndex = parseInt(match[1])
              console.log('iOS spine index bulundu:', spineIndex, 'pattern:', pattern)
              break
            }
          }

          if (spineIndex >= 0 && renditionRef.current.book && renditionRef.current.book.spine) {
            try {
              // Spine item'ı bul
              const spineItems = renditionRef.current.book.spine.items
              if (spineItems && spineItems[spineIndex]) {
                const spineItem = spineItems[spineIndex]
                console.log('iOS spine item bulundu:', spineItem.href, 'index:', spineIndex)

                // Önce spine item'a git
                renditionRef.current.display(spineItem.href)

                // Sonra CFI range'i uygula (eğer mümkünse)
                setTimeout(() => {
                  try {
                    // Temizlenmiş CFI ile navigation dene
                    const cleanCfi = cleanCfiRange.replace(/epubcfi\(/, '').replace(/\)$/, '')
                    console.log('Temizlenmiş CFI ile navigation deneniyor:', cleanCfi)
                    renditionRef.current.display(cleanCfi)
                  } catch (cfiError) {
                    console.log('CFI navigation hatası, spine item\'da kalınıyor:', cfiError)
                  }
                }, 500)
              } else {
                console.log('iOS spine item bulunamadı, orijinal CFI ile deneniyor')
                renditionRef.current.display(cleanCfiRange)
              }
            } catch (error) {
              console.error('iOS spine navigation hatası:', error)
              renditionRef.current.display(cleanCfiRange)
            }
          } else {
            console.log('iOS spine erişimi yok veya index bulunamadı, orijinal CFI ile deneniyor')
            renditionRef.current.display(cleanCfiRange)
          }
        } else {
          console.log('Web highlight, normal navigation kullanılıyor')

          // Web CFI için de temizleme yap
          try {
            // CFI'yi kullan ve navigation dene
            const webCfi = cleanCfiRange
            console.log('Web CFI kullanılacak:', webCfi)
            renditionRef.current.display(webCfi)
          } catch (webError) {
            console.error('Web CFI navigation hatası, orijinal ile deneniyor:', webError)
            renditionRef.current.display(cleanCfiRange)
          }
        }

        // Navigasyon sonrası highlight'ları yeniden render et (yeni bölüm iframe'leri için)
        setTimeout(() => {
          try {
            renderHighlights()
          } catch (reErr) {
            console.error('Highlight re-render hatası:', reErr)
          }
        }, 600)

        // Highlight panel'i kapat
        setShowHighlights(false)

        // Haptic feedback (iOS için)
        if (haptics) {
          haptics.impact({ style: 'light' }).catch(() => { })
        }

      } catch (error) {
        console.error('Highlight navigation genel hatası:', error)

        // Hata durumunda fallback olarak orijinal CFI'yi dene
        try {
          renditionRef.current.display(highlight.cfi_range)
          setShowHighlights(false)
        } catch (fallbackError) {
          console.error('Fallback navigation da başarısız:', fallbackError)
        }
      }
    }
  }

  const handleEditHighlight = (highlight: Highlight) => {
    setEditingHighlight(highlight)
    setShowHighlightModal(true)
  }

  // EPUB doğrudan URL ile açılır (blob indirme yok); epub.js parça parça okur.
  useEffect(() => {
    if (!displayUrl) {
      setError(t('reader.invalidUrl'))
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
  }, [displayUrl, bookUrl, t])

  useEffect(() => {
    contentDocsRef.current.clear()
    hasNavigatedToInitialHighlightRef.current = false
    hasNavigatedToInitialLocationRef.current = false
  }, [bookId, bookUrl])

  // Kullanıcı verilerini yükle (ilerleme ve bookmark'lar)
  useEffect(() => {
    const loadUserData = async () => {
      if (userId && bookId && displayUrl) {
        try {
          // İlerleme verilerini yükle
          const progress = await getReadingProgress(userId, bookId)
          if (progress) {
            setProgressPercentage(progress.progress_percentage)
            // Eğer dışarıdan başlangıç konumu belirtilmemişse, ilerleme konumuna git
            if (!initialLocation && renditionRef.current && progress.current_location) {
              renditionRef.current.display(progress.current_location)
            }
          } else {
            // Henüz ilerleme yok, varsayılan değerlerle başla
            setProgressPercentage(0)
            console.log('Yeni okuma başlatılıyor')
          }

          // Bookmark'ları yükle
          const userBookmarks = await getBookmarks(userId, bookId)
          setBookmarks(userBookmarks || [])

          // Highlight'ları yükle
          const userHighlights = await getHighlights(userId, bookId)
          setHighlights(userHighlights || [])
        } catch (error) {
          console.warn('Kullanıcı verileri yüklenirken hata:', error)
          // Hata durumunda varsayılan değerlerle devam et
          setProgressPercentage(0)
          setBookmarks([])
          setHighlights([])
        }
      }
    }

    loadUserData()
  }, [userId, bookId, displayUrl, initialLocation])

  // Global listeden gelen ilk vurgulama için, highlight'lar yüklendikten sonra
  // aynı handleHighlightClick mantığını kullanarak navigate et
  useEffect(() => {
    if (!initialHighlightCfi || hasNavigatedToInitialHighlightRef.current) return
    if (!highlights || highlights.length === 0) return

    const target = highlights.find(h => h.cfi_range === initialHighlightCfi)
    if (!target) return

    hasNavigatedToInitialHighlightRef.current = true
    handleHighlightClick(target)
  }, [initialHighlightCfi, highlights])

  // Global listeden gelen ilk yer işareti (bookmark) için, rendition hazır olduktan sonra
  // explicit olarak konuma git. ReactReader'ın location prop'u bazen erken set edildiğinde
  // içerik tam render olmayabiliyor, bu yüzden rendition hazır olduktan sonra display() çağrısı yapıyoruz.
  useEffect(() => {
    if (!initialLocation || hasNavigatedToInitialLocationRef.current) return
    if (!renditionRef.current) return
    // Loading bitene kadar bekle
    if (isLoading) return

    console.log('Bookmark navigation: initialLocation ile gidiliyor:', initialLocation)
    hasNavigatedToInitialLocationRef.current = true

    // Rendition hazır, explicit olarak konuma git
    try {
      renditionRef.current.display(initialLocation)

      // Navigasyon sonrası highlight'ları yeniden render et
      setTimeout(() => {
        try {
          if (highlights && highlights.length > 0) {
            renderHighlights()
          }
        } catch (err) {
          console.error('Bookmark navigation highlight re-render hatası:', err)
        }
      }, 600)
    } catch (error) {
      console.error('Bookmark navigation hatası:', error)
    }
  }, [initialLocation, isLoading, highlights])

  const goToNext = () => {
    if (renditionRef.current) {
      renditionRef.current.next()
    }
  }

  const goToPrevious = () => {
    if (renditionRef.current) {
      renditionRef.current.prev()
    }
  }

  const goToPage = (page: number) => {
    if (!renditionRef.current || !page) return

    try {
      const book = (renditionRef.current as any).book
      const locations = book?.locations

      if (!locations || typeof locations.length !== 'function' || !locations.length()) {
        return
      }

      const total = locations.length()
      if (!total || isNaN(total)) return

      const clampedPage = Math.max(1, Math.min(total, Math.floor(page)))
      const percentage = (clampedPage - 0.5) / total

      const cfi =
        typeof locations.cfiFromPercentage === 'function'
          ? locations.cfiFromPercentage(percentage)
          : null

      if (cfi) {
        renditionRef.current.display(cfi)
      }
    } catch (error) {
      console.error('Sayfaya gitme hatası:', error)
    }
  }

  const submitPageInput = () => {
    const value = parseInt(pageInput, 10)
    if (!isNaN(value)) {
      goToPage(value)
    }
  }

  // Ortak yardımcı: herhangi bir yerde (iframe'ler + pencere) aktif metin seçimi var mı?
  const hasActiveTextSelection = useCallback((): boolean => {
    try {
      const iframes = document.querySelectorAll<HTMLIFrameElement>('.react-reader-container iframe')
      for (const iframe of Array.from(iframes)) {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
          const sel = iframeDoc?.getSelection?.()
          if (sel && sel.toString().trim()) {
            return true
          }
        } catch { }
      }

      const winSel = window.getSelection?.()
      if (winSel && winSel.toString().trim()) {
        return true
      }
    } catch { }
    return false
  }, [])

  // Native (iOS) gesture köprüsü: nativeReaderTap / nativeReaderSwipe
  useEffect(() => {
    const handleNativeTap = (event: any) => {
      if (!isFullscreenRef.current) return
      // Metin seçimi varken native tap ile sayfa değiştirme
      if (hasActiveTextSelection()) return

      const x = event?.detail?.x
      if (typeof x !== 'number') return

      if (x < 0.33) {
        goToPrevious()
      } else if (x > 0.66) {
        goToNext()
      }
    }

    const handleNativeSwipe = (event: any) => {
      if (!isFullscreenRef.current) return
      // Metin seçimi varken native swipe ile sayfa değiştirme
      if (hasActiveTextSelection()) return

      const direction = event?.detail
      if (direction === 'next') {
        goToNext()
      } else if (direction === 'prev') {
        goToPrevious()
      }
    }

    window.addEventListener('nativeReaderTap', handleNativeTap as any)
    window.addEventListener('nativeReaderSwipe', handleNativeSwipe as any)

    return () => {
      window.removeEventListener('nativeReaderTap', handleNativeTap as any)
      window.removeEventListener('nativeReaderSwipe', handleNativeSwipe as any)
    }
  }, [goToNext, goToPrevious, hasActiveTextSelection])

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
      if (renditionRef.current) {
        try {
          renditionRef.current.themes.select(surface)
        } catch { /* ignore */ }
        setTimeout(() => syncReaderThemeToIframes(surface), 100)
      } else {
        setTimeout(() => syncReaderThemeToIframes(surface), 100)
      }
    },
    [setDarkMode, syncReaderThemeToIframes]
  )

  const changeFontSize = useCallback((newSize: number) => {
    useReaderStore.getState().setFontSize(newSize)
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${newSize}%`)
    }
  }, [])

  const resetReader = () => {
    if (renditionRef.current) {
      renditionRef.current.display()
      setProgressPercentage(0)
    }
  }

  const toggleBookmark = async () => {
    if (!userId || !bookId) {
      // Guest mode - show login prompt
      onLoginRequired?.()
      return
    }
    try {
      if (isBookmarked) {
        // Mevcut bookmark'ı sil
        const currentBookmark = bookmarks.find(b => b.location === location)
        if (currentBookmark) {
          await deleteBookmark(currentBookmark.id)
          setBookmarks(bookmarks.filter(b => b.id !== currentBookmark.id))
          setIsBookmarked(false)
        }
      } else {
        // Bookmark not ekleme modalını aç
        setPendingBookmarkLocation(location as string)
        setShowBookmarkNoteModal(true)
      }
    } catch (error) {
      console.error('Bookmark işlemi hatası:', error)
    }
  }

  const handleAddBookmarkWithNote = async (note: string) => {
    if (!userId || !bookId || !pendingBookmarkLocation) return

    try {
      const chapterTitleForBookmark = currentChapter || ''

      // Mevcut sayfa ve ilerleme bilgilerini hesapla
      let bookmarkNote = note.trim()

      // Eğer not boşsa, varsayılan bilgileri ekle
      if (!bookmarkNote) {
        if (currentPage > 0 && totalPages > 0) {
          bookmarkNote = `${t('reader.pageShort')} ${currentPage}/${totalPages}`
        } else if (currentChapter) {
          bookmarkNote = currentChapter
        } else {
          bookmarkNote = t('reader.bookmark')
        }
      } else {
        // Not varsa, sayfa bilgisini de ekle (eğer varsa)
        if (currentPage > 0 && totalPages > 0) {
          bookmarkNote = `${bookmarkNote}\n${t('reader.pageShort')} ${currentPage}/${totalPages}`
        }
      }

      // Locations API ile yüzde hesaplamayı dene ve ekle
      if (renditionRef.current?.book?.locations) {
        try {
          const percentage = renditionRef.current.book.locations.percentageFromCfi(pendingBookmarkLocation)
          if (typeof percentage === 'number' && !isNaN(percentage)) {
            const percentageRounded = Math.round(percentage * 100)
            // Yüzde bilgisini mevcut nota ekle
            if (bookmarkNote.includes('\n')) {
              // Zaten satır sonu varsa, yüzde bilgisini ekle
              bookmarkNote = `${bookmarkNote} (%${percentageRounded})`
            } else {
              // Satır sonu yoksa, yeni satır ekle
              bookmarkNote = `${bookmarkNote}\n%${percentageRounded}`
            }
          }
        } catch (error) {
          console.log('Yüzde hesaplama hatası:', error)
        }
      }

      // Eski yüzde hesaplama kodu kaldırıldı, yukarıda yeni kod var

      const bookmarkId = await addBookmark(userId, bookId, pendingBookmarkLocation, bookmarkNote, chapterTitleForBookmark)
      if (bookmarkId) {
        const newBookmark: BookmarkType = {
          id: bookmarkId,
          user_id: userId,
          book_id: bookId,
          location: pendingBookmarkLocation,
          note: bookmarkNote,
          chapter_title: chapterTitleForBookmark,
          created_at: new Date().toISOString()
        }
        setBookmarks([...bookmarks, newBookmark])
        setIsBookmarked(true)

        // PostHog: Track bookmark created
        trackEvent({
          event: 'risaleinurai_bookmark_created',
          properties: {
            book_id: bookId
          }
        })
      }
    } catch (error) {
      console.error('Bookmark ekleme hatası:', error)
    }
  }

  // Yer işareti için detaylı konum bilgisi oluştur
  const getBookmarkLocationInfo = (bookmark: BookmarkType): { title: string; details: string } => {
    // Eğer kaydedilmiş sayfa bilgisi varsa ve geçerliyse onu kullan
    if (bookmark.note && bookmark.note.trim() !== '' && bookmark.note !== 'undefined') {
      return {
        title: bookmark.chapter_title || t('reader.bookmark'),
        details: bookmark.note
      }
    }

    // Eğer chapter_title varsa onu kullan
    if (bookmark.chapter_title && bookmark.chapter_title.trim() !== '') {
      const details: string[] = []

      // Ek bilgileri hesapla
      if (bookmark.location && renditionRef.current?.book?.locations) {
        try {
          const percentage = renditionRef.current.book.locations.percentageFromCfi(bookmark.location)
          if (typeof percentage === 'number' && !isNaN(percentage)) {
            const percentageRounded = Math.round(percentage * 100)
            details.push(`%${percentageRounded}`)

            if (totalPages > 0) {
              const estimatedPage = Math.max(1, Math.min(totalPages, Math.round(percentage * totalPages)))
              details.push(`${t('reader.pageShort')} ${estimatedPage}/${totalPages}`)
            }
          }
        } catch (error) {
          console.log('Percentage hesaplama hatası:', error)
        }
      }

      return {
        title: bookmark.chapter_title,
        details: details.join(' • ')
      }
    }

    // CFI'den konum bilgisi çıkar
    if (bookmark.location) {
      try {
        const details: string[] = []
        let title = t('reader.bookmark')



        // Sayfa ve yüzde bilgisi
        if (renditionRef.current?.book?.locations) {
          try {
            const percentage = renditionRef.current.book.locations.percentageFromCfi(bookmark.location)
            if (typeof percentage === 'number' && !isNaN(percentage)) {
              const percentageRounded = Math.round(percentage * 100)
              details.push(`%${percentageRounded}`)

              if (totalPages > 0) {
                const estimatedPage = Math.max(1, Math.min(totalPages, Math.round(percentage * totalPages)))
                details.push(`${t('reader.pageShort')} ${estimatedPage}/${totalPages}`)
              }
            }
          } catch (error) {
            console.log('Percentage hesaplama hatası:', error)
          }
        }

        // Element/paragraf bilgisi
        const elementPatterns = [
          /\[(\d+)\]/,              // [123] format
          /!(\d+)/,                 // !123 format
          /:(\d+)/,                 // :123 format
        ]

        for (const pattern of elementPatterns) {
          const match = bookmark.location.match(pattern)
          if (match && match[1]) {
            const elementNum = parseInt(match[1])
            if (!isNaN(elementNum) && elementNum > 0) {
              details.push(`${t('reader.paragraph')} ${elementNum}`)
              break
            }
          }
        }

        return {
          title,
          details: details.join(' • ')
        }
      } catch (error) {
        console.log('CFI parse hatası:', error)
      }
    }

    // Varsayılan bilgi
    const bookmarkIndex = bookmarks.findIndex(b => b.id === bookmark.id)
    return {
      title: `${t('reader.bookmark')} ${bookmarkIndex + 1}`,
      details: ''
    }
  }

  const goToBookmark = (bookmark: BookmarkType) => {
    if (renditionRef.current) {
      renditionRef.current.display(bookmark.location)
      setShowBookmarks(false)
    }
  }

  const deleteBookmarkItem = async (bookmark: BookmarkType, event: React.MouseEvent) => {
    event.stopPropagation() // Tıklama olayının yayılmasını engelle

    try {
      await deleteBookmark(bookmark.id)
      setBookmarks(bookmarks.filter(b => b.id !== bookmark.id))

      // Eğer silinen bookmark mevcut konumda ise bookmark durumunu güncelle
      if (bookmark.location === location) {
        setIsBookmarked(false)
      }
    } catch (error) {
      console.error('Yer işareti silme hatası:', error)
    }
  }

  const handleTocItemClick = (item: any) => {
    if (!renditionRef.current) return

    try {
      const target = item.href || item.cfi || (item.hrefs && item.hrefs[0])
      if (target) {
        renditionRef.current.display(target)
        setShowSearch(false)
        const label = (item.fullLabel || item.label || '').toString()
        if (label) {
          showToastMessage(
            t('reader.toasts.navigatingTo', {
              quote: `${label.substring(0, 50)}${label.length > 50 ? '...' : ''}`
            }),
            'info'
          )
        }
      }
    } catch (error) {
      console.error('TOC navigation error:', error)
    }
  }

  const handleTextSearchResultClick = async (result: TextSearchResult) => {
    if (!renditionRef.current) return

    try {
      const target = result.cfi || result.href
      if (!target) return

      // Önce ilgili konuma git
      try {
        const displayResult = renditionRef.current.display(target)
        if (displayResult && typeof displayResult.then === 'function') {
          await displayResult
        }
      } catch (displayErr) {
        console.log('Search result display hatası:', displayErr)
      }

      setShowSearch(false)

      const snippet = result.snippet || ''
      showToastMessage(
        t('reader.toasts.navigatingTo', {
          quote: `${snippet.substring(0, 50)}${snippet.length > 50 ? '...' : ''}`
        }),
        'info'
      )

      // Kısa süreli arama highlight'ı
      if (result.cfi && renditionRef.current.annotations) {
        const cfi = result.cfi

        // Eski arama highlight'ını (varsa) kaldır
        try {
          if (searchHighlightCfiRef.current) {
            renditionRef.current.annotations.remove(
              searchHighlightCfiRef.current,
              'highlight'
            )
          }
        } catch (removeErr) {
          console.log('Önceki search highlight kaldırma hatası:', removeErr)
        }

        // Yeni search highlight CFI'sini kaydet
        searchHighlightCfiRef.current = cfi

        // Sayfa tamamen yüklensin, sonra highlight ekle
        window.setTimeout(() => {
          try {
            renditionRef.current.annotations.add(
              'highlight',
              cfi,
              {},
              null,
              'search-temp-highlight',
              {
                fill: '#fde68a', // amber-200
                'fill-opacity': '0.65',
                'mix-blend-mode': 'multiply'
              }
            )

            // 2.5 saniye sonra arama highlight'ını kaldır (yalnızca hâlâ aynı CFI ise)
            window.setTimeout(() => {
              try {
                if (searchHighlightCfiRef.current === cfi) {
                  renditionRef.current.annotations.remove(cfi, 'highlight')
                  searchHighlightCfiRef.current = null
                }
              } catch (removeLaterErr) {
                console.log('Search highlight otomatik kaldırma hatası:', removeLaterErr)
              }
            }, 2500)
          } catch (annErr) {
            console.log('Search highlight ekleme hatası:', annErr)
          }
        }, 400)
      }
    } catch (error) {
      console.error('Search result navigation error:', error)
      showToastMessage(t('reader.toasts.searchError'), 'error')
    }
  }

  const handlePasteIntoSearch = async () => {
    try {
      let text = ''

      // 1) Native Clipboard (Capacitor)
      if (nativeClipboard && typeof nativeClipboard.read === 'function') {
        try {
          const result = await nativeClipboard.read()
          // Farklı Clipboard implementasyonları için esnek okuma
          text =
            (result && (result.string || result.text || result.value)) ||
            ''
        } catch (err) {
          console.log('Native clipboard read hatası:', err)
        }
      }

      // 2) Web Clipboard API
      if (!text && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        try {
          text = await navigator.clipboard.readText()
        } catch (err) {
          console.log('navigator.clipboard.readText hatası:', err)
        }
      }

      text = text.trim()
      if (!text) {
        showToastMessage(t('reader.toasts.copyError'), 'error')
        return
      }

      setSearchQuery((prev) => {
        if (!prev) return text
        // Sonuna ekleyelim, araya boşluk koyarak
        return `${prev.trim()} ${text}`
      })
    } catch (err) {
      console.log('handlePasteIntoSearch hatası:', err)
      showToastMessage(t('reader.toasts.copyError'), 'error')
    }
  }

  const handleSearchSubmit = async () => {
    const query = searchQuery.trim()
    if (!query) {
      setTextSearchResults([])
      return
    }

    if (searchScope === 'text' && query.length < 2) {
      showToastMessage(t('reader.toasts.searchTooShort'), 'info')
      return
    }

    if (searchScope === 'toc') {
      // TOC araması filtrelenmiş listeden otomatik yapılır, ekstra işlem gerekmez
      if (filteredToc.length === 0) {
        showToastMessage(t('reader.toasts.searchNoResults'), 'info')
      }
      return
    }

    if (!renditionRef.current?.book) {
      showToastMessage(t('reader.toasts.searchError'), 'error')
      return
    }

    setIsSearchingText(true)
    setTextSearchResults([])

    try {
      const book = renditionRef.current.book

      // Kitap tam olarak yüklensin
      try {
        if (book.ready && typeof book.ready.then === 'function') {
          await book.ready
        }
      } catch (readyErr) {
        console.log('Metin arama book.ready hatası:', readyErr)
      }

      const spineSections = (book.spine && (book.spine.spineItems || [])) || []
      const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim()
      const newResults: TextSearchResult[] = []
      const MAX_RESULTS = 50
      const MAX_PER_SECTION = 5

      for (const section of spineSections as any[]) {
        if (!section || newResults.length >= MAX_RESULTS) continue

        try {
          // Bölüm belgesi yüklü değilse yükle
          if (!section.document && typeof section.load === 'function') {
            await section.load(book.load?.bind(book))
          }

          if (!section.document) continue

          let matches: any[] = []
          try {
            if (typeof section.search === 'function') {
              matches = section.search(query)
            } else if (typeof section.find === 'function') {
              matches = section.find(query)
            }
          } catch (searchErr) {
            console.log('Metin arama section.search hatası:', searchErr)
          }

          // Eğer epub.js search/find sonuç vermediyse, daha toleranslı bir fallback dene
          if ((!matches || matches.length === 0) && section.document?.body) {
            try {
              const rawBody = section.document.body.textContent || ''
              const normalizedBody = rawBody.toLowerCase().replace(/\s+/g, ' ').trim()

              const pos = normalizedBody.indexOf(normalizedQuery)
              if (pos !== -1) {
                const SNIPPET_CHARS = 80
                const snippetStart = Math.max(0, pos - SNIPPET_CHARS)
                const snippetEnd = Math.min(
                  normalizedBody.length,
                  pos + normalizedQuery.length + SNIPPET_CHARS
                )
                const snippet = normalizedBody.slice(snippetStart, snippetEnd).trim()

                matches = [
                  {
                    cfi: undefined,
                    excerpt: snippet
                  }
                ]
              }
            } catch (fallbackErr) {
              console.log('Metin arama fallback hatası:', fallbackErr)
            }
          }

          if (!matches || matches.length === 0) continue

          // Bölüm başlığını TOC üzerinden bulmaya çalış
          let chapterTitle = currentChapter || t('reader.unknownChapter')
          try {
            const sectionHref = section.href as string | undefined
            if (sectionHref && flatToc && flatToc.length > 0) {
              const tocItem = flatToc.find((item: any) => {
                if (!item.href) return false
                const baseHref = (item.href as string).split('#')[0]
                return baseHref === sectionHref
              })
              if (tocItem) {
                const label = (tocItem.label || tocItem.fullLabel || '').toString()
                if (label) {
                  chapterTitle = label
                }
              }
            }
          } catch { }

          let matchesInSection = 0
          for (const match of matches) {
            if (newResults.length >= MAX_RESULTS || matchesInSection >= MAX_PER_SECTION) {
              break
            }

            const rawSnippet = (match.excerpt || '').toString()
            const snippet = rawSnippet.replace(/\s+/g, ' ').trim()
            if (!snippet) continue

            newResults.push({
              id: `${section.href || section.idref || ''}-${newResults.length}`,
              chapterTitle,
              snippet,
              cfi: match.cfi,
              href: section.href
            })

            matchesInSection += 1
          }
        } catch (sectionError) {
          console.log('Metin arama bölüm hatası:', sectionError)
        } finally {
          try {
            if (section && typeof section.unload === 'function') {
              section.unload()
            }
          } catch { }
        }

        if (newResults.length >= MAX_RESULTS) {
          break
        }
      }

      setTextSearchResults(newResults)

      if (newResults.length === 0) {
        showToastMessage(t('reader.toasts.searchNoResults'), 'info')
      }
    } catch (error) {
      console.error('Metin arama hatası:', error)
      showToastMessage(t('reader.toasts.searchError'), 'error')
    } finally {
      setIsSearchingText(false)
    }
  }

  const toggleFullscreen = () => {
    // Tam ekrandan çıkarken mevcut konumu yedekle (drift sorununu önlemek için)
    if (isFullscreen && renditionRef.current?.location?.start?.cfi) {
      preExitLocationRef.current = renditionRef.current.location.start.cfi
    }
    setIsFullscreen(!isFullscreen)
  }

  // Tam ekran değişikliklerini dinle ve inset/padding'i güncelle
  // Tam ekran değişikliklerini dinle ve inset/padding'i güncelle
  useEffect(() => {
    const wasFullscreen = prevIsFullscreenRef.current
    prevIsFullscreenRef.current = isFullscreen

    // Sadece Fullscreen'den çıkış yapıldığında çalışsın (initial mount'da çalışmasın)
    if (wasFullscreen && !isFullscreen) {
      // iOS cihazlarda tam ekrandan çıkışta beyaz sayfa hatasına karşı kesin çözüm:
      // Sayfayı tamamen yenile.
      const isIOS =
        typeof navigator !== 'undefined' &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

      if (isIOS) {
        window.location.reload()
        return
      }

      applyReaderInsets()
      const id = window.setTimeout(() => {
        try {
          const rendition = renditionRef.current
          if (rendition) {
            // Paginated layout'ta padding/viewport değişince yeniden ölçmek gerekebiliyor
            if (rendition.resize) {
              rendition.resize()
            }

            const currentLoc =
              preExitLocationRef.current ||
              (rendition.location &&
                (rendition.location.start?.cfi || (rendition.location as any).cfi)) ||
              lastLocationRef.current

            if (currentLoc) {
              console.log('Fullscreen çıkışı sonrası konum restore ediliyor:', currentLoc)
              rendition.display(currentLoc)
              preExitLocationRef.current = null
            }
          }
        } catch { }
      }, 300)
      return () => window.clearTimeout(id)
    } else if (isFullscreen) {
      // Fullscreen'e giriş yapıldığında
      // iOS'ta UI animasyonlarının ve layout'un oturması için süreyi artırdık
      const id = window.setTimeout(() => {
        applyReaderInsets()
        try {
          const rendition = renditionRef.current
          if (rendition?.resize) {
            rendition.resize()
          }
        } catch { }
      }, 300)
      return () => window.clearTimeout(id)
    }
  }, [isFullscreen, applyReaderInsets])

  // Window resize olayını dinle ve inset/padding + layout'u güncelle
  useEffect(() => {
    const handleResize = () => {
      // Android'de klavye açılıp kapanırken window.resize çok sık geliyor ve
      // epub.js layout'unu bozup sayfanın beyaz kalmasına sebep olabiliyor.
      // Bu yüzden Android cihazlarda resize sırasında hiçbir şey yapmıyoruz.
      const isAndroid =
        typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
      if (isAndroid) return

      const newHeight = window.innerHeight
      const prevHeight = lastWindowHeightRef.current
      lastWindowHeightRef.current = newHeight

      window.setTimeout(() => {
        applyReaderInsets()

        // Android'de klavye açılıp kapandığında bazen sayfa beyaz kalabiliyor.
        // Yükseklik ciddi şekilde değiştiyse, mevcut konumu yeniden display ederek
        // sayfayı zorla yeniden çiziyoruz.
        try {
          const rendition = renditionRef.current
          if (!rendition) return

          if (rendition.resize) {
            rendition.resize()
          }

          if (
            typeof prevHeight === 'number' &&
            Math.abs(newHeight - prevHeight) > 120 // klavye kaynaklı büyük değişim eşiği
          ) {
            const currentLoc =
              (rendition.location &&
                (rendition.location.start?.cfi ||
                  (rendition.location as any).cfi)) ||
              lastLocationRef.current

            if (currentLoc) {
              rendition.display(currentLoc)
            }
          }
        } catch { }
      }, 140)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [applyReaderInsets])

  const epubInitOptions = useMemo(() => ({
    openAs: 'epub',
    flow: scrollMode ? 'scrolled' : 'paginated',
    manager: 'default',
    spread: 'none',
    width: '100%',
    height: '100%',

    allowScriptedContent: true,
  }), [scrollMode])

  // iOS için ek text selection handling (polling tabanlı, native menü devre dışıyken daha stabil)
  useEffect(() => {
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

    if (!isIOS) return

    console.log('iOS selection polling handler aktif')

    let pollId: number | null = null
    let touchListenersAttached = false

    const pollSelection = () => {
      if (suppressNextSelectionRef.current) {
        return
      }

      try {
        let hasAnySelection = false

        const iframes = document.querySelectorAll(
          '.react-reader-container iframe'
        )
        iframes.forEach((iframe: any) => {
          try {
            const iframeDoc =
              iframe.contentDocument || iframe.contentWindow?.document
            if (!iframeDoc) return

            const selection = iframeDoc.getSelection()
            if (!selection) return

            const selectedText = selection.toString().trim()
            if (!selectedText) return

            hasAnySelection = true

            const now = Date.now()

            // Seçim metni değiştiyse, zaman damgasını güncelle ve bu seçim için menünün
            // henüz gösterilmediğini işaretle. Ayrıca, varsa mevcut menüyü gizle ki
            // kullanıcı selector'ı sürüklerken context menü pasif olsun.
            if (selectedText !== iosLastSelectionTextRef.current) {
              iosLastSelectionTextRef.current = selectedText
              iosLastSelectionChangeTimeRef.current = now
              iosMenuShownForSelectionRef.current = false

              if (showContextMenu) {
                setShowContextMenu(false)
              }
            }

            const isStable =
              now - iosLastSelectionChangeTimeRef.current > 260

            // Parmağı hâlâ ekrandayken veya seçim stabil değilse ya da
            // bu seçim için menü zaten gösterildiyse, hiçbir şey yapma
            if (
              iosIsTouchSelectingRef.current ||
              !isStable ||
              iosMenuShownForSelectionRef.current
            ) {
              return
            }

            console.log('iOS polling selection detected:', selectedText)

            let range: Range
            try {
              range = selection.getRangeAt(0)
            } catch {
              return
            }

            // CFI range yaklaşık olarak mevcut konum + offsetler ile oluşturulur
            let cfiRange = ''
            const loc = renditionRef.current?.location
            if (loc?.start?.cfi) {
              cfiRange = `${loc.start.cfi}:${range.startOffset},${range.endOffset}`
            } else {
              cfiRange = `epubcfi(/6/0):${range.startOffset},${range.endOffset}`
            }

            const chapterTitle = currentChapter || ''

            setPendingHighlight({
              cfiRange,
              selectedText,
              chapterTitle
            })
            setLastSelectedText(selectedText)

            // Context menü pozisyonu: seçimin altı + iframe offset'i (alta sığmazsa üstüne)
            try {
              const rect = range.getBoundingClientRect()
              if (rect) {
                let x = rect.left + rect.width / 2
                const isMobileView = window.innerWidth < 768
                const estimatedMenuHeight = isMobileView ? 240 : 264
                const padding = 10

                // Önce seçimin altına yerleştirmeyi dene
                let y = rect.bottom + padding

                const iframeRect =
                  (iframe as HTMLIFrameElement).getBoundingClientRect()
                let globalY = iframeRect.top + y

                // Eğer ekranın altına taşacaksa, seçimin üstüne yerleştir
                if (globalY + estimatedMenuHeight > window.innerHeight - 10) {
                  y = rect.top - estimatedMenuHeight - padding
                  // Eğer hala üst kenara çok yakınsa, minimum padding bırak
                  if (iframeRect.top + y < 10) {
                    y = 10 - iframeRect.top
                  }
                }

                x = iframeRect.left + x
                y = iframeRect.top + y
                setContextMenuPosition({ x, y })
              } else {
                setContextMenuPosition({
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2
                })
              }
            } catch (posErr) {
              console.log('iOS polling selection pozisyon hatası:', posErr)
              setContextMenuPosition({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
              })
            }

            // Haptic feedback
            if (haptics) {
              haptics.impact({ style: 'light' }).catch(() => { })
            }

            setShowContextMenu(true)
            iosMenuShownForSelectionRef.current = true
          } catch (err) {
            console.log('iOS polling selection genel hatası:', err)
          }
        })

        // Hiçbir iframe'de seçim kalmadıysa ve context menü açıksa, otomatik kapat
        if (!hasAnySelection && showContextMenu) {
          console.log('iOS polling: seçim temizlenmiş, context menü kapatılıyor')
          setShowContextMenu(false)
          setPendingHighlight(null)
        }
      } catch (err) {
        console.log('iOS polling selection dış hata:', err)
      }
    }

    // Dokunma event'lerini dinleyerek seçim sırasında menünün açılmasını engelle
    const handleTouchStart = () => {
      iosIsTouchSelectingRef.current = true
      // Yeni bir seçim için menüyü tekrar gösterebilmek adına flag'i sıfırla
      iosMenuShownForSelectionRef.current = false
    }

    const handleTouchEnd = () => {
      // Parmağın ekrandan kalktığını işaretle; bir sonraki stabil seçimde menü açılabilir
      iosIsTouchSelectingRef.current = false
    }

    const attachTouchListeners = () => {
      if (touchListenersAttached) return
      touchListenersAttached = true

      document.addEventListener('touchstart', handleTouchStart, {
        passive: true
      })
      document.addEventListener('touchend', handleTouchEnd, {
        passive: true
      })

      const iframes = document.querySelectorAll(
        '.react-reader-container iframe'
      )
      iframes.forEach((iframe: any) => {
        try {
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow?.document
          if (iframeDoc) {
            iframeDoc.addEventListener('touchstart', handleTouchStart, {
              passive: true
            })
            iframeDoc.addEventListener('touchend', handleTouchEnd, {
              passive: true
            })
          }
        } catch (err) {
          console.log('iOS iframe touch listener ekleme hatası:', err)
        }
      })
    }

    attachTouchListeners()

    pollId = window.setInterval(pollSelection, 200)

    return () => {
      if (pollId !== null) {
        clearInterval(pollId)
      }

      // Dokunma dinleyicilerini temizle
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)

      const iframes = document.querySelectorAll(
        '.react-reader-container iframe'
      )
      iframes.forEach((iframe: any) => {
        try {
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow?.document
          if (iframeDoc) {
            iframeDoc.removeEventListener('touchstart', handleTouchStart)
            iframeDoc.removeEventListener('touchend', handleTouchEnd)
          }
        } catch (err) {
          console.log('iOS iframe touch listener temizleme hatası:', err)
        }
      })
    }
  }, [currentChapter, lastSelectedText, showContextMenu])

  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor
  const isAndroidDevice = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
  const isIOSDeviceMenu = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  const isMobileCap = isCapacitor && (isAndroidDevice || isIOSDeviceMenu)
  const iosSafeAreaClass = isIOSDeviceMenu ? 'ios-safe-area' : ''
  const iosNavSafeAreaClass = isIOSDeviceMenu ? 'ios-nav-safe-area' : ''
  const iosBottomSafeAreaClass = isIOSDeviceMenu ? 'ios-bottom-safe-area' : ''

  const handleSpeakFromContext = async () => {
    try {
      const text = pendingHighlight?.selectedText?.trim()
      if (!text) return
      if (!tts) {
        showToastMessage(t('reader.toasts.ttsNotAvailable'), 'error')
        return
      }
      // iOS/Android için basit TTS
      await tts.speak({
        text,
        lang: ttsLanguage || 'tr-TR',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient'
      })
      showToastMessage(t('reader.toasts.ttsStarted'), 'info')
    } catch (err) {
      console.error('TTS speak error:', err)
      showToastMessage(t('reader.toasts.ttsStartError'), 'error')
    } finally {
      setShowContextMenu(false)
    }
  }

  // Toast enter animation (slide-in from right)
  useEffect(() => {
    if (showToast) {
      setToastEnter(false)
      const id = setTimeout(() => setToastEnter(true), 30)
      return () => clearTimeout(id)
    } else {
      setToastEnter(false)
    }
  }, [showToast])

  // Load and persist TTS language
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ttsLanguage')
      if (saved) {
        setTtsLanguage(saved)
      } else if (typeof navigator !== 'undefined' && navigator.language) {
        setTtsLanguage(navigator.language)
      }
    } catch { }
  }, [])

  useEffect(() => {
    try {
      if (ttsLanguage) localStorage.setItem('ttsLanguage', ttsLanguage)
    } catch { }
  }, [ttsLanguage])

  if (isLoading) {
    return (
      <div className={`reader-viewport overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 ${iosSafeAreaClass}`}>
        <div className={`bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-20 sticky top-0 ${iosNavSafeAreaClass}`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBackToLibrary}
                  className="p-2 rounded-xl bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-white/30 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{bookTitle}</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <BookOpen className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('reader.loadingBook')}</h2>
            <p className="text-gray-600 dark:text-gray-400">{t('reader.pleaseWait')}</p>
            <div className="mt-6 w-64 h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`reader-viewport overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 ${iosSafeAreaClass}`}>
        <div className={`bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-20 sticky top-0 ${iosNavSafeAreaClass}`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={onBackToLibrary}
                  className="p-2 rounded-xl bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-white/30 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{bookTitle}</h1>
                  <p className="text-sm text-red-600 dark:text-red-400">{t('common.error')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-500 dark:from-red-500 dark:to-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('reader.loadErrorTitle')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-lg"
            >
              {t('common.retry')}
            </button>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className={`reader-viewport overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 flex flex-col ${iosSafeAreaClass} ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-dark-950' : ''
      }`}>
      {/* Modern Reader Header - Kompakt */}
      <div className={`bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-20 sticky top-0 transition-all duration-300 ${iosNavSafeAreaClass} ${isFullscreen ? 'hidden' : ''
        }`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={onBackToLibrary}
                className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{bookTitle}</h1>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span>%{progressPercentage}</span>
                  {totalPages > 0 && (
                    <>
                      <span>•</span>
                      <span>{currentPage}/{totalPages}</span>
                    </>
                  )}
                  {currentChapter && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-32">{currentChapter}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Progress Bar - Desktop */}
              <div className="hidden lg:flex items-center gap-2">
                <div className="w-24 h-1.5 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Page Input - Desktop & Tablet (butonsuz) */}
              {totalPages > 0 && (
                <div className="hidden sm:flex items-center gap-1">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {t('reader.pageShort')} 1-{totalPages}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    inputMode="numeric"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        submitPageInput()
                      }
                    }}
                    className="w-16 text-[16px] px-2 py-1 rounded-lg border border-gray-200 dark:border-dark-700 bg-white/80 dark:bg-dark-800/80 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              )}

              {/* Dark Mode Toggle */}
              {toggleDarkMode && (
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                  title={isDarkMode ? t('app.light') : t('app.dark')}
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}

              {/* Quick Bookmark Button */}
              <button
                onClick={toggleBookmark}
                className={`p-1.5 rounded-lg backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center ${isBookmarked
                  ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                  : 'bg-white dark:bg-dark-800/80 border-gray-200 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                title={isBookmarked ? t('reader.removeBookmark') : t('reader.addBookmark')}
              >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
              </button>

              {/* Menu Button */}
              <div className="relative menu-container">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                  title={t('reader.menu')}
                >
                  {showMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border border-white/30 dark:border-dark-700/30 rounded-xl shadow-xl z-30">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowSettings(!showSettings)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <Settings className="w-4 h-4" />
                        <span>{t('reader.readingSettings')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowBookmarks(!showBookmarks)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <Bookmark className="w-4 h-4" />
                        <span>{t('reader.bookmarks')} ({bookmarks.length})</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowSearch(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <Search className="w-4 h-4" />
                        <span>{t('reader.search')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowHighlights(!showHighlights)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <Highlighter className="w-4 h-4" />
                        <span>{t('reader.highlights')} ({highlights.length})</span>
                      </button>

                      <div className="my-2 border-t border-gray-200 dark:border-dark-700"></div>

                      {/* TTS Language */}
                      <div className="px-3 py-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t('reader.speechLanguage')}
                        </label>
                        <select
                          value={ttsLanguage}
                          onChange={(e) => setTtsLanguage(e.target.value)}
                          className="w-full text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-dark-700 bg-white/80 dark:bg-dark-800/80 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/50"
                        >
                          <option value="tr-TR">Türkçe (TR)</option>
                          <option value="en-US">English (US)</option>
                          <option value="en-GB">English (UK)</option>
                          <option value="de-DE">Deutsch (DE)</option>
                          <option value="es-ES">Español (ES)</option>
                          <option value="ar-SA">العربية (SA)</option>
                        </select>
                      </div>

                      <div className="my-2 border-t border-gray-200 dark:border-dark-700"></div>

                      <div className="md:hidden">
                        <button
                          onClick={() => {
                            toggleFullscreen()
                            setShowMenu(false)
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                        >
                          <Maximize className="w-4 h-4" />
                          <span>{t('reader.fullscreen')}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          resetReader()
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>{t('reader.restart')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBookmarks && !isFullscreen && (
        <ReaderBookmarkPanel
          bookmarks={bookmarks}
          onClose={() => setShowBookmarks(false)}
          onGoToBookmark={goToBookmark}
          onDeleteBookmark={deleteBookmarkItem}
          getBookmarkLocationInfo={getBookmarkLocationInfo}
        />
      )}

      {/* Modern Highlight Panel */}
      {showHighlights && !isFullscreen && (
        <HighlightPanel
          isOpen={showHighlights}
          onClose={() => setShowHighlights(false)}
          highlights={highlights}
          onHighlightClick={handleHighlightClick}
          onEditHighlight={handleEditHighlight}
          onDeleteHighlight={handleDeleteHighlight}
        />
      )}

      {showSearch && !isFullscreen && (
        <ReaderSearchPanel
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          searchScope={searchScope}
          onSearchScopeChange={setSearchScope}
          isSearchingText={isSearchingText}
          textSearchResults={textSearchResults}
          filteredToc={filteredToc}
          onClose={() => setShowSearch(false)}
          onSearchSubmit={handleSearchSubmit}
          onPasteIntoSearch={handlePasteIntoSearch}
          onTocItemClick={handleTocItemClick}
          onTextResultClick={handleTextSearchResultClick}
        />
      )}

      {showSettings && !isFullscreen && (
        <ReaderSettingsPanel
          bookId={bookId}
          userId={userId}
          scrollMode={scrollMode}
          location={location}
          isBookmarked={isBookmarked}
          bookmarkCount={bookmarks.length}
          onClose={() => setShowSettings(false)}
          onAppearancePreset={applyReadingAppearancePreset}
          onFontSizeChange={changeFontSize}
          onScrollModeSelect={setScrollMode}
          toggleBookmark={toggleBookmark}
          resetReader={resetReader}
        />
      )}

      {/* Book Reader — min-h-0: üstteki çekmece açıkken kitap alanı küçülüp hep görünür kalır */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {displayUrl ? (
          <div
            className={`w-full h-full react-reader-container ${isDarkMode ? 'dark' : ''} ${isFullscreen ? 'fullscreen' : ''
              } ${!isFullscreen ? 'md:pb-8' : ''} ${scrollMode ? 'scroll-mode' : ''}`}
            style={{ overflowX: 'hidden' }}
          >
            <ReactReader
              key={`reader-${bookId}-${scrollMode ? 'scroll' : 'paginated'}`}
              url={displayUrl}
              location={location}
              locationChanged={locationChanged}
              getRendition={onReaderReady}
              epubInitOptions={epubInitOptions}
              readerStyles={fullscreenReaderStyles}
              tocChanged={(toc: any) => {
                console.log('TOC değişti:', toc)
                setToc(toc || [])
                tocRef.current = toc
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{isLoading ? t('common.loading') : t('reader.loadErrorTitle')}</p>
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>
          </div>
        )}

        {/* Fullscreen Toggle Button - Top Right */}
        <div className={`md:hidden fixed top-12 right-6 z-50 transition-all duration-300 ${isFullscreen ? 'block' : 'hidden'
          }`}>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-600/50 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Minimize className="w-6 h-6" />
          </button>
        </div>

      </div>

      {/* Mobile Bottom Navigation - Kompakt */}
      <div
        ref={bottomNavRef}
        className={`md:hidden flex-shrink-0 bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-t border-white/30 dark:border-dark-700/30 shadow-lg transition-all duration-300 z-30 ${iosBottomSafeAreaClass} ${isFullscreen ? 'hidden' : ''
          }`}>
        <div className="px-4 py-2">
          {/* Navigasyon butonları - mobil */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevious}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-dark-700/80 transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
              <span className="text-xs">{t('reader.previous')}</span>
            </button>

            <div className="flex flex-col items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              {totalPages > 0 && (
                <form
                  className="flex items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault()
                    submitPageInput()
                  }}
                >
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {t('reader.pageShort')}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    inputMode="numeric"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    className="w-12 text-[16px] px-1.5 py-1 rounded-lg border border-gray-200 dark:border-dark-700 bg-white/80 dark:bg-dark-800/80 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    onBlur={submitPageInput}
                  />
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    /{totalPages}
                  </span>
                </form>
              )}
            </div>

            <button
              onClick={goToNext}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-dark-700/80 transition-colors"
            >
              <span className="text-xs">{t('reader.next')}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar - Kompakt */}
      <div className={`hidden md:block fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-800 border-t border-white/30 dark:border-dark-700/30 transition-all duration-300 z-10 ${isFullscreen ? 'hidden' : ''
        }`}>
        <div className="max-w-7xl mx-auto px-4 py-1.5">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-3">
              <span className="truncate max-w-48">{bookTitle}</span>
              {currentChapter && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-48">{currentChapter}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {totalPages > 0 && (
                <>
                  <span>{currentPage}/{totalPages}</span>
                  <span>•</span>
                </>
              )}
              <span>{t('reader.bookmarksCount', { count: bookmarks.length })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bookmark Note Modal */}
      <BookmarkNoteModal
        isOpen={showBookmarkNoteModal}
        onClose={() => setShowBookmarkNoteModal(false)}
        onSave={handleAddBookmarkWithNote}
        title={t('reader.addBookmarkNote')}
      />

      {/* Highlight Modal */}
      <HighlightModal
        isOpen={showHighlightModal}
        onClose={() => {
          setShowHighlightModal(false)
          setPendingHighlight(null)
          setEditingHighlight(null)
        }}
        onSave={editingHighlight ? handleUpdateHighlight : handleSaveHighlight}
        onDelete={editingHighlight ? () => handleDeleteHighlight(editingHighlight.id) : undefined}
        selectedText={pendingHighlight?.selectedText || editingHighlight?.selected_text || ''}
        existingColor={editingHighlight?.color}
        existingNote={editingHighlight?.note}
        isEditing={!!editingHighlight}
      />

      {/* Context Menu */}
      <ReaderContextMenu
        show={showContextMenu}
        x={contextMenuPosition.x}
        y={contextMenuPosition.y}
        selectedText={pendingHighlight?.selectedText || ''}
        onHighlight={handleHighlightFromContext}
        onCopy={handleCopyFromContext}
        onSearch={handleSearchFromContext}
        onClose={handleCloseContextMenu}
        onSpeak={isMobileCap ? handleSpeakFromContext : undefined}
        isTtsAvailable={isMobileCap}
      />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-32 right-6 z-[60] pointer-events-none">
          <div className={`pointer-events-auto transform transition-all duration-500 ease-out ${toastEnter ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}`}>
            <div className={`
              relative overflow-hidden w-[260px] sm:w-[300px]
              bg-white/85 dark:bg-dark-900/85 
              backdrop-blur-xl border border-white/20 dark:border-dark-700/30
              rounded-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/5
              ${showToast.type === 'success'
                ? 'bg-gradient-to-br from-emerald-50/70 to-green-50/70 dark:from-emerald-950/50 dark:to-green-950/50'
                : showToast.type === 'error'
                  ? 'bg-gradient-to-br from-red-50/70 to-rose-50/70 dark:from-red-950/50 dark:to-rose-950/50'
                  : 'bg-gradient-to-br from-blue-50/70 to-indigo-50/70 dark:from-blue-950/50 dark:to-indigo-950/50'
              }
            `}>
              {/* Accent Border */}
              <div className={`absolute inset-y-0 left-0 w-[2px] ${showToast.type === 'success'
                ? 'bg-gradient-to-b from-emerald-500 to-green-600'
                : showToast.type === 'error'
                  ? 'bg-gradient-to-b from-red-500 to-rose-600'
                  : 'bg-gradient-to-b from-blue-500 to-indigo-600'
                }`} />

              <div className="p-2.5 pl-4">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0">
                    {showToast.type === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {showToast.type === 'error' && (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    {showToast.type === 'info' && (
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1 pt-0.5">
                    <p className="text-[12px] font-semibold text-gray-900 dark:text-gray-100">
                      {showToast.type === 'success' && t('reader.toastTitles.success')}
                      {showToast.type === 'error' && t('reader.toastTitles.error')}
                      {showToast.type === 'info' && t('reader.toastTitles.info')}
                    </p>
                    <p className="text-[12px] text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">
                      {showToast.message}
                    </p>
                  </div>

                  <button
                    onClick={() => setShowToast(null)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-md hover:bg-gray-100/70 dark:hover:bg-dark-800/70 transition-colors"
                    aria-label={t('common.close')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="h-px w-full bg-gray-200/30 dark:bg-dark-700/30">
                <div
                  className={`h-full transition-all duration-[3000ms] ease-linear ${showToast.type === 'success'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                    : showToast.type === 'error'
                      ? 'bg-gradient-to-r from-red-500 to-rose-500'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EpubReader

