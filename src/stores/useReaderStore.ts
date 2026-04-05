import { create } from 'zustand'
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

const FONT_SIZE_LS = 'epubReader_fontSize'

export type ReadingSettingsTab = 'theme' | 'typography' | 'colors' | 'page'

function readFontSize(): number {
  if (typeof window === 'undefined') return 100
  try {
    const v = parseInt(localStorage.getItem(FONT_SIZE_LS) || '', 10)
    if (!isNaN(v) && v >= 50 && v <= 200) return v
  } catch { /* ignore */ }
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

  setReadingAppearance: (v) => {
    set({ readingAppearance: v })
    try {
      localStorage.setItem(READER_APPEARANCE_LS, v)
    } catch { /* ignore */ }
  },
  setTrColor: (v) => {
    set({ trColor: v })
    try {
      localStorage.setItem(READER_COLOR_LS_TR, v)
    } catch { /* ignore */ }
  },
  setArColor: (v) => {
    set({ arColor: v })
    try {
      localStorage.setItem(READER_COLOR_LS_AR, v)
    } catch { /* ignore */ }
  },
  setFaColor: (v) => {
    set({ faColor: v })
    try {
      localStorage.setItem(READER_COLOR_LS_FA, v)
    } catch { /* ignore */ }
  },
  setReaderFontIdTr: (v) => {
    set({ readerFontIdTr: v })
    try {
      localStorage.setItem(READER_FONT_LS_TR, v)
    } catch { /* ignore */ }
  },
  setReaderFontIdAr: (v) => {
    set({ readerFontIdAr: v })
    try {
      localStorage.setItem(READER_FONT_LS_AR, v)
    } catch { /* ignore */ }
  },
  setReaderWeightTr: (v) => {
    set({ readerWeightTr: v })
    try {
      localStorage.setItem(READER_WEIGHT_LS_TR, String(v))
    } catch { /* ignore */ }
  },
  setReaderWeightAr: (v) => {
    set({ readerWeightAr: v })
    try {
      localStorage.setItem(READER_WEIGHT_LS_AR, String(v))
    } catch { /* ignore */ }
  },
  setReadingSettingsTab: (v) => set({ readingSettingsTab: v }),
  setFontSize: (v) => {
    set({ fontSize: v })
    try {
      localStorage.setItem(FONT_SIZE_LS, String(v))
    } catch { /* ignore */ }
  },
  setProgressPercentage: (v) => set({ progressPercentage: v }),
}))
