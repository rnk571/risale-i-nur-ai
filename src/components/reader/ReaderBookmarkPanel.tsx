import { memo, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Bookmark, BookmarkCheck, Trash2, X } from 'lucide-react'
import type { Bookmark as BookmarkType } from '../../lib/progressService'

export interface ReaderBookmarkPanelProps {
  bookmarks: BookmarkType[]
  onClose: () => void
  onGoToBookmark: (b: BookmarkType) => void
  onDeleteBookmark: (b: BookmarkType, e: MouseEvent) => void
  getBookmarkLocationInfo: (b: BookmarkType) => { title: string; details?: string }
}

export const ReaderBookmarkPanel = memo(function ReaderBookmarkPanel({
  bookmarks,
  onClose,
  onGoToBookmark,
  onDeleteBookmark,
  getBookmarkLocationInfo,
}: ReaderBookmarkPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="bookmark-panel bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('reader.bookmarks')}</h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">({bookmarks.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-dark-700/80 transition-colors flex items-center justify-center"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {bookmarks.length === 0 ? (
          <div className="text-center py-8">
            <Bookmark className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">{t('reader.noBookmarks')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
            {bookmarks.map((bookmark) => {
              const locationInfo = getBookmarkLocationInfo(bookmark)
              return (
                <div
                  key={bookmark.id}
                  onClick={() => onGoToBookmark(bookmark)}
                  className="p-3 bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-dark-700/30 cursor-pointer hover:bg-white/80 dark:hover:bg-dark-700/80 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {bookmark.note && bookmark.note.includes('\n') ? (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {bookmark.note.split('\n')[0]}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                            {bookmark.note.split('\n')[1]}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {locationInfo.title}
                          </p>
                          {bookmark.note && bookmark.note.trim() !== '' && (
                            <p className="text-xs text-gray-700 dark:text-gray-300 mb-1 italic">
                              "{bookmark.note}"
                            </p>
                          )}
                        </>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(bookmark.created_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <BookmarkCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <button
                        onClick={(e) => onDeleteBookmark(bookmark, e)}
                        className="p-1 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors flex items-center justify-center"
                        title={t('reader.deleteBookmark')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})
