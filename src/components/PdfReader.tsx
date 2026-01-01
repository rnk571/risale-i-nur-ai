import React, { useEffect, useRef, useState } from 'react'
import { Worker, Viewer, SpecialZoomLevel, ScrollMode } from '@react-pdf-viewer/core'
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation'
import { thumbnailPlugin } from '@react-pdf-viewer/thumbnail'
import '@react-pdf-viewer/thumbnail/lib/styles/index.css'
import '@react-pdf-viewer/page-navigation/lib/styles/index.css'
import { toolbarPlugin } from '@react-pdf-viewer/toolbar'
import '@react-pdf-viewer/toolbar/lib/styles/index.css'
import '@react-pdf-viewer/core/lib/styles/index.css'
import { ArrowLeft, Sun, Moon, MoreVertical, Minimize, Maximize, RotateCcw, RotateCw, Bookmark, BookmarkCheck, BookmarkPlus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { saveReadingProgress, getReadingProgress, getBookmarks, addBookmark, deleteBookmark, type Bookmark as BookmarkType } from '../lib/progressService'
import { BookmarkNoteModal } from './BookmarkNoteModal'

interface PdfReaderProps {
  bookUrl: string
  bookTitle: string
  bookId: string
  userId: string
  onBackToLibrary: () => void
  isDarkMode?: boolean
  toggleDarkMode?: () => void
  initialLocation?: string
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  bookUrl,
  bookTitle,
  bookId,
  userId,
  onBackToLibrary,
  isDarkMode = false,
  toggleDarkMode,
  initialLocation
}) => {
  const { t } = useTranslation()
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [error] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewerKey, setViewerKey] = useState<number>(Date.now())
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)
  const [defaultZoom, setDefaultZoom] = useState<number | SpecialZoomLevel>(SpecialZoomLevel.PageFit)
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([])
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showBookmarkNoteModal, setShowBookmarkNoteModal] = useState(false)
  const [pendingBookmarkLocation, setPendingBookmarkLocation] = useState<string>('')
  const [showThumbnails, setShowThumbnails] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : false)
  const savedPageRef = useRef<number | null>(null)
  const hasRestoredRef = useRef<boolean>(false)
  const [selectedScrollMode, setSelectedScrollMode] = useState<ScrollMode>(ScrollMode.Vertical)
  const verticalModeRef = useRef<HTMLSpanElement | null>(null)
  const horizontalModeRef = useRef<HTMLSpanElement | null>(null)
  const resumePageRef = useRef<number | null>(null)

  const toolbarPluginInstance = toolbarPlugin()
  const { Toolbar } = toolbarPluginInstance
  const pageNavigationPluginInstance = pageNavigationPlugin()
  const { jumpToPage } = pageNavigationPluginInstance
  const thumbnailPluginInstance = thumbnailPlugin()

  useEffect(() => {
    // Fullscreen geçişlerinde viewer'ı yeniden mount ederek stuck state'leri önle
    setViewerKey(Date.now())
  }, [isFullscreen])

  useEffect(() => {
    const onResize = () => setViewerKey((k) => k) // layout refresh için hafif tetik
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Minimal, modern görünümlü düzen: PDF viewer'ı kendi başlığı ve alt durum çubuğu ile render ediyoruz

  useEffect(() => {
    const init = async () => {
      try {
        let startPage: number | null = null

        // Öncelik: dışarıdan verilen başlangıç konumu (örn. global yer imi listesinden)
        if (initialLocation) {
          const locMatch = initialLocation.match(/page:(\d+)/)
          if (locMatch) {
            startPage = parseInt(locMatch[1], 10) || 1
          }
        }

        // Eğer dışarıdan konum verilmemişse, kayıtlı ilerlemeyi kullan
        if (!startPage) {
          const progress = await getReadingProgress(userId, bookId)
          if (progress && progress.current_location) {
            const match = progress.current_location.match(/page:(\d+)/)
            if (match) {
              startPage = parseInt(match[1], 10) || 1
            }
          }
        }

        if (startPage && startPage > 0) {
          setCurrentPage(startPage)
          // Viewer'ı startPage ile başlatmak için remount et
          setViewerKey(Date.now())
          savedPageRef.current = startPage
        }
        // Bookmark'ları yükle
        const userBookmarks = await getBookmarks(userId, bookId)
        setBookmarks(userBookmarks || [])
      } catch {}
      // Zoom seviyesini localStorage'dan yükle
      try {
        const savedZoom = localStorage.getItem(`pdf:zoom:${userId}:${bookId}`)
        if (savedZoom) {
          const val = parseFloat(savedZoom)
          if (!Number.isNaN(val) && val > 0) setDefaultZoom(val)
        }
      } catch {}
      setLoading(false)
    }
    init()
  }, [userId, bookId, initialLocation])

  // Mevcut sayfa için bookmark durumunu güncelle
  useEffect(() => {
    const loc = `page:${currentPage}`
    setIsBookmarked(bookmarks.some((b) => b.location === loc))
  }, [currentPage, bookmarks])

  const toggleBookmark = async () => {
    const loc = `page:${currentPage}`
    try {
      if (isBookmarked) {
        const bm = bookmarks.find((b) => b.location === loc)
        if (bm) {
          await deleteBookmark(bm.id)
          setBookmarks(bookmarks.filter((b) => b.id !== bm.id))
          setIsBookmarked(false)
        }
      } else {
        // Bookmark not ekleme modalını aç
        setPendingBookmarkLocation(loc)
        setShowBookmarkNoteModal(true)
      }
    } catch {}
  }

  const handleAddBookmarkWithNote = async (note: string) => {
    if (!userId || !bookId || !pendingBookmarkLocation) return

    try {
      const percentage = numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0
      let bookmarkNote = note.trim()
      
      // Eğer not boşsa, sadece sayfa bilgisini ekle
      if (!bookmarkNote) {
        bookmarkNote = `${t('reader.pageShort')} ${currentPage}/${numPages || 0} (%${percentage})`
      } else {
        // Not varsa, not üstte, sayfa bilgisi altta olacak şekilde düzenle
        bookmarkNote = `${bookmarkNote}\n${t('reader.pageShort')} ${currentPage}/${numPages || 0} (%${percentage})`
      }
      
      const id = await addBookmark(userId, bookId, pendingBookmarkLocation, bookmarkNote, '')
      if (id) {
        const newBm: BookmarkType = {
          id,
          user_id: userId,
          book_id: bookId,
          location: pendingBookmarkLocation,
          note: bookmarkNote,
          chapter_title: '',
          created_at: new Date().toISOString(),
        }
        setBookmarks([...bookmarks, newBm])
        setIsBookmarked(true)
      }
    } catch (error) {
      console.error('Bookmark ekleme hatası:', error)
    }
  }

  const deleteBookmarkItem = async (bookmark: BookmarkType) => {
    try {
      const success = await deleteBookmark(bookmark.id)
      if (success) {
        setBookmarks(bookmarks.filter(b => b.id !== bookmark.id))
        // Eğer silinen bookmark mevcut sayfadaysa, bookmark durumunu güncelle
        if (bookmark.location === `page:${currentPage}`) {
          setIsBookmarked(false)
        }
      }
    } catch (error) {
      console.error('Bookmark silme hatası:', error)
    }
  }

  const applyScrollMode = (mode: ScrollMode) => {
    setSelectedScrollMode(mode)
    let targetRef: HTMLSpanElement | null = null
    if (mode === ScrollMode.Vertical) targetRef = verticalModeRef.current
    else if (mode === ScrollMode.Horizontal) targetRef = horizontalModeRef.current
    const btn = targetRef?.querySelector('button') as HTMLButtonElement | null
    if (btn) btn.click()
  }

  useEffect(() => {
    // Fullscreen remount'unda seçili kaydırma modunu uygula ve mevcut sayfaya geri dön
    const timer = window.setTimeout(() => {
      applyScrollMode(selectedScrollMode)
      // Scroll modunu uyguladıktan kısa süre sonra sayfayı geri getir
      const t2 = window.setTimeout(() => {
        if (resumePageRef.current && resumePageRef.current > 0) {
          try { jumpToPage(Math.max(0, resumePageRef.current - 1)) } catch {}
        }
      }, 80)
      return () => window.clearTimeout(t2)
    }, 80)
    return () => window.clearTimeout(timer)
  }, [viewerKey])

  useEffect(() => {
    // Fullscreen toggle edildiğinde de tekrar uygula (ek güvence)
    if (isFullscreen) {
      const t = window.setTimeout(() => applyScrollMode(selectedScrollMode), 120)
      return () => window.clearTimeout(t)
    }
  }, [isFullscreen, selectedScrollMode])

  const handlePageChange = (e: any) => {
    const pageIndex = e.currentPage + 1
    setCurrentPage(pageIndex)
    resumePageRef.current = pageIndex
    if (numPages > 0) {
      const percentage = Math.round((pageIndex / numPages) * 100)
      void saveReadingProgress(userId, bookId, `page:${pageIndex}`, percentage)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300">
        <div className="bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-20 sticky top-0">
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
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-2xl animate-pulse mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-red-600 dark:text-red-400">
        <p>{error}</p>
      </div>
    )
  }

  const progress = numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0

  // Tam ekran modunda üst/bottom bar gizli; çıkmak için bir mini buton ekleyelim (mobilde)
  return (
    <div className={`h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-dark-950' : ''}`}>
      {/* Modern Header */}
      <div className={`bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-20 sticky top-0 ${isFullscreen ? 'hidden' : ''}`}>
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
                  <span>%{progress}</span>
                  {numPages > 0 && (
                    <>
                      <span>•</span>
                      <span>{currentPage}/{numPages}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {toggleDarkMode && (
              <button
                onClick={toggleDarkMode}
                className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                title={isDarkMode ? t('app.light') : t('app.dark')}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            {/* Quick Bookmark */}
            <button
              onClick={toggleBookmark}
              className={`p-1.5 rounded-lg backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center ${
                isBookmarked 
                  ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' 
                  : 'bg-white dark:bg-dark-800/80 border-gray-200 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
              title={isBookmarked ? t('reader.removeBookmark') : t('reader.addBookmark')}
              aria-label={isBookmarked ? t('reader.removeBookmark') : t('reader.addBookmark')}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
            </button>
            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setOpenMenu((v) => !v)}
                className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                aria-haspopup="menu"
                aria-expanded={openMenu}
                title="Menü"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {openMenu && (
                <div className="pdf-menu absolute right-0 mt-2 w-64 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border border-white/30 dark:border-dark-700/30 rounded-xl shadow-xl z-[100] p-2">
                  <Toolbar>
                    {(slots) => {
                      const { GoToPreviousPage, CurrentPageInput, GoToNextPage, ZoomOut, ZoomIn } = slots
                      return (
                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <GoToPreviousPage />
                            <CurrentPageInput />
                            <GoToNextPage />
                          </div>
                          <div className="flex items-center gap-2">
                            <ZoomOut />
                            <ZoomIn />
                            {/* Rotate controls */}
                            <button
                              onClick={() => setRotation((r) => ((r + 270) % 360) as 0 | 90 | 180 | 270)}
                              className="p-1.5 rounded-md flex items-center justify-center"
                              title="Rotate left"
                              aria-label="Rotate left"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270)}
                              className="p-1.5 rounded-md flex items-center justify-center"
                              title="Rotate right"
                              aria-label="Rotate right"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Bookmarks & TOC moved up */}
                            <button
                              onClick={() => { setShowBookmarks((s) => !s); setOpenMenu(false) }}
                              className={`p-1.5 rounded-md flex items-center justify-center ${showBookmarks ? 'text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-900/30' : ''}`}
                              title={t('reader.bookmarks')}
                              aria-label={t('reader.bookmarks')}
                              aria-pressed={showBookmarks}
                            >
                              <Bookmark className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setShowThumbnails((s) => !s); setOpenMenu(false) }}
                              className={`p-1.5 rounded-md flex items-center justify-center ${showThumbnails ? 'text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-900/30' : ''}`}
                              title={t('reader.toc')}
                              aria-label={t('reader.toc')}
                              aria-pressed={showThumbnails}
                            >
                              <div className="flex flex-col items-center justify-center w-4 h-4">
                                <span className="block w-4 h-0.5 bg-current mb-0.5"></span>
                                <span className="block w-4 h-0.5 bg-current mb-0.5"></span>
                                <span className="block w-3 h-0.5 bg-current"></span>
                              </div>
                            </button>
                          </div>
                          <div className="my-2 border-t border-gray-200 dark:border-dark-700" />
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                setIsFullscreen((v) => !v)
                                setOpenMenu(false)
                              }}
                              className={`p-1.5 rounded-md flex items-center justify-center ${isFullscreen ? 'text-blue-600 dark:text-blue-400' : ''}`}
                              title={t('reader.fullscreen')}
                              aria-label={t('reader.fullscreen')}
                              aria-pressed={isFullscreen}
                            >
                              {isFullscreen ? (
                                <Minimize className="w-4 h-4" />
                              ) : (
                                <Maximize className="w-4 h-4" />
                              )}
                            </button>
                            {/* Scroll mode buttons with state tracking (Vertical/Horizontal) */}
                            <button
                              onClick={() => { setSelectedScrollMode(ScrollMode.Vertical); applyScrollMode(ScrollMode.Vertical); setOpenMenu(false) }}
                              className={`p-1.5 rounded-md flex items-center justify-center ${selectedScrollMode === ScrollMode.Vertical ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}`}
                              title="Vertical"
                              aria-label="Vertical"
                              type="button"
                              aria-pressed={selectedScrollMode === ScrollMode.Vertical}
                            >
                              <div className="w-5 h-5 flex items-center justify-center">
                                <div className="flex flex-col items-center justify-center space-y-0.5 leading-none">
                                  <span className="block w-4 h-0.5 bg-current"></span>
                                  <span className="block w-4 h-0.5 bg-current"></span>
                                  <span className="block w-4 h-0.5 bg-current"></span>
                                </div>
                              </div>
                            </button>
                            <button
                              onClick={() => { setSelectedScrollMode(ScrollMode.Horizontal); applyScrollMode(ScrollMode.Horizontal); setOpenMenu(false) }}
                              className={`p-1.5 rounded-md flex items-center justify-center ${selectedScrollMode === ScrollMode.Horizontal ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}`}
                              title="Horizontal"
                              aria-label="Horizontal"
                              type="button"
                              aria-pressed={selectedScrollMode === ScrollMode.Horizontal}
                            >
                              <div className="w-5 h-5 flex items-center justify-center">
                                <div className="flex flex-col items-center justify-center space-y-0.5 leading-none rotate-90">
                                  <span className="block w-4 h-0.5 bg-current"></span>
                                  <span className="block w-4 h-0.5 bg-current"></span>
                                  <span className="block w-4 h-0.5 bg-current"></span>
                                </div>
                              </div>
                            </button>
                            {/* Page mode kaldırıldı */}
                          </div>
                        </div>
                      )
                    }}
                  </Toolbar>
                </div>
              )}
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bookmark Panel under header */}
      {showBookmarks && !isFullscreen && (
        <div className="bookmark-panel bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-10">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{t('reader.bookmarks')}</h3>
                <span className="text-xs text-gray-600 dark:text-gray-400">({bookmarks.length})</span>
              </div>
              <button
                onClick={() => setShowBookmarks(false)}
                className="p-1.5 rounded-lg bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-dark-700/80"
                title={t('common.close')}
              >
                ✕
              </button>
            </div>
            {bookmarks.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-600 dark:text-gray-400">{t('reader.noBookmarks')}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {bookmarks.map((bm) => {
                  const m = bm.location.match(/page:(\d+)/)
                  const page = m ? parseInt(m[1], 10) : 1
                  return (
                    <div
                      key={bm.id}
                      className="p-2 bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 rounded-lg hover:bg-white/80 dark:hover:bg-dark-700/80"
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => { jumpToPage(Math.max(0, page - 1)); setShowBookmarks(false) }}
                        >
                          {bm.note && bm.note.includes('\n') ? (
                            <>
                              {/* Not varsa ve satır sonu içeriyorsa, notu üstte göster */}
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                                {bm.note.split('\n')[0]}
                              </div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                                {bm.note.split('\n')[1]}
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Not yoksa veya tek satırsa, sadece sayfa bilgisini göster */}
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                                {bm.note || `${t('reader.pageShort')} ${page}/${numPages || 0}`}
                              </div>
                            </>
                          )}
                          {/* Tarih bilgisi */}
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            {new Date(bm.created_at).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <BookmarkCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteBookmarkItem(bm)
                            }}
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
      )}

      {/* Viewer */}
      <div className={`flex-1 overflow-hidden ${isFullscreen ? 'pt-0' : ''}`}>
        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
          <div className={`h-full ${isDarkMode ? 'dark' : ''} ${isDarkMode ? 'bg-[#0f172a]' : 'bg-white'}`}>
            <div className="h-full flex overflow-hidden" style={isDarkMode ? { filter: 'invert(0.92) hue-rotate(180deg)' } : undefined}>
              {/* Hidden toolbar controls to allow programmatic scroll mode switching */}
              <div className="hidden">
                <Toolbar>
                  {(slots) => {
                    const { SwitchScrollMode } = slots
                    return (
                      <>
                        <span ref={verticalModeRef}><SwitchScrollMode mode={ScrollMode.Vertical} /></span>
                        <span ref={horizontalModeRef}><SwitchScrollMode mode={ScrollMode.Horizontal} /></span>
                      </>
                    )
                  }}
                </Toolbar>
              </div>
              {/* Thumbnails side panel */}
              <div id="pdf-thumbs-panel" className={`${showThumbnails ? 'block md:block' : 'hidden md:hidden'} w-40 border-r border-gray-200 dark:border-dark-700 overflow-y-auto`}>
                {thumbnailPluginInstance.Thumbnails && <thumbnailPluginInstance.Thumbnails />}
              </div>
              <div className="flex-1 flex items-center justify-center overflow-auto">
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    transform: `rotate(${rotation}deg) ${rotation === 90 || rotation === 270 ? 'scale(0.9)' : 'scale(1)'}`,
                    transformOrigin: 'center center',
                    transition: 'transform 150ms ease',
                  }}
                >
                  <Viewer
                    key={viewerKey}
                    fileUrl={bookUrl}
                    plugins={[toolbarPluginInstance, pageNavigationPluginInstance, thumbnailPluginInstance]}
                    defaultScale={defaultZoom}
                    onDocumentLoad={(e) => {
                      setNumPages(e.doc.numPages)
                      // PDF yüklendiğinde kaydedilmiş sayfaya atla
                      if (!hasRestoredRef.current && savedPageRef.current && savedPageRef.current > 0) {
                        hasRestoredRef.current = true
                        const target = Math.max(0, savedPageRef.current - 1)
                        try {
                          jumpToPage(target)
                        } catch {}
                      }
                      // Yüklemede seçili scroll modunu uygula
                      try { applyScrollMode(selectedScrollMode) } catch {}
                       // Yüklemede mevcut sayfa (eğer varsa) geri getir
                       try {
                         const page = (resumePageRef.current && resumePageRef.current > 0)
                           ? Math.max(0, resumePageRef.current - 1)
                           : Math.max(0, currentPage - 1)
                         jumpToPage(page)
                       } catch {}
                    }}
                    onZoom={(e) => {
                      try {
                        const scale = e.scale
                        if (typeof scale === 'number' && scale > 0) {
                          setDefaultZoom(scale)
                          localStorage.setItem(`pdf:zoom:${userId}:${bookId}`, String(scale))
                        }
                      } catch {}
                    }}
                    onPageChange={handlePageChange}
                    initialPage={Math.max(0, currentPage - 1)}
                  />
                </div>
              </div>
            </div>
          </div>
        </Worker>
        {isFullscreen && (
          <div className="fixed top-12 right-6 z-50">
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 transition-colors text-gray-600/70 dark:text-white/70 hover:text-gray-900 dark:hover:text-white"
              aria-label={t('reader.fullscreen')}
            >
              <Minimize className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className={`hidden md:block bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border-t border-white/30 dark:border-dark-700/30 ${isFullscreen ? 'hidden' : ''}` }>
        <div className="max-w-7xl mx-auto px-4 py-1.5">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span className="truncate max-w-48">{bookTitle}</span>
            <div className="flex items-center gap-3">
              <span>%{progress}</span>
              {numPages > 0 && (
                <>
                  <span>•</span>
                  <span>{currentPage}/{numPages}</span>
                </>
              )}
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
    </div>
  )
}

export default PdfReader


