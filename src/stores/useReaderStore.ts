import { create } from 'zustand'
import type { Bookmark as BookmarkType, Highlight } from '../lib/progressService'
import {
  DEFAULT_READER_AR,
  DEFAULT_READER_FA,
  DEFAULT_READER_TR,
  READER_APPEARANCE_LS,
  READER_COLOR_LS_AR,
  READER_COLOR_LS_FA,
  READER_COLOR_LS_TR,
  READER_FONT_LS_AR,
  READER_FONT_LS_TR,
  READER_WEIGHT_LS_AR,
  READER_WEIGHT_LS_TR,
  readReaderAppearance,
  readReaderColorLs,
  readReaderFontIdAr,
  readReaderFontIdTr,
  readReaderWeightLs,
  type ReaderAppearancePreset,
} from '../components/reader/readerTheme'
import type { TextSearchResult } from '../components/reader/searchTypes'

const FONT_SIZE_LS = 'epubReader_fontSize'
const NAV_CHROME_LS = 'readerNavChromeMode'
const EDGE_TAP_LS = 'readerEdgeTapPageTurn'
const MARGIN_IDX_LS = 'readerMarginPresetIndex'

export type ReadingSettingsTab = 'theme' | 'typography' | 'colors' | 'page'

/** Üst/alt okuyucu çubuğu: her zaman | dokununca | tamamen gizli */
export type ReaderNavChromeMode = 'always' | 'on_touch' | 'hidden'

function readNavChromeMode(): ReaderNavChromeMode {
  if (typeof window === 'undefined') return 'on_touch'
  try {
    const v = localStorage.getItem(NAV_CHROME_LS)
    if (v === 'always' || v === 'on_touch' || v === 'hidden') return v
  } catch {
    /* ignore */
  }
  return 'on_touch'
}

function readEdgeTapEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = localStorage.getItem(EDGE_TAP_LS)
    if (v === '0' || v === 'false') return false
    if (v === '1' || v === 'true') return true
  } catch {
    /* ignore */
  }
  return true
}

function readMarginPresetIndex(): number {
  if (typeof window === 'undefined') return 0
  try {
    const n = parseInt(localStorage.getItem(MARGIN_IDX_LS) || '0', 10)
    if (n >= 0 && n <= 2) return n
  } catch {
    /* ignore */
  }
  return 0
}

export type ReaderPendingHighlightState = {
  cfiRange: string
  selectedText: string
  chapterTitle?: string
} | null

function readFontSize(): number {
  if (typeof window === 'undefined') return 100
  try {
    const v = parseInt(localStorage.getItem(FONT_SIZE_LS) || '', 10)
    if (!isNaN(v) && v >= 50 && v <= 200) return v
  } catch {
    /* ignore */
  }
  return 100
}

interface ReaderStoreState {
  readingAppearance: ReaderAppearancePreset
  trColor: string
  arColor: string
  faColor: string
  readerFontIdTr: string
  readerFontIdAr: string
  readerWeightTr: number
  readerWeightAr: number
  readingSettingsTab: ReadingSettingsTab
  fontSize: number
  progressPercentage: number
  epubLocation: string | number

  showSettings: boolean
  showBookmarks: boolean
  showSearch: boolean
  showMenu: boolean
  showHighlights: boolean
  showContextMenu: boolean
  contextMenuPosition: { x: number; y: number }

  searchQuery: string
  searchScope: 'toc' | 'text'
  textSearchResults: TextSearchResult[]
  isSearchingText: boolean

  /** EPUB oturumu: yükleme / hata */
  epubLoading: boolean
  epubError: string | null

  bookmarks: BookmarkType[]
  isBookmarked: boolean
  isFullscreen: boolean
  readerChromeVisible: boolean

  showBookmarkNoteModal: boolean
  pendingBookmarkLocation: string

  highlights: Highlight[]
  showHighlightModal: boolean
  pendingHighlight: ReaderPendingHighlightState
  editingHighlight: Highlight | null

  readerToast: { message: string; type: 'success' | 'info' | 'error' } | null
  toastEnter: boolean

  ttsLanguage: string

  currentPage: number
  totalPages: number
  pageInput: string
  currentChapter: string
  readerToc: unknown[]

  lastSelectedText: string

  /** Dikey kaydırma (scroll) vs sayfalama — kitap değişince LS’ten güncellenir */
  scrollMode: boolean
  readerNavChromeMode: ReaderNavChromeMode
  readerEdgeTapEnabled: boolean
  /** 0,1,2 → READER_MARGIN_PRESETS_X[ i ] */
  readerMarginPresetIndex: number

  setReadingAppearance: (v: ReaderAppearancePreset) => void
  setTrColor: (v: string) => void
  setArColor: (v: string) => void
  setFaColor: (v: string) => void
  setReaderFontIdTr: (v: string) => void
  setReaderFontIdAr: (v: string) => void
  setReaderWeightTr: (v: number) => void
  setReaderWeightAr: (v: number) => void
  setReadingSettingsTab: (v: ReadingSettingsTab) => void
  setFontSize: (v: number) => void
  setProgressPercentage: (v: number) => void
  setEpubLocation: (v: string | number) => void

  setShowSettings: (v: boolean) => void
  setShowBookmarks: (v: boolean) => void
  setShowSearch: (v: boolean) => void
  setShowMenu: (v: boolean) => void
  setShowHighlights: (v: boolean) => void
  setShowContextMenu: (v: boolean) => void
  setContextMenuPosition: (p: { x: number; y: number }) => void

  setSearchQuery: (q: string) => void
  appendSearchQuery: (suffix: string) => void
  setSearchScope: (s: 'toc' | 'text') => void
  setTextSearchResults: (r: TextSearchResult[]) => void
  setIsSearchingText: (v: boolean) => void

  setEpubLoading: (v: boolean) => void
  setEpubError: (v: string | null) => void

  setBookmarks: (v: BookmarkType[]) => void
  setIsBookmarked: (v: boolean) => void
  setIsFullscreen: (v: boolean) => void
  setReaderChromeVisible: (v: boolean) => void

  setShowBookmarkNoteModal: (v: boolean) => void
  setPendingBookmarkLocation: (v: string) => void

  setHighlights: (v: Highlight[]) => void
  setShowHighlightModal: (v: boolean) => void
  setPendingHighlight: (v: ReaderPendingHighlightState) => void
  setEditingHighlight: (v: Highlight | null) => void

  setReaderToast: (v: { message: string; type: 'success' | 'info' | 'error' } | null) => void
  setToastEnter: (v: boolean) => void

  setTtsLanguage: (v: string) => void

  setCurrentPage: (v: number) => void
  setTotalPages: (v: number) => void
  setPageInput: (v: string) => void
  setCurrentChapter: (v: string) => void
  setReaderToc: (v: unknown[]) => void

  setLastSelectedText: (v: string) => void

  setScrollMode: (v: boolean) => void
  setReaderNavChromeMode: (v: ReaderNavChromeMode) => void
  setReaderEdgeTapEnabled: (v: boolean) => void
  setReaderMarginPresetIndex: (v: number) => void

  resetReaderSession: () => void
}

const initialUi = {
  showSettings: false,
  showBookmarks: false,
  showSearch: false,
  showMenu: false,
  showHighlights: false,
  showContextMenu: false,
  contextMenuPosition: { x: 0, y: 0 },
  searchQuery: '',
  searchScope: 'toc' as const,
  textSearchResults: [] as TextSearchResult[],
  isSearchingText: false,
}

const initialSession = {
  epubLoading: true,
  epubError: null as string | null,
  bookmarks: [] as BookmarkType[],
  isBookmarked: false,
  isFullscreen: false,
  readerChromeVisible: false,
  showBookmarkNoteModal: false,
  pendingBookmarkLocation: '',
  highlights: [] as Highlight[],
  showHighlightModal: false,
  pendingHighlight: null as ReaderPendingHighlightState,
  editingHighlight: null as Highlight | null,
  readerToast: null as { message: string; type: 'success' | 'info' | 'error' } | null,
  toastEnter: false,
  ttsLanguage: 'tr-TR',
  currentPage: 1,
  totalPages: 0,
  pageInput: '',
  currentChapter: '',
  readerToc: [] as unknown[],
  lastSelectedText: '',
  scrollMode: false,
  readerNavChromeMode: readNavChromeMode(),
  readerEdgeTapEnabled: readEdgeTapEnabled(),
  readerMarginPresetIndex: readMarginPresetIndex(),
}

export const useReaderStore = create<ReaderStoreState>((set) => ({
  readingAppearance: readReaderAppearance(),
  trColor: readReaderColorLs(READER_COLOR_LS_TR, DEFAULT_READER_TR),
  arColor: readReaderColorLs(READER_COLOR_LS_AR, DEFAULT_READER_AR),
  faColor: readReaderColorLs(READER_COLOR_LS_FA, DEFAULT_READER_FA),
  readerFontIdTr: readReaderFontIdTr(),
  readerFontIdAr: readReaderFontIdAr(),
  readerWeightTr: readReaderWeightLs(READER_WEIGHT_LS_TR, 400),
  readerWeightAr: readReaderWeightLs(READER_WEIGHT_LS_AR, 400),
  readingSettingsTab: 'theme',
  fontSize: readFontSize(),
  progressPercentage: 0,
  epubLocation: 0,
  ...initialUi,
  ...initialSession,

  setReadingAppearance: (v) => {
    set({ readingAppearance: v })
    try {
      localStorage.setItem(READER_APPEARANCE_LS, v)
    } catch {
      /* ignore */
    }
  },
  setTrColor: (v) => {
    set({ trColor: v })
    try {
      localStorage.setItem(READER_COLOR_LS_TR, v)
    } catch {
      /* ignore */
    }
  },
  setArColor: (v) => {
    set({ arColor: v })
    try {
      localStorage.setItem(READER_COLOR_LS_AR, v)
    } catch {
      /* ignore */
    }
  },
  setFaColor: (v) => {
    set({ faColor: v })
    try {
      localStorage.setItem(READER_COLOR_LS_FA, v)
    } catch {
      /* ignore */
    }
  },
  setReaderFontIdTr: (v) => {
    set({ readerFontIdTr: v })
    try {
      localStorage.setItem(READER_FONT_LS_TR, v)
    } catch {
      /* ignore */
    }
  },
  setReaderFontIdAr: (v) => {
    set({ readerFontIdAr: v })
    try {
      localStorage.setItem(READER_FONT_LS_AR, v)
    } catch {
      /* ignore */
    }
  },
  setReaderWeightTr: (v) => {
    set({ readerWeightTr: v })
    try {
      localStorage.setItem(READER_WEIGHT_LS_TR, String(v))
    } catch {
      /* ignore */
    }
  },
  setReaderWeightAr: (v) => {
    set({ readerWeightAr: v })
    try {
      localStorage.setItem(READER_WEIGHT_LS_AR, String(v))
    } catch {
      /* ignore */
    }
  },
  setReadingSettingsTab: (v) => set({ readingSettingsTab: v }),
  setFontSize: (v) => {
    set({ fontSize: v })
    try {
      localStorage.setItem(FONT_SIZE_LS, String(v))
    } catch {
      /* ignore */
    }
  },
  setProgressPercentage: (v) => set({ progressPercentage: v }),
  setEpubLocation: (v) => set({ epubLocation: v }),

  setShowSettings: (v) => set({ showSettings: v }),
  setShowBookmarks: (v) => set({ showBookmarks: v }),
  setShowSearch: (v) => set({ showSearch: v }),
  setShowMenu: (v) => set({ showMenu: v }),
  setShowHighlights: (v) => set({ showHighlights: v }),
  setShowContextMenu: (v) => set({ showContextMenu: v }),
  setContextMenuPosition: (p) => set({ contextMenuPosition: p }),

  setSearchQuery: (q) => set({ searchQuery: q }),
  appendSearchQuery: (suffix) =>
    set((s) => ({
      searchQuery: s.searchQuery.trim() ? `${s.searchQuery.trim()} ${suffix}` : suffix,
    })),
  setSearchScope: (scope) => set({ searchScope: scope }),
  setTextSearchResults: (r) => set({ textSearchResults: r }),
  setIsSearchingText: (v) => set({ isSearchingText: v }),

  setEpubLoading: (v) => set({ epubLoading: v }),
  setEpubError: (v) => set({ epubError: v }),

  setBookmarks: (v) => set({ bookmarks: v }),
  setIsBookmarked: (v) => set({ isBookmarked: v }),
  setIsFullscreen: (v) => set({ isFullscreen: v }),
  setReaderChromeVisible: (v) => set({ readerChromeVisible: v }),

  setShowBookmarkNoteModal: (v) => set({ showBookmarkNoteModal: v }),
  setPendingBookmarkLocation: (v) => set({ pendingBookmarkLocation: v }),

  setHighlights: (v) => set({ highlights: v }),
  setShowHighlightModal: (v) => set({ showHighlightModal: v }),
  setPendingHighlight: (v) => set({ pendingHighlight: v }),
  setEditingHighlight: (v) => set({ editingHighlight: v }),

  setReaderToast: (v) => set({ readerToast: v }),
  setToastEnter: (v) => set({ toastEnter: v }),

  setTtsLanguage: (v) => set({ ttsLanguage: v }),

  setCurrentPage: (v) => set({ currentPage: v }),
  setTotalPages: (v) => set({ totalPages: v }),
  setPageInput: (v) => set({ pageInput: v }),
  setCurrentChapter: (v) => set({ currentChapter: v }),
  setReaderToc: (v) => set({ readerToc: v }),

  setLastSelectedText: (v) => set({ lastSelectedText: v }),

  setScrollMode: (v) => set({ scrollMode: v }),

  setReaderNavChromeMode: (v) => {
    set({ readerNavChromeMode: v })
    try {
      localStorage.setItem(NAV_CHROME_LS, v)
    } catch {
      /* ignore */
    }
  },

  setReaderEdgeTapEnabled: (v) => {
    set({ readerEdgeTapEnabled: v })
    try {
      localStorage.setItem(EDGE_TAP_LS, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  },

  setReaderMarginPresetIndex: (v) => {
    const i = Math.max(0, Math.min(2, Math.round(v)))
    set({ readerMarginPresetIndex: i })
    try {
      localStorage.setItem(MARGIN_IDX_LS, String(i))
    } catch {
      /* ignore */
    }
  },

  resetReaderSession: () =>
    set((s) => ({
      ...initialUi,
      epubLocation: 0,
      epubLoading: true,
      epubError: null,
      bookmarks: [],
      highlights: [],
      readerToc: [],
      pendingHighlight: null,
      showHighlightModal: false,
      editingHighlight: null,
      readerToast: null,
      toastEnter: false,
      showBookmarkNoteModal: false,
      pendingBookmarkLocation: '',
      currentPage: 1,
      totalPages: 0,
      pageInput: '',
      currentChapter: '',
      lastSelectedText: '',
      isBookmarked: false,
      isSearchingText: false,
      textSearchResults: [],
      searchQuery: '',
      searchScope: 'toc',
      isFullscreen: s.isFullscreen,
      readerChromeVisible: s.readerChromeVisible,
      ttsLanguage: s.ttsLanguage,
      scrollMode: s.scrollMode,
      readerNavChromeMode: s.readerNavChromeMode,
      readerEdgeTapEnabled: s.readerEdgeTapEnabled,
      readerMarginPresetIndex: s.readerMarginPresetIndex,
    })),
}))

export type { TextSearchResult }
