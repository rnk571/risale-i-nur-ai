import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Bookmark, Highlighter } from 'lucide-react'
import { getUserBookmarks, getUserHighlights, type BookmarkWithBook, type HighlightWithBook } from '../lib/progressService'

interface AnnotationsProps {
  user: {
    id: string
    email: string
    role: 'user' | 'admin'
  }
  onBackToLibrary: () => void
  onOpenBookmark: (bookId: string, location: string) => void
  onOpenHighlight: (bookId: string, cfiRange: string) => void
}

export const Annotations: React.FC<AnnotationsProps> = ({ user, onBackToLibrary, onOpenBookmark, onOpenHighlight }) => {
  const { t, i18n } = useTranslation()
  const [bookmarks, setBookmarks] = useState<BookmarkWithBook[]>([])
  const [highlights, setHighlights] = useState<HighlightWithBook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleString(
        i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      )
    } catch {
      return dateStr
    }
  }

  const getHighlightColorClass = (color: string) => {
    switch (color) {
      case 'yellow':
        return 'bg-yellow-400'
      case 'blue':
        return 'bg-blue-400'
      case 'green':
        return 'bg-green-400'
      case 'pink':
        return 'bg-pink-400'
      case 'red':
        return 'bg-red-400'
      case 'purple':
        return 'bg-purple-400'
      default:
        return 'bg-gray-400'
    }
  }

  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        setLoading(true)
        setError(null)

        const [userBookmarks, userHighlights] = await Promise.all([
          getUserBookmarks(user.id),
          getUserHighlights(user.id)
        ])

        setBookmarks(userBookmarks || [])
        setHighlights(userHighlights || [])
      } catch (err) {
        console.error('Kullanıcı yer işaretleri / vurgular yüklenirken hata:', err)
        setError(t('profile.loadError'))
      } finally {
        setLoading(false)
      }
    }

    loadAnnotations()
  }, [user.id, t])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBackToLibrary}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('profile.back')}</span>
          </button>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
            {t('profile.bookmarksTitle')} &amp; {t('profile.highlightsTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('profile.bookmarksSubtitle')}
          </p>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
            <span>{error}</span>
          </div>
        )}

        {/* Yer İşaretleri ve Vurgular */}
        <div className="space-y-6">
          {/* Yer İşaretleri */}
          <div className="bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-dark-700/30 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {t('profile.bookmarksTitle')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('profile.bookmarksSubtitle')}
                </p>
              </div>
              {bookmarks.length > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {bookmarks.length}
                </span>
              )}
            </div>

            {bookmarks.length === 0 ? (
              <div className="py-8 text-sm text-gray-600 dark:text-gray-400 text-center border border-dashed border-gray-300 dark:border-dark-700 rounded-xl">
                {t('profile.bookmarksEmpty')}
              </div>
            ) : (
              <>
                {/* Mobile: Kart listesi */}
                <div className="md:hidden mt-2 space-y-3 max-h-80 overflow-y-auto -mx-1 pr-1">
                  {bookmarks.map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => onOpenBookmark(bm.book_id, bm.location)}
                      className="w-full text-left bg-gray-50/90 dark:bg-dark-800/90 border border-gray-200 dark:border-dark-700 rounded-xl px-3 py-3 shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-dark-700 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                            {bm.books?.title || t('profile.bookmarksTable.unknownBook')}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {bm.books?.author}
                            {bm.books?.author && bm.chapter_title && ' • '}
                            {bm.chapter_title}
                          </p>
                          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-3 whitespace-pre-line">
                            {bm.note && bm.note.trim() ? bm.note : t('reader.bookmark')}
                          </p>
                        </div>
                        <span className="ml-2 flex-shrink-0 text-[10px] text-gray-500 dark:text-gray-400">
                          {formatDateTime(bm.created_at)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Desktop: Tablo görünümü */}
                <div className="hidden md:block mt-2 border border-gray-200 dark:border-dark-700 rounded-xl overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50/80 dark:bg-dark-800/80">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                            {t('profile.bookmarksTable.book')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                            {t('profile.bookmarksTable.note')}
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide whitespace-nowrap">
                            {t('profile.bookmarksTable.date')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-dark-700/60">
                        {bookmarks.map((bm) => (
                          <tr
                            key={bm.id}
                            className="hover:bg-gray-50/70 dark:hover:bg-dark-800/70 transition-colors cursor-pointer"
                            onClick={() => onOpenBookmark(bm.book_id, bm.location)}
                          >
                            <td className="px-3 py-3 align-top">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                                {bm.books?.title || t('profile.bookmarksTable.unknownBook')}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {bm.books?.author && <span>{bm.books.author}</span>}
                                {bm.chapter_title && (
                                  <span>
                                    {bm.books?.author ? ' • ' : ''}
                                    {bm.chapter_title}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 whitespace-pre-line">
                                {bm.note && bm.note.trim()
                                  ? bm.note
                                  : t('reader.bookmark')}
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top text-right whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTime(bm.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Vurgulamalar */}
          <div className="bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-dark-700/30 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Highlighter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {t('profile.highlightsTitle')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('profile.highlightsSubtitle')}
                </p>
              </div>
              {highlights.length > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {highlights.length}
                </span>
              )}
            </div>

            {highlights.length === 0 ? (
              <div className="py-8 text-sm text-gray-600 dark:text-gray-400 text-center border border-dashed border-gray-300 dark:border-dark-700 rounded-xl">
                {t('profile.highlightsEmpty')}
              </div>
            ) : (
              <>
                {/* Mobile: Kart listesi */}
                <div className="md:hidden mt-2 space-y-3 max-h-80 overflow-y-auto -mx-1 pr-1">
                  {highlights.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => onOpenHighlight(h.book_id, h.cfi_range)}
                      className="w-full text-left bg-gray-50/90 dark:bg-dark-800/90 border border-gray-200 dark:border-dark-700 rounded-xl px-3 py-3 shadow-sm hover:shadow-md hover:bg-white dark:hover:bg-dark-700 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                            {h.books?.title || t('profile.bookmarksTable.unknownBook')}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {h.books?.author}
                            {h.books?.author && h.chapter_title && ' • '}
                            {h.chapter_title}
                          </p>
                          <div className="mt-2 flex items-start gap-2">
                            <span
                              className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${getHighlightColorClass(
                                h.color
                              )}`}
                            ></span>
                            <p className="text-xs text-gray-800 dark:text-gray-100 line-clamp-3">
                              "{h.selected_text}"
                            </p>
                          </div>
                          {h.note && (
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-3 whitespace-pre-line">
                              {h.note}
                            </p>
                          )}
                        </div>
                        <span className="ml-2 flex-shrink-0 text-[10px] text-gray-500 dark:text-gray-400">
                          {formatDateTime(h.created_at)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Desktop: Tablo görünümü */}
                <div className="hidden md:block mt-2 border border-gray-200 dark:border-dark-700 rounded-xl overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50/80 dark:bg-dark-800/80">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                            {t('profile.highlightsTable.book')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                            {t('profile.highlightsTable.text')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                            {t('profile.highlightsTable.note')}
                          </th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide whitespace-nowrap">
                            {t('profile.highlightsTable.date')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-dark-700/60">
                        {highlights.map((h) => (
                          <tr
                            key={h.id}
                            className="hover:bg-gray-50/70 dark:hover:bg-dark-800/70 transition-colors cursor-pointer"
                            onClick={() => onOpenHighlight(h.book_id, h.cfi_range)}
                          >
                            <td className="px-3 py-3 align-top">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                                {h.books?.title || t('profile.bookmarksTable.unknownBook')}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {h.books?.author && <span>{h.books.author}</span>}
                                {h.chapter_title && (
                                  <span>
                                    {h.books?.author ? ' • ' : ''}
                                    {h.chapter_title}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex items-start gap-2">
                                <span
                                  className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${getHighlightColorClass(
                                    h.color
                                  )}`}
                                ></span>
                                <p className="text-sm text-gray-800 dark:text-gray-100 line-clamp-3">
                                  "{h.selected_text}"
                                </p>
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top">
                              {h.note ? (
                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 whitespace-pre-line">
                                  {h.note}
                                </p>
                              ) : (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {t('profile.highlightsTable.noNote')}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 align-top text-right whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTime(h.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Annotations


