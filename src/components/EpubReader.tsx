import React, { useState, useCallback, useRef, useEffect } from 'react'
import { ReactReader } from 'react-reader'
import { ChevronLeft, ChevronRight, Settings, BookOpen, Home, RotateCcw, Bookmark, BookmarkCheck, MoreVertical } from 'lucide-react'
import { saveReadingProgress, getReadingProgress, addBookmark, getBookmarks, deleteBookmark, type Bookmark as BookmarkType } from '../lib/progressService'

interface EpubReaderProps {
  bookUrl: string
  bookTitle: string
  bookId: string
  userId: string
  onBackToLibrary: () => void
  isDarkMode?: boolean
  toggleDarkMode?: () => void
}

export const EpubReader: React.FC<EpubReaderProps> = ({ bookUrl, bookTitle, bookId, userId, onBackToLibrary }) => {
  const [location, setLocation] = useState<string | number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [readerTheme, setReaderTheme] = useState('light')
  const [fontSize, setFontSize] = useState(100)
  const [progressPercentage, setProgressPercentage] = useState(0)
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([])
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const renditionRef = useRef<any>(null)
  const tocRef = useRef<any>(null)
  
  // Timeout için yükleme kontrolü
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.error('EPUB yükleme timeout')
        setError('Kitap yükleme işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.')
        setIsLoading(false)
      }
    }, 15000) // 15 saniye timeout

    return () => clearTimeout(timeout)
  }, [isLoading])
  
  const locationChanged = useCallback((epubcifi: string) => {
    setLocation(epubcifi)
    
    // İlerleme yüzdesini hesapla
    if (renditionRef.current) {
      const book = renditionRef.current.book
      if (book && book.locations && book.locations.percentageFromCfi) {
        try {
          const percentagePromise = book.locations.percentageFromCfi(epubcifi)
          if (percentagePromise && typeof percentagePromise.then === 'function') {
            percentagePromise.then((percentage: number) => {
              const progress = Math.round(percentage * 100)
              setProgressPercentage(progress)
              
              // İlerlemeyi kaydet (debounce ile)
              if (userId && bookId) {
                saveReadingProgress(userId, bookId, epubcifi, progress)
              }
            }).catch((error: any) => {
              console.warn('İlerleme hesaplama hatası:', error)
              setProgressPercentage(0)
            })
          } else {
            // Locations henüz hazır değilse varsayılan değer
            setProgressPercentage(0)
          }
        } catch (error) {
          console.warn('İlerleme hesaplama hatası:', error)
          setProgressPercentage(0)
        }
      }
    }
    
    // Mevcut konumun bookmark olup olmadığını kontrol et
    checkCurrentBookmark(epubcifi)
  }, [userId, bookId])

  // Mevcut konumun bookmark olup olmadığını kontrol et
  const checkCurrentBookmark = (cfi: string) => {
    const bookmark = bookmarks.find(b => b.location === cfi)
    setIsBookmarked(!!bookmark)
  }

  const onReaderReady = useCallback((rendition: any) => {
    console.log('EPUB Reader hazır:', rendition)
    renditionRef.current = rendition
    setIsLoading(false)
    setError(null)
    
    // Tema ayarları
    rendition.themes.register('light', {
      body: { 
        color: '#000',
        background: '#fff',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }
    })
    
    rendition.themes.register('dark', {
      body: { 
        color: '#fff',
        background: '#1a1a1a',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }
    })
    
    rendition.themes.register('sepia', {
      body: { 
        color: '#5c4b37',
        background: '#f4f1ea',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }
    })

    // Varsayılan temayı uygula
    rendition.themes.select(readerTheme)
    rendition.themes.fontSize(`${fontSize}%`)
  }, [readerTheme, fontSize])

  // URL kontrolü ve CORS proxy
  useEffect(() => {
    if (!bookUrl || bookUrl === 'demo-placeholder.epub') {
      setError('Geçersiz kitap dosyası URL\'si')
      setIsLoading(false)
    }
  }, [bookUrl])



  // Dosyayı blob olarak indir
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    const downloadFile = async () => {
      try {
        console.log('Dosya indiriliyor:', bookUrl)
        const response = await fetch(bookUrl)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        console.log('Blob URL oluşturuldu:', url)
        setBlobUrl(url)
        setIsLoading(false)
      } catch (error) {
        console.error('Dosya indirme hatası:', error)
        setError(`Dosya indirilemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`)
        setIsLoading(false)
      }
    }

    if (bookUrl && bookUrl !== 'demo-placeholder.epub') {
      downloadFile()
    }

    // Cleanup
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [bookUrl])

  // Okuma ilerlemesi ve bookmark'ları yükle
  useEffect(() => {
    const loadUserData = async () => {
      if (!userId || !bookId) return

      try {
        // Okuma ilerlemesini yükle (hata durumunda sessizce geç)
        const progress = await getReadingProgress(userId, bookId)
        if (progress) {
          console.log('Önceki okuma ilerlemesi yüklendi:', progress)
          setLocation(progress.current_location)
          setProgressPercentage(progress.progress_percentage)
        }

        // Bookmark'ları yükle (hata durumunda sessizce geç)
        const userBookmarks = await getBookmarks(userId, bookId)
        if (userBookmarks.length > 0) {
          console.log('Bookmark\'lar yüklendi:', userBookmarks.length)
        }
        setBookmarks(userBookmarks)
      } catch (error) {
        console.warn('Kullanıcı verileri yükleme hatası (normal):', error)
        // Hata durumunda varsayılan değerlerle devam et
        setBookmarks([])
        setProgressPercentage(0)
      }
    }

    // Sadece blobUrl hazır olduğunda kullanıcı verilerini yükle
    if (blobUrl) {
      loadUserData()
    }
  }, [userId, bookId, blobUrl])

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

  const changeTheme = (theme: string) => {
    setReaderTheme(theme)
    if (renditionRef.current) {
      renditionRef.current.themes.select(theme)
    }
  }

  const changeFontSize = (newSize: number) => {
    setFontSize(newSize)
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${newSize}%`)
    }
  }

  const resetReader = () => {
    setLocation(0)
    setFontSize(100)
    setReaderTheme('light')
    if (renditionRef.current) {
      renditionRef.current.display(0)
      renditionRef.current.themes.select('light')
      renditionRef.current.themes.fontSize('100%')
    }
  }

  // Bookmark ekle/sil
  const toggleBookmark = async () => {
    if (!userId || !bookId || !location) return

    try {
      if (isBookmarked) {
        // Bookmark'ı sil
        const bookmark = bookmarks.find(b => b.location === location)
        if (bookmark) {
          const success = await deleteBookmark(bookmark.id)
          if (success) {
            setBookmarks(bookmarks.filter(b => b.id !== bookmark.id))
            setIsBookmarked(false)
          }
        }
      } else {
        // Bookmark ekle
        const bookmarkId = await addBookmark(userId, bookId, location.toString())
        if (bookmarkId) {
          const newBookmark: BookmarkType = {
            id: bookmarkId,
            user_id: userId,
            book_id: bookId,
            location: location.toString(),
            created_at: new Date().toISOString()
          }
          setBookmarks([...bookmarks, newBookmark])
          setIsBookmarked(true)
        }
      }
    } catch (error) {
      console.error('Bookmark işlemi hatası:', error)
    }
  }

  // Bookmark'a git
  const goToBookmark = (bookmark: BookmarkType) => {
    if (renditionRef.current) {
      renditionRef.current.display(bookmark.location)
      setShowBookmarks(false)
    }
  }

  // Debug: URL'yi konsola yazdır
  console.log('EPUB URL:', bookUrl)
  console.log('Kitap başlığı:', bookTitle)

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 text-white font-bold">!</div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-xl">
            <h3 className="text-xl font-bold text-red-600 mb-2">
              Kitap Yüklenemedi
            </h3>
            <p className="text-gray-600 mb-4">{bookTitle}</p>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-700 font-medium mb-2">Hata Detayı:</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
            
            <div className="space-y-2 mb-6 text-xs text-gray-500">
              <p><strong>Kitap:</strong> {bookTitle}</p>
              <p className="break-all"><strong>URL:</strong> {bookUrl}</p>
            </div>
            
            <button
              onClick={onBackToLibrary}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Kütüphaneye Dön
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
              <BookOpen className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-xl max-w-md mx-auto">
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
              Kitap Hazırlanıyor
            </h3>
            <p className="text-gray-600 mb-4">{bookTitle}</p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>EPUB dosyası indiriliyor...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <button
              onClick={onBackToLibrary}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors border border-gray-200 hover:border-gray-300"
            >
              İptal Et
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Reader Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-white/30 shadow-lg z-20 sticky top-0">
        <div className="flex items-center justify-between p-4">
          {/* Left Section - Back & Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToLibrary}
              className="group flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white border border-white/50 hover:border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Home className="w-4 h-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
              <span className="hidden sm:inline text-sm font-medium text-gray-700 group-hover:text-blue-600">Kütüphane</span>
            </button>
            
            <div className="hidden md:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent truncate max-w-md">
                {bookTitle}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">Aktif okuma</span>
              </div>
            </div>
          </div>

          {/* Right Section - Controls */}
          <div className="flex items-center gap-2">
            {/* Reading Progress Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/80 border border-white/50 rounded-xl shadow-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700">{progressPercentage}%</span>
            </div>

            {/* Bookmark Toggle */}
            <button
              onClick={toggleBookmark}
              className={`group p-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
                isBookmarked 
                  ? 'bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100' 
                  : 'bg-white/80 border border-white/50 text-gray-600 hover:bg-white hover:text-blue-600'
              }`}
              title={isBookmarked ? "Yer işaretini kaldır" : "Yer işareti ekle"}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-5 h-5 transform group-hover:scale-110 transition-transform" />
              ) : (
                <Bookmark className="w-5 h-5 transform group-hover:scale-110 transition-transform" />
              )}
            </button>

            {/* Bookmarks List */}
            <button
              onClick={() => setShowBookmarks(!showBookmarks)}
              className="group relative p-2.5 bg-white/80 border border-white/50 rounded-xl shadow-sm hover:shadow-md hover:bg-white transition-all duration-200"
              title="Yer işaretleri"
            >
              <MoreVertical className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
              {bookmarks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
                  {bookmarks.length}
                </span>
              )}
            </button>

            {/* Reset Reader */}
            <button
              onClick={resetReader}
              className="group p-2.5 bg-white/80 border border-white/50 rounded-xl shadow-sm hover:shadow-md hover:bg-white transition-all duration-200 hidden sm:block"
              title="Başa dön"
            >
              <RotateCcw className="w-5 h-5 text-gray-600 group-hover:text-orange-600 group-hover:rotate-180 transition-all duration-300" />
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="group p-2.5 bg-white/80 border border-white/50 rounded-xl shadow-sm hover:shadow-md hover:bg-white transition-all duration-200"
              title="Ayarlar"
            >
              <Settings className="w-5 h-5 text-gray-600 group-hover:text-purple-600 group-hover:rotate-90 transition-all duration-300" />
            </button>
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>{progressPercentage}%</span>
            </div>
            
            <div className="flex-1 relative">
              <div className="h-2 bg-gray-200/80 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div 
                className="absolute top-0 h-2 w-8 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full animate-pulse"
                style={{ left: `${Math.max(0, progressPercentage - 8)}%` }}
              />
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Bookmark className="w-3 h-3" />
              <span className="hidden sm:inline">{bookmarks.length} yer işareti</span>
              <span className="sm:hidden">{bookmarks.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Bookmark Panel */}
      {showBookmarks && (
        <div className="bg-white/95 backdrop-blur-xl border-b border-white/30 shadow-xl z-30 max-h-80 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Bookmark className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Yer İşaretleri
                </h3>
              </div>
              <button
                onClick={() => setShowBookmarks(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-5 h-5 text-gray-400 hover:text-gray-600 font-bold">×</div>
              </button>
            </div>
            
            {bookmarks.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bookmark className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Henüz yer işareti eklenmemiş</p>
                <p className="text-xs text-gray-400 mt-1">Önemli sayfaları işaretleyerek hızlıca erişebilirsiniz</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarks.map((bookmark, index) => (
                  <div
                    key={bookmark.id}
                    className="group flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-2xl cursor-pointer transition-all duration-200 border border-blue-100 hover:border-blue-200 shadow-sm hover:shadow-md"
                    onClick={() => goToBookmark(bookmark)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-sm">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-900">Yer İşareti {index + 1}</span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(bookmark.created_at).toLocaleDateString('tr-TR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteBookmark(bookmark.id).then(success => {
                          if (success) {
                            setBookmarks(bookmarks.filter(b => b.id !== bookmark.id))
                            if (bookmark.location === location) {
                              setIsBookmarked(false)
                            }
                          }
                        })
                      }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
                      title="Sil"
                    >
                      <div className="w-4 h-4 font-bold">×</div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modern Settings Panel */}
      {showSettings && (
        <div className="bg-white/95 backdrop-blur-xl border-b border-white/30 shadow-xl z-30">
          <div className="max-w-5xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Okuma Ayarları
                </h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-5 h-5 text-gray-400 hover:text-gray-600 font-bold">×</div>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Font Size Control */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm font-bold">A</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Font Boyutu</h4>
                    <p className="text-xs text-gray-500">Mevcut: {fontSize}%</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => changeFontSize(Math.max(fontSize - 10, 70))}
                      className="w-10 h-10 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 flex items-center justify-center font-bold text-blue-600"
                    >
                      A-
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="range"
                        min="70"
                        max="150"
                        step="10"
                        value={fontSize}
                        onChange={(e) => changeFontSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>70%</span>
                        <span>150%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => changeFontSize(Math.min(fontSize + 10, 150))}
                      className="w-10 h-10 bg-white border border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 flex items-center justify-center font-bold text-blue-600"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme Selection */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-white"></div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Okuma Teması</h4>
                    <p className="text-xs text-gray-500">Gözlerinizi koruyun</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => changeTheme('light')}
                    className={`p-3 rounded-xl transition-all duration-200 border-2 ${
                      readerTheme === 'light'
                        ? 'bg-white border-blue-300 shadow-md'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-full h-8 bg-white rounded-lg border mb-2"></div>
                    <span className="text-xs font-medium text-gray-700">Açık</span>
                  </button>
                  
                  <button
                    onClick={() => changeTheme('sepia')}
                    className={`p-3 rounded-xl transition-all duration-200 border-2 ${
                      readerTheme === 'sepia'
                        ? 'bg-amber-50 border-amber-300 shadow-md'
                        : 'bg-amber-50 border-amber-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="w-full h-8 bg-amber-100 rounded-lg border border-amber-200 mb-2"></div>
                    <span className="text-xs font-medium text-amber-700">Sepia</span>
                  </button>
                  
                  <button
                    onClick={() => changeTheme('dark')}
                    className={`p-3 rounded-xl transition-all duration-200 border-2 ${
                      readerTheme === 'dark'
                        ? 'bg-gray-800 border-gray-600 shadow-md'
                        : 'bg-gray-100 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-full h-8 bg-gray-800 rounded-lg mb-2"></div>
                    <span className={`text-xs font-medium ${readerTheme === 'dark' ? 'text-white' : 'text-gray-700'}`}>Koyu</span>
                  </button>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Navigasyon</h4>
                    <p className="text-xs text-gray-500">Hızlı sayfa geçişi</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={goToPrevious}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-emerald-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200 text-emerald-700 font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Önceki Sayfa
                  </button>
                  <button
                    onClick={goToNext}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    Sonraki Sayfa
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetReader}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-emerald-600 transition-colors text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Başa Dön
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kitap Okuyucu */}
      <div className="flex-1 relative">
        {blobUrl ? (
          <ReactReader
            url={blobUrl}
            location={location}
            locationChanged={locationChanged}
            epubInitOptions={{
              openAs: 'epub'
            }}
            getRendition={onReaderReady}
            tocChanged={(toc: any) => {
              tocRef.current = toc
            }}
            epubOptions={{
              flow: 'paginated',
              manager: 'default'
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BookOpen className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">EPUB dosyası hazırlanıyor...</p>
            </div>
          </div>
        )}
        
        {/* Mobil Navigasyon Butonları */}
        <div className="md:hidden">
          <button
            onClick={goToPrevious}
            className="mobile-nav-button absolute left-4 top-1/2 transform -translate-y-1/2 p-4 bg-white/90 backdrop-blur-sm rounded-full shadow-lg active:shadow-xl transition-all opacity-80 active:opacity-100 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          
          <button
            onClick={goToNext}
            className="mobile-nav-button absolute right-4 top-1/2 transform -translate-y-1/2 p-4 bg-white/90 backdrop-blur-sm rounded-full shadow-lg active:shadow-xl transition-all opacity-80 active:opacity-100 active:scale-95"
          >
            <ChevronRight className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Mobil Alt Navigasyon */}
        <div className="md:hidden absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
            <button
              onClick={toggleBookmark}
              className={`mobile-nav-button p-2 rounded-full transition-colors ${
                isBookmarked 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600'
              }`}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
            
            <div className="w-px h-6 bg-gray-300"></div>
            
            <button
              onClick={() => setShowBookmarks(!showBookmarks)}
              className="mobile-nav-button p-2 rounded-full text-gray-600 relative"
            >
              <MoreVertical className="w-4 h-4" />
              {bookmarks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {bookmarks.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Alt Durum Barı */}
      <div className="bg-gray-50 px-4 py-2 border-t">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Okuma modunda</span>
          <span>Tema: {readerTheme === 'light' ? 'Açık' : readerTheme === 'dark' ? 'Koyu' : 'Sepia'}</span>
        </div>
      </div>
    </div>
  )
}

export default EpubReader