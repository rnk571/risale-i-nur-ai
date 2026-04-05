import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X, Clipboard } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useReaderStore } from '../../stores/useReaderStore'
import type { TextSearchResult } from './searchTypes'

export type { TextSearchResult } from './searchTypes'

export interface ReaderSearchPanelProps {
  filteredToc: any[]
  onClose: () => void
  onSearchSubmit: () => void | Promise<void>
  onPasteIntoSearch: () => void | Promise<void>
  onTocItemClick: (item: any) => void
  onTextResultClick: (result: TextSearchResult) => void
}

export const ReaderSearchPanel = memo(function ReaderSearchPanel({
  filteredToc,
  onClose,
  onSearchSubmit,
  onPasteIntoSearch,
  onTocItemClick,
  onTextResultClick,
}: ReaderSearchPanelProps) {
  const { t } = useTranslation()
  const {
    searchQuery,
    searchScope,
    isSearchingText,
    textSearchResults,
    setSearchQuery,
    setSearchScope,
  } = useReaderStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      searchScope: s.searchScope,
      isSearchingText: s.isSearchingText,
      textSearchResults: s.textSearchResults,
      setSearchQuery: s.setSearchQuery,
      setSearchScope: s.setSearchScope,
    }))
  )

  return (
    <div className="search-panel bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {t('reader.search')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-dark-700/80 transition-colors flex items-center justify-center"
            title={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          <div className="space-y-3 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('reader.search')}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void onSearchSubmit()
                    }
                  }}
                  placeholder={t('reader.searchPlaceholder')}
                  inputMode="search"
                  className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-200 dark:border-dark-700 bg-white/80 dark:bg-dark-800/80 text-base md:text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  style={{ fontSize: '16px' }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center justify-center"
                    title={t('common.clear') || 'Temizle'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => void onPasteIntoSearch()}
                className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-800 text-xs md:text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-dark-700 hover:bg-gray-200 dark:hover:bg-dark-700 transition-colors flex items-center justify-center"
              >
                <Clipboard className="w-4 h-4" />
              </button>
              <button
                onClick={() => void onSearchSubmit()}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md hover:shadow-lg transition-colors"
                disabled={isSearchingText && searchScope === 'text'}
              >
                {t('reader.search')}
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setSearchScope('toc')}
                className={`flex-1 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${searchScope === 'toc'
                  ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
                  }`}
              >
                {t('reader.searchInHeadings')}
              </button>
              <button
                onClick={() => setSearchScope('text')}
                className={`flex-1 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${searchScope === 'text'
                  ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
                  }`}
              >
                {t('reader.searchInBook')}
              </button>
            </div>

            {searchScope === 'text' && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('reader.searchMinChars')}
              </p>
            )}
          </div>

          <div className="md:col-span-2 space-y-3">
            {searchScope === 'toc' && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredToc.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery.trim()
                      ? t('reader.searchNoResults')
                      : t('reader.searchPlaceholder')}
                  </p>
                ) : (
                  filteredToc.map((item: any, index: number) => (
                    <button
                      key={`${item.id || item.href || index}`}
                      onClick={() => onTocItemClick(item)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-white/70 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.label}
                      </p>
                      {item.fullLabel && item.fullLabel !== item.label && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.fullLabel}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {searchScope === 'text' && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {isSearchingText ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('reader.searching')}
                  </p>
                ) : textSearchResults.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery.trim()
                      ? t('reader.searchNoResults')
                      : t('reader.searchPlaceholder')}
                  </p>
                ) : (
                  textSearchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => onTextResultClick(result)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-white/70 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/40 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                        {result.chapterTitle}
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-100 line-clamp-2">
                        {result.snippet}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
