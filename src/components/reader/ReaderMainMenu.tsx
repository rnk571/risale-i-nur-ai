import React from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, Bookmark, Search, Highlighter, Maximize, RotateCcw, Menu, X } from 'lucide-react'
import { useReaderStore } from '../../stores/useReaderStore'
import { triggerReaderHaptic } from '../../lib/readerHaptics'

export interface ReaderMainMenuProps {
  onToggleFullscreen: () => void
  onResetReader: () => void
}

export const ReaderMainMenu: React.FC<ReaderMainMenuProps> = ({ onToggleFullscreen, onResetReader }) => {
  const { t } = useTranslation()
  const showMenu = useReaderStore((s) => s.showMenu)
  const setShowMenu = useReaderStore((s) => s.setShowMenu)
  const setShowSettings = useReaderStore((s) => s.setShowSettings)
  const setShowBookmarks = useReaderStore((s) => s.setShowBookmarks)
  const setShowSearch = useReaderStore((s) => s.setShowSearch)
  const setShowHighlights = useReaderStore((s) => s.setShowHighlights)
  const bookmarks = useReaderStore((s) => s.bookmarks)
  const highlights = useReaderStore((s) => s.highlights)
  const ttsLanguage = useReaderStore((s) => s.ttsLanguage)
  const setTtsLanguage = useReaderStore((s) => s.setTtsLanguage)

  const tap = async (fn: () => void) => {
    await triggerReaderHaptic('light')
    fn()
  }

  return (
    <div className="relative menu-container">
      <button
        type="button"
        data-reader-chrome-control
        onClick={() => tap(() => setShowMenu(!showMenu))}
        className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
        title={t('reader.menu')}
      >
        {showMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border border-white/30 dark:border-dark-700/30 rounded-xl shadow-xl z-30">
          <div className="p-2">
            <button
              type="button"
              onClick={() =>
                tap(() => {
                  setShowSettings(true)
                  setShowMenu(false)
                })
              }
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
            >
              <Settings className="w-4 h-4" />
              <span>{t('reader.readingSettings')}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                tap(() => {
                  setShowBookmarks(true)
                  setShowMenu(false)
                })
              }
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
            >
              <Bookmark className="w-4 h-4" />
              <span>
                {t('reader.bookmarks')} ({bookmarks.length})
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                tap(() => {
                  setShowSearch(true)
                  setShowMenu(false)
                })
              }
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
            >
              <Search className="w-4 h-4" />
              <span>{t('reader.search')}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                tap(() => {
                  setShowHighlights(true)
                  setShowMenu(false)
                })
              }
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
            >
              <Highlighter className="w-4 h-4" />
              <span>
                {t('reader.highlights')} ({highlights.length})
              </span>
            </button>

            <div className="my-2 border-t border-gray-200 dark:border-dark-700" />

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

            <div className="my-2 border-t border-gray-200 dark:border-dark-700" />

            <div className="md:hidden">
              <button
                type="button"
                onClick={() =>
                  tap(() => {
                    onToggleFullscreen()
                    setShowMenu(false)
                  })
                }
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
              >
                <Maximize className="w-4 h-4" />
                <span>{t('reader.fullscreen')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                tap(() => {
                  onResetReader()
                  setShowMenu(false)
                })
              }
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t('reader.restart')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
