import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Sparkles,
  Type,
  Palette,
  LayoutList,
  Sun,
  Moon,
  Coffee,
  Contrast,
  Monitor,
  BookOpen,
  ScrollText,
  BookmarkCheck,
  BookmarkPlus,
  RotateCcw,
  Eye,
  EyeOff,
  Hand,
  SlidersHorizontal,
} from 'lucide-react'
import { saveReadingProgress } from '../../lib/progressService'
import { useReaderStore } from '../../stores/useReaderStore'
import {
  READER_FONTS_AR,
  READER_FONTS_TR,
  READER_PALETTE_AR,
  READER_PALETTE_FA,
  READER_PALETTE_TR,
  type ReaderAppearancePreset,
} from './readerTheme'

export interface ReaderSettingsPanelProps {
  bookId: string
  userId?: string
  location: string | number
  isBookmarked: boolean
  bookmarkCount: number
  onClose: () => void
  onAppearancePreset: (preset: ReaderAppearancePreset) => void
  onFontSizeChange: (size: number) => void
  toggleBookmark: () => void
  resetReader: () => void
}

export const ReaderSettingsPanel = memo(function ReaderSettingsPanel({
  bookId,
  userId,
  location,
  isBookmarked,
  bookmarkCount,
  onClose,
  onAppearancePreset,
  onFontSizeChange,
  toggleBookmark,
  resetReader,
}: ReaderSettingsPanelProps) {
  const { t } = useTranslation()

  const readingSettingsTab = useReaderStore((s) => s.readingSettingsTab)
  const setReadingSettingsTab = useReaderStore((s) => s.setReadingSettingsTab)
  const readingAppearance = useReaderStore((s) => s.readingAppearance)
  const fontSize = useReaderStore((s) => s.fontSize)
  const trColor = useReaderStore((s) => s.trColor)
  const arColor = useReaderStore((s) => s.arColor)
  const faColor = useReaderStore((s) => s.faColor)
  const setTrColor = useReaderStore((s) => s.setTrColor)
  const setArColor = useReaderStore((s) => s.setArColor)
  const setFaColor = useReaderStore((s) => s.setFaColor)
  const readerWeightTr = useReaderStore((s) => s.readerWeightTr)
  const readerWeightAr = useReaderStore((s) => s.readerWeightAr)
  const setReaderWeightTr = useReaderStore((s) => s.setReaderWeightTr)
  const setReaderWeightAr = useReaderStore((s) => s.setReaderWeightAr)
  const readerFontIdTr = useReaderStore((s) => s.readerFontIdTr)
  const readerFontIdAr = useReaderStore((s) => s.readerFontIdAr)
  const setReaderFontIdTr = useReaderStore((s) => s.setReaderFontIdTr)
  const setReaderFontIdAr = useReaderStore((s) => s.setReaderFontIdAr)
  const progressPercentage = useReaderStore((s) => s.progressPercentage)
  const scrollMode = useReaderStore((s) => s.scrollMode)
  const setScrollMode = useReaderStore((s) => s.setScrollMode)
  const readerNavChromeMode = useReaderStore((s) => s.readerNavChromeMode)
  const setReaderNavChromeMode = useReaderStore((s) => s.setReaderNavChromeMode)
  const readerEdgeTapEnabled = useReaderStore((s) => s.readerEdgeTapEnabled)
  const setReaderEdgeTapEnabled = useReaderStore((s) => s.setReaderEdgeTapEnabled)
  const readerMarginPresetIndex = useReaderStore((s) => s.readerMarginPresetIndex)
  const setReaderMarginPresetIndex = useReaderStore((s) => s.setReaderMarginPresetIndex)

  return (
    <div className="settings-panel z-10 mx-2 shrink-0 sm:mx-4 flex max-h-[min(50vh,520px)] flex-col overflow-hidden rounded-b-2xl border border-t-0 border-gray-200/90 bg-white/93 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.22)] backdrop-blur-xl dark:border-dark-700/55 dark:bg-dark-900/93 dark:shadow-[0_18px_50px_-12px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-2 duration-200">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-gray-200/70 px-3 py-2.5 dark:border-dark-700/50">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-sky-500 to-indigo-600" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100">{t('reader.readingSettings')}</h3>
            <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
              Aşağıdaki sayfada canlı önizleme — tema, yazı ve renk değişince hemen görünür.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-gray-200/80 bg-white/80 p-1.5 text-gray-600 transition-colors hover:bg-gray-50 dark:border-dark-600 dark:bg-dark-800/80 dark:text-gray-300 dark:hover:bg-dark-700"
          title="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-gray-100 px-2 py-2 dark:border-dark-800/80 [&::-webkit-scrollbar]:h-0">
        {(
          [
            { id: 'theme' as const, label: t('reader.theme'), icon: Sparkles },
            { id: 'typography' as const, label: t('reader.typographyTab'), icon: Type },
            { id: 'colors' as const, label: t('reader.tabColors'), icon: Palette },
            { id: 'page' as const, label: t('reader.pageTab'), icon: LayoutList },
          ]
        ).map((tab) => {
          const Icon = tab.icon
          const active = readingSettingsTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReadingSettingsTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${active
                ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md dark:from-sky-500 dark:to-indigo-500'
                : 'bg-gray-100/90 text-gray-600 hover:bg-gray-200/90 dark:bg-dark-800/80 dark:text-gray-300 dark:hover:bg-dark-700/90'
                }`}
            >
              <Icon className="h-3.5 w-3.5 opacity-90" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4">
        {readingSettingsTab === 'theme' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('reader.themePresetsHint')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {([
                { id: 'light' as const, name: t('reader.themeLight'), icon: Sun, desc: t('reader.themeLightDesc') },
                { id: 'sepia' as const, name: t('reader.themeSepia'), icon: Coffee, desc: t('reader.themeSepiaDesc') },
                { id: 'dark' as const, name: t('reader.themeDark'), icon: Moon, desc: t('reader.themeDarkDesc') },
                { id: 'oled' as const, name: t('reader.themeOled'), icon: Contrast, desc: t('reader.themeOledDesc') },
                { id: 'system' as const, name: t('reader.themeSystem'), icon: Monitor, desc: t('reader.themeSystemDesc') },
              ]).map((opt) => {
                const Icon = opt.icon
                const selected = readingAppearance === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onAppearancePreset(opt.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2.5 py-2.5 text-center transition-all ${selected
                      ? 'border-sky-400 bg-gradient-to-br from-sky-50 to-indigo-50 shadow-md dark:border-sky-500/60 dark:from-sky-950/50 dark:to-indigo-950/40'
                      : 'border-gray-200/90 bg-white/70 hover:border-gray-300 dark:border-dark-600 dark:bg-dark-800/50 dark:hover:border-dark-500'
                      }`}
                  >
                    <Icon className="h-6 w-6 shrink-0 text-sky-600 dark:text-sky-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{opt.name}</span>
                    <span className="line-clamp-2 text-[10px] leading-tight text-gray-500 dark:text-gray-400">{opt.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {readingSettingsTab === 'typography' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('reader.fontSize')} · {fontSize}%</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onFontSizeChange(Math.max(50, fontSize - 10))}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm dark:border-dark-600 dark:bg-dark-800"
                >
                  A−
                </button>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={fontSize}
                  onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-dark-700"
                  style={{
                    background: `linear-gradient(to right, #0ea5e9 0%, #6366f1 ${(fontSize - 50) / 1.5}%, rgb(229 231 235) ${(fontSize - 50) / 1.5}%, rgb(229 231 235) 100%)`,
                  }}
                />
                <button
                  type="button"
                  onClick={() => onFontSizeChange(Math.min(200, fontSize + 10))}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm dark:border-dark-600 dark:bg-dark-800"
                >
                  A+
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-3 dark:border-dark-600/60 dark:bg-dark-800/30">
                <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-200">Türkçe · kalınlık</p>
                <div className="mb-3 flex flex-wrap gap-1">
                  {([
                    [300, 'İnce'],
                    [400, 'Normal'],
                    [500, 'Orta'],
                    [600, 'Yarı kalın'],
                    [700, 'Kalın'],
                  ] as const).map(([w, lab]) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setReaderWeightTr(w)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-medium ${readerWeightTr === w
                        ? 'bg-sky-600 text-white dark:bg-sky-500'
                        : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-dark-700 dark:text-gray-300 dark:ring-dark-600'
                        }`}
                    >
                      {lab}
                    </button>
                  ))}
                </div>
                <p className="mb-1.5 text-[10px] text-gray-500 dark:text-gray-400">Yazı tipi</p>
                <div className="max-h-36 space-y-1 overflow-y-auto pr-0.5">
                  {READER_FONTS_TR.map((f) => (
                    <label
                      key={f.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1 hover:bg-white/80 dark:hover:bg-dark-700/50"
                    >
                      <input
                        type="radio"
                        name="reader-font-tr"
                        className="h-3.5 w-3.5 border-gray-300 text-sky-600"
                        checked={readerFontIdTr === f.id}
                        onChange={() => setReaderFontIdTr(f.id)}
                      />
                      <span className="text-xs text-gray-800 dark:text-gray-200">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-3 dark:border-dark-600/60 dark:bg-dark-800/30">
                <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-200">Arapça · kalınlık</p>
                <div className="mb-3 flex flex-wrap gap-1">
                  {([
                    [300, 'İnce'],
                    [400, 'Normal'],
                    [500, 'Orta'],
                    [600, 'Yarı kalın'],
                    [700, 'Kalın'],
                  ] as const).map(([w, lab]) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setReaderWeightAr(w)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-medium ${readerWeightAr === w
                        ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                        : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-dark-700 dark:text-gray-300 dark:ring-dark-600'
                        }`}
                    >
                      {lab}
                    </button>
                  ))}
                </div>
                <p className="mb-1.5 text-[10px] text-gray-500 dark:text-gray-400">lang=&quot;ar&quot;, .proepub-arabic veya RTL gövde</p>
                <div className="max-h-36 space-y-1 overflow-y-auto pr-0.5">
                  {READER_FONTS_AR.map((f) => (
                    <label
                      key={f.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1 hover:bg-white/80 dark:hover:bg-dark-700/50"
                    >
                      <input
                        type="radio"
                        name="reader-font-ar"
                        className="h-3.5 w-3.5 border-gray-300 text-indigo-600"
                        checked={readerFontIdAr === f.id}
                        onChange={() => setReaderFontIdAr(f.id)}
                      />
                      <span className="text-xs text-gray-800 dark:text-gray-200">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {readingSettingsTab === 'colors' && (
          <div className="space-y-4">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('reader.advancedColorsTitle')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('reader.advancedColorsHint')}</p>
            {(
              [
                { label: 'Türkçe / genel', value: trColor, set: setTrColor, palette: READER_PALETTE_TR },
                { label: 'Arapça', value: arColor, set: setArColor, palette: READER_PALETTE_AR },
                { label: 'Farsça', value: faColor, set: setFaColor, palette: READER_PALETTE_FA },
              ] as const
            ).map((row) => (
              <div key={row.label}>
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">{row.label}</label>
                <div className="flex flex-wrap gap-2" role="group" aria-label={row.label}>
                  {row.palette.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      aria-label={`${row.label} ${hex}`}
                      aria-pressed={row.value === hex}
                      onClick={() => row.set(hex)}
                      className={`h-8 w-8 shrink-0 rounded-full border-2 shadow-sm transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${row.value.toLowerCase() === hex.toLowerCase()
                        ? 'scale-105 border-sky-500 ring-2 ring-sky-400/40'
                        : 'border-gray-200 dark:border-dark-600'
                        }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {readingSettingsTab === 'page' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200/80 bg-gradient-to-br from-slate-50/80 to-white/50 p-3 dark:border-dark-600/60 dark:from-dark-800/40 dark:to-dark-900/30">
              <p className="mb-2 text-xs font-semibold text-gray-800 dark:text-gray-100">{t('reader.navChromeTitle')}</p>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    { id: 'always' as const, label: t('reader.navChromeAlways'), icon: Eye },
                    { id: 'on_touch' as const, label: t('reader.navChromeOnTouch'), icon: Hand },
                    { id: 'hidden' as const, label: t('reader.navChromeHidden'), icon: EyeOff },
                  ]
                ).map((row) => {
                  const Icon = row.icon
                  const on = readerNavChromeMode === row.id
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setReaderNavChromeMode(row.id)}
                      className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors duration-150 ${on
                        ? 'border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-600 dark:bg-sky-950/50 dark:text-sky-100'
                        : 'border-gray-200/80 bg-white/60 text-gray-700 dark:border-dark-600 dark:bg-dark-800/50 dark:text-gray-200'
                        }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-80" />
                      {row.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-white/60 px-3 py-2.5 dark:border-dark-600/60 dark:bg-dark-800/40">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{t('reader.edgeTapPageTurn')}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('reader.edgeTapHint')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={readerEdgeTapEnabled}
                onClick={() => setReaderEdgeTapEnabled(!readerEdgeTapEnabled)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${readerEdgeTapEnabled ? 'bg-sky-600' : 'bg-gray-300 dark:bg-dark-600'
                  }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ease-out will-change-transform ${readerEdgeTapEnabled ? 'left-5' : 'left-0.5'
                    }`}
                />
              </button>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t('reader.marginPresetTitle')}
              </label>
              <div className="flex gap-2">
                {([0, 8, 16] as const).map((px, idx) => (
                  <button
                    key={px}
                    type="button"
                    onClick={() => setReaderMarginPresetIndex(idx)}
                    className={`flex-1 rounded-lg border py-2 text-center text-xs font-semibold transition-colors duration-150 ${readerMarginPresetIndex === idx
                      ? 'border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-100'
                      : 'border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-800/60 dark:text-gray-200'
                      }`}
                  >
                    {px}px
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{t('reader.marginPresetHint')}</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-gray-600 dark:text-gray-400">{t('reader.scrollMode')}</label>
              <div className="flex gap-2">
                {[
                  { id: 'paginated', name: t('reader.modePaginated') || 'Sayfalama', icon: BookOpen },
                  { id: 'scroll', name: t('reader.modeScroll') || 'Kaydırma', icon: ScrollText },
                ].map((mode) => {
                  const Icon = mode.icon
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        const newScrollMode = mode.id === 'scroll'
                        if (newScrollMode !== scrollMode) {
                          setScrollMode(newScrollMode)
                          localStorage.setItem(`scrollMode_${bookId}`, String(newScrollMode))
                          if (!newScrollMode) {
                            const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                            if (isMobile) {
                              if (userId && bookId) {
                                saveReadingProgress(userId, bookId, String(location), progressPercentage).catch(() => { })
                              }
                              setTimeout(() => window.location.reload(), 100)
                            }
                          }
                        }
                      }}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-all ${(mode.id === 'scroll' ? scrollMode : !scrollMode)
                        ? 'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/40'
                        : 'border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-800/60'
                        }`}
                    >
                      <Icon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                      <span className="text-center text-xs font-medium text-gray-800 dark:text-gray-100">{mode.name}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">{t('reader.scrollModeHint')}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-dark-700/50">
              <button
                type="button"
                onClick={toggleBookmark}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isBookmarked
                  ? 'border-sky-400 bg-sky-50 text-sky-800 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-200'
                  : 'border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-800'
                  }`}
              >
                {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
                {isBookmarked ? t('reader.removeBookmark') : t('reader.addBookmark')}
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('reader.bookmarksCount', { count: bookmarkCount })}</span>
            </div>

            <button
              type="button"
              onClick={resetReader}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-200"
            >
              <RotateCcw className="h-4 w-4" />
              {t('reader.reset')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
})
