import React, { useState, useCallback, useRef, useEffect } from 'react'
import { ReactReader } from 'react-reader'
import { ChevronLeft, ChevronRight, Settings, BookOpen, ArrowLeft, RotateCcw, Bookmark, BookmarkCheck, Menu, X, AlertTriangle, Minimize, Maximize, Sun, Moon, Trash2 } from 'lucide-react'
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

export const EpubReader: React.FC<EpubReaderProps> = ({ bookUrl, bookTitle, bookId, userId, onBackToLibrary, isDarkMode = false, toggleDarkMode }) => {
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const renditionRef = useRef<any>(null)
  const tocRef = useRef<any>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  
  // Sayfa bilgileri için yeni state'ler
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [currentChapter, setCurrentChapter] = useState('')
  const [, setToc] = useState<any[]>([])

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

  // Page Visibility API ile sekme odağını takip et
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && renditionRef.current) {
        // Sekme odağına döndüğünde mevcut konumu kaydet
        const currentLocation = renditionRef.current.currentLocation()
        if (currentLocation && currentLocation.start) {
          const cfi = currentLocation.start.cfi
          if (cfi && userId && bookId) {
            // Mevcut konumu kaydet
            saveReadingProgress(userId, bookId, cfi, progressPercentage)
          }
        }
        
        // Tema ve font boyutunu yeniden uygula
        setTimeout(() => {
          if (renditionRef.current) {
            const currentTheme = isDarkMode ? 'dark' : 'light'
            renditionRef.current.themes.select(currentTheme)
            renditionRef.current.themes.fontSize(`${fontSize}%`)
            
            // iframe'leri yeniden yapılandır
            const iframes = document.querySelectorAll('.react-reader-container iframe')
            iframes.forEach((iframe: any) => {
              try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
                if (iframeDoc) {
                  if (isDarkMode) {
                    iframeDoc.body.style.backgroundColor = '#0f172a'
                    iframeDoc.body.style.color = '#e5e7eb'
                    iframeDoc.documentElement.style.backgroundColor = '#0f172a'
                    iframeDoc.documentElement.style.color = '#e5e7eb'
                  } else {
                    iframeDoc.body.style.backgroundColor = '#ffffff'
                    iframeDoc.body.style.color = '#1f2937'
                    iframeDoc.documentElement.style.backgroundColor = '#ffffff'
                    iframeDoc.documentElement.style.color = '#1f2937'
                  }
                }
              } catch (error) {
                console.log('Sekme odağında iframe yapılandırma hatası:', error)
              }
            })
          }
        }, 200)
      } else if (document.hidden && renditionRef.current) {
        // Sekme gizlendiğinde mevcut konumu kaydet
        const currentLocation = renditionRef.current.currentLocation()
        if (currentLocation && currentLocation.start) {
          const cfi = currentLocation.start.cfi
          if (cfi && userId && bookId) {
            saveReadingProgress(userId, bookId, cfi, progressPercentage)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [userId, bookId, progressPercentage, isDarkMode, fontSize])

  // Menü dış tıklamada kapanması için
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      // Menü için
      if (showMenu && !target.closest('.menu-container')) {
        setShowMenu(false)
      }
      
      // Yer işaretleri paneli için
      if (showBookmarks && !target.closest('.bookmark-panel')) {
        setShowBookmarks(false)
      }
      
      // Ayarlar paneli için
      if (showSettings && !target.closest('.settings-panel')) {
        setShowSettings(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu, showBookmarks, showSettings])

  // ESC tuşu ile panelleri kapatma
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false)
        } else if (showBookmarks) {
          setShowBookmarks(false)
        } else if (showMenu) {
          setShowMenu(false)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSettings, showBookmarks, showMenu])

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

  // Dark mode değiştiğinde reader theme'ini güncelle
  useEffect(() => {
    const newTheme = isDarkMode ? 'dark' : 'light'
    console.log('Dark mode değişti, yeni tema:', newTheme)
    setReaderTheme(newTheme)
    if (renditionRef.current) {
      changeTheme(newTheme)
    }
    
    // iframe'leri doğrudan manipüle et
    setTimeout(() => {
      const iframes = document.querySelectorAll('.react-reader-container iframe')
      iframes.forEach((iframe: any) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
          if (iframeDoc) {
            if (isDarkMode) {
              iframeDoc.body.style.backgroundColor = '#0f172a'
              iframeDoc.body.style.color = '#e5e7eb'
              iframeDoc.documentElement.style.backgroundColor = '#0f172a'
              iframeDoc.documentElement.style.color = '#e5e7eb'
              
              // Tüm elementleri koyu yap
              const allElements = iframeDoc.querySelectorAll('*')
              allElements.forEach((el: any) => {
                if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
                  el.style.backgroundColor = 'transparent'
                  el.style.color = '#e5e7eb'
                }
              })
            } else {
              iframeDoc.body.style.backgroundColor = '#ffffff'
              iframeDoc.body.style.color = '#1f2937'
              iframeDoc.documentElement.style.backgroundColor = '#ffffff'
              iframeDoc.documentElement.style.color = '#1f2937'
              
              // Tüm elementleri açık yap
              const allElements = iframeDoc.querySelectorAll('*')
              allElements.forEach((el: any) => {
                if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
                  el.style.backgroundColor = 'transparent'
                  el.style.color = '#1f2937'
                }
              })
            }
          }
        } catch (error) {
          console.log('iframe manipülasyon hatası:', error)
        }
      })
    }, 100)
  }, [isDarkMode])

  const locationChanged = useCallback((epubcifi: string) => {
    setLocation(epubcifi)
    
    // İlerleme yüzdesini ve sayfa bilgilerini hesapla
    if (renditionRef.current) {
      const rendition = renditionRef.current
      const book = rendition.book
      
      // Mevcut sayfa bilgilerini al
      try {
        if (rendition.location) {
          const location = rendition.location
          if (location.start) {
            // Mevcut bölüm bilgisini güncelle
            const currentSpine = book.spine.get(location.start.href)
            if (currentSpine) {
              setCurrentChapter(currentSpine.navitem?.label || currentSpine.href || 'Bilinmeyen Bölüm')
            }
            
            // Mevcut sayfa ve toplam sayfa bilgilerini al (sadece mevcut bölüm için)
            if (location.start.displayed && location.end.displayed) {
              setCurrentPage(location.start.displayed.page || 1)
              setTotalPages(location.start.displayed.total || 1)
            }
          }
        }
      } catch (error) {
        console.warn('Sayfa bilgileri alınırken hata:', error)
      }
      
      // İlerleme yüzdesini hesapla - Gelişmiş sistem
      calculateAdvancedProgress(book, epubcifi)
    }
    
    // Mevcut konumun bookmark olup olmadığını kontrol et
    checkCurrentBookmark(epubcifi)
  }, [userId, bookId])

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
    console.log('Mevcut readerTheme:', readerTheme)
    console.log('Mevcut isDarkMode:', isDarkMode)
    
    renditionRef.current = rendition
    setIsLoading(false)
    setError(null)
    
    // Gelişmiş tema ayarları - KAPSAMLI
    rendition.themes.register('light', {
      body: { 
        color: '#1f2937',
        background: '#ffffff',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        'line-height': '1.6',
        'padding': '20px',
        'margin': '0',
        'min-height': '100vh'
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
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        'line-height': '1.6',
        'padding': '20px',
        'margin': '0',
        'min-height': '100vh'
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

    // Mevcut dark mode durumuna göre tema uygula
    const currentTheme = isDarkMode ? 'dark' : 'light'
    console.log('Uygulanacak tema:', currentTheme)
    rendition.themes.select(currentTheme)
    setReaderTheme(currentTheme)
    
    // Font boyutunu uygula
    rendition.themes.fontSize(`${fontSize}%`)
    
    // Yükseklik ayarlaması
    setTimeout(() => {
      const iframes = document.querySelectorAll('.react-reader-container iframe')
      iframes.forEach((iframe: any) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
          if (iframeDoc && iframeDoc.body) {
            if (isFullscreen) {
              iframeDoc.body.style.height = '100vh'
              iframeDoc.body.style.maxHeight = '100vh'
            } else {
              iframeDoc.body.style.height = 'calc(100vh - 140px)'
              iframeDoc.body.style.maxHeight = 'calc(100vh - 140px)'
            }
            iframeDoc.body.style.overflow = 'auto'
          }
        } catch (error) {
          console.log('iframe yükseklik ayarlama hatası:', error)
        }
      })
    }, 100)
    
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

      // Locations'ı oluştur (ilerleme hesaplama için)
      rendition.book.ready.then(() => {
        return rendition.book.locations.generate(1024) // 1024 karakterde bir konum oluştur
      }).then(() => {
        console.log('Locations oluşturuldu')
      }).catch((error: any) => {
        console.warn('Locations oluşturulurken hata:', error)
      })
    }
    
    console.log('=== READER READY TAMAMLANDI ===')
  }, [readerTheme, fontSize])

  // Debug için blobUrl değişikliklerini izle
  useEffect(() => {
    console.log('EpubReader debug - blobUrl:', blobUrl, 'isLoading:', isLoading, 'error:', error)
  }, [blobUrl, isLoading, error])

  // Dosyayı blob olarak indir
  useEffect(() => {
    const downloadFile = async () => {
      try {
        console.log('=== DOSYA İNDİRME BAŞLADI ===')
        console.log('bookUrl:', bookUrl)
        console.log('bookTitle:', bookTitle)
        
        const response = await fetch(bookUrl)
        console.log('Fetch response status:', response.status)
        console.log('Fetch response ok:', response.ok)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const blob = await response.blob()
        console.log('Blob size:', blob.size, 'bytes')
        console.log('Blob type:', blob.type)
        
        const url = URL.createObjectURL(blob)
        console.log('Blob URL oluşturuldu:', url)
        
        setBlobUrl(url)
        setIsLoading(false) // Blob URL oluşturulduğunda loading'i false yap
        console.log('=== DOSYA İNDİRME TAMAMLANDI ===')
      } catch (error) {
        console.error('=== DOSYA İNDİRME HATASI ===')
        console.error('Dosya indirme hatası:', error)
        setError('Kitap dosyası indirilemedi. Lütfen tekrar deneyin.')
        setIsLoading(false)
      }
    }

    if (bookUrl && bookUrl !== 'demo-placeholder.epub') {
      console.log('Dosya indirme başlatılıyor...')
      downloadFile()
    } else {
      console.log('Geçersiz bookUrl:', bookUrl)
      setError('Geçersiz kitap URL\'si')
      setIsLoading(false)
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [bookUrl])

  // Kullanıcı verilerini yükle (ilerleme ve bookmark'lar)
  useEffect(() => {
    const loadUserData = async () => {
      if (userId && bookId && blobUrl) {
        try {
          // İlerleme verilerini yükle
          const progress = await getReadingProgress(userId, bookId)
          if (progress) {
            setProgressPercentage(progress.progress_percentage)
            // İlerleme konumuna git
            if (renditionRef.current && progress.current_location) {
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
        } catch (error) {
          console.warn('Kullanıcı verileri yüklenirken hata:', error)
          // Hata durumunda varsayılan değerlerle devam et
          setProgressPercentage(0)
          setBookmarks([])
        }
      }
    }

    loadUserData()
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
    console.log('=== CHANGE THEME ===')
    console.log('Current theme:', readerTheme)
    console.log('New theme:', theme)
    console.log('Rendition ref:', !!renditionRef.current)
    console.log('isDarkMode:', isDarkMode)
    
    setReaderTheme(theme)
    if (renditionRef.current) {
      console.log('Applying theme to rendition...')
      renditionRef.current.themes.select(theme)
      console.log('Theme applied successfully')
      
      // iframe'leri doğrudan manipüle et
      setTimeout(() => {
        const iframes = document.querySelectorAll('.react-reader-container iframe')
        iframes.forEach((iframe: any) => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
            if (iframeDoc) {
              if (theme === 'dark') {
                iframeDoc.body.style.backgroundColor = '#0f172a'
                iframeDoc.body.style.color = '#e5e7eb'
                iframeDoc.documentElement.style.backgroundColor = '#0f172a'
                iframeDoc.documentElement.style.color = '#e5e7eb'
                
                // Tüm elementleri koyu yap
                const allElements = iframeDoc.querySelectorAll('*')
                allElements.forEach((el: any) => {
                  if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
                    el.style.backgroundColor = 'transparent'
                    el.style.color = '#e5e7eb'
                  }
                })
              } else {
                iframeDoc.body.style.backgroundColor = '#ffffff'
                iframeDoc.body.style.color = '#1f2937'
                iframeDoc.documentElement.style.backgroundColor = '#ffffff'
                iframeDoc.documentElement.style.color = '#1f2937'
                
                // Tüm elementleri açık yap
                const allElements = iframeDoc.querySelectorAll('*')
                allElements.forEach((el: any) => {
                  if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
                    el.style.backgroundColor = 'transparent'
                    el.style.color = '#1f2937'
                  }
                })
              }
            }
          } catch (error) {
            console.log('iframe manipülasyon hatası:', error)
          }
        })
      }, 100)
      
      // Tema değişikliğini global dark mode ile senkronize et
      if (theme === 'dark' && !isDarkMode && toggleDarkMode) {
        console.log('Global dark mode aktifleştiriliyor...')
        toggleDarkMode()
      } else if (theme === 'light' && isDarkMode && toggleDarkMode) {
        console.log('Global dark mode deaktifleştiriliyor...')
        toggleDarkMode()
      }
    } else {
      console.log('Rendition ref not available')
    }
  }

  const changeFontSize = (newSize: number) => {
    setFontSize(newSize)
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${newSize}%`)
    }
  }

  const resetReader = () => {
    if (renditionRef.current) {
      renditionRef.current.display()
      setProgressPercentage(0)
    }
  }

  const toggleBookmark = async () => {
    if (!userId || !bookId) return

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
        // Yeni bookmark ekle
        const chapterTitleForBookmark = currentChapter || ''
        
        // Mevcut sayfa ve ilerleme bilgilerini hesapla
        let bookmarkNote = ''
        
        // Mevcut sayfa bilgilerini kullan
        if (currentPage > 0 && totalPages > 0) {
          bookmarkNote = `Sayfa ${currentPage}/${totalPages}`
        } else if (currentChapter) {
          bookmarkNote = currentChapter
        } else {
          bookmarkNote = 'Yer İşareti'
        }
        
        // Locations API ile yüzde hesaplamayı dene
        if (renditionRef.current?.book?.locations) {
          try {
            const percentage = renditionRef.current.book.locations.percentageFromCfi(location as string)
            if (typeof percentage === 'number' && !isNaN(percentage)) {
              const percentageRounded = Math.round(percentage * 100)
              bookmarkNote += ` (%${percentageRounded})`
            }
          } catch (error) {
            console.log('Yüzde hesaplama hatası:', error)
          }
        }
        

        
        const bookmarkId = await addBookmark(userId, bookId, location as string, bookmarkNote, chapterTitleForBookmark)
        if (bookmarkId) {
          const newBookmark: BookmarkType = {
            id: bookmarkId,
            user_id: userId,
            book_id: bookId,
            location: location as string,
            note: bookmarkNote,
            chapter_title: chapterTitleForBookmark,
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

  // Yer işareti için detaylı konum bilgisi oluştur
  const getBookmarkLocationInfo = (bookmark: BookmarkType): { title: string; details: string } => {
    // Eğer kaydedilmiş sayfa bilgisi varsa ve geçerliyse onu kullan
    if (bookmark.note && bookmark.note.trim() !== '' && bookmark.note !== 'undefined') {
      return {
        title: bookmark.chapter_title || 'Yer İşareti',
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
              details.push(`Sayfa ${estimatedPage}/${totalPages}`)
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
        let title = 'Yer İşareti'
        
        

        // Sayfa ve yüzde bilgisi
        if (renditionRef.current?.book?.locations) {
          try {
            const percentage = renditionRef.current.book.locations.percentageFromCfi(bookmark.location)
            if (typeof percentage === 'number' && !isNaN(percentage)) {
              const percentageRounded = Math.round(percentage * 100)
              details.push(`%${percentageRounded}`)
              
              if (totalPages > 0) {
                const estimatedPage = Math.max(1, Math.min(totalPages, Math.round(percentage * totalPages)))
                details.push(`Sayfa ${estimatedPage}/${totalPages}`)
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
              details.push(`Paragraf ${elementNum}`)
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
      title: `Yer İşareti ${bookmarkIndex + 1}`,
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

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Tam ekran değişikliklerini dinle ve yüksekliği güncelle
  useEffect(() => {
    const updateHeight = () => {
      const iframes = document.querySelectorAll('.react-reader-container iframe')
      iframes.forEach((iframe: any) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
          if (iframeDoc && iframeDoc.body) {
            if (isFullscreen) {
              iframeDoc.body.style.height = '100vh'
              iframeDoc.body.style.maxHeight = '100vh'
            } else {
              iframeDoc.body.style.height = 'calc(100vh - 140px)'
              iframeDoc.body.style.maxHeight = 'calc(100vh - 140px)'
            }
            iframeDoc.body.style.overflow = 'auto'
          }
        } catch (error) {
          console.log('iframe yükseklik ayarlama hatası:', error)
        }
      })
    }

    // Kısa bir gecikme ile yüksekliği güncelle
    setTimeout(updateHeight, 100)
  }, [isFullscreen])

  // Window resize olayını dinle ve yüksekliği güncelle
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        const iframes = document.querySelectorAll('.react-reader-container iframe')
        iframes.forEach((iframe: any) => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
            if (iframeDoc && iframeDoc.body) {
              if (isFullscreen) {
                iframeDoc.body.style.height = '100vh'
                iframeDoc.body.style.maxHeight = '100vh'
              } else {
                iframeDoc.body.style.height = 'calc(100vh - 140px)'
                iframeDoc.body.style.maxHeight = 'calc(100vh - 140px)'
              }
              iframeDoc.body.style.overflow = 'auto'
            }
          } catch (error) {
            console.log('resize iframe yükseklik ayarlama hatası:', error)
          }
        })
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isFullscreen])

  const epubInitOptions = {
    openAs: 'epub',
    flow: 'paginated',
    manager: 'continuous'
  }

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 ios-safe-area">
        <div className="bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-20 sticky top-0 ios-nav-safe-area">
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">Yükleniyor...</p>
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Kitap Yükleniyor</h2>
            <p className="text-gray-600 dark:text-gray-400">Lütfen bekleyin...</p>
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
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 ios-safe-area">
        <div className="bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-20 sticky top-0 ios-nav-safe-area">
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
                  <p className="text-sm text-red-600 dark:text-red-400">Hata</p>
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Yükleme Hatası</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-lg"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 flex flex-col ios-safe-area ${
      isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-dark-950' : ''
    }`}>
      {/* Modern Reader Header - Kompakt */}
      <div className={`bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-20 sticky top-0 transition-all duration-300 ios-nav-safe-area ${
        isFullscreen ? 'hidden' : ''
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

              {/* Dark Mode Toggle */}
              {toggleDarkMode && (
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                  title={isDarkMode ? 'Açık moda geç' : 'Koyu moda geç'}
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}

              {/* Quick Bookmark Button */}
                             <button
                 onClick={toggleBookmark}
                 className={`p-1.5 rounded-lg backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center ${
                   isBookmarked 
                     ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' 
                     : 'bg-white dark:bg-dark-800/80 border-gray-200 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                 }`}
                 title={isBookmarked ? 'Yer işaretini kaldır' : 'Yer işareti ekle'}
               >
                {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>

              {/* Menu Button */}
              <div className="relative menu-container">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                  title="Menü"
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
                        <span>Okuma Ayarları</span>
                      </button>
                      
                                             <button
                         onClick={() => {
                           setShowBookmarks(!showBookmarks)
                           setShowMenu(false)
                         }}
                         className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                       >
                        <Bookmark className="w-4 h-4" />
                        <span>Yer İşaretleri ({bookmarks.length})</span>
                      </button>
                      
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
                          <span>Tam Ekran</span>
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
                        <span>Baştan Başla</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Bookmark Panel */}
      {showBookmarks && !isFullscreen && (
        <div className="bookmark-panel bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Yer İşaretleri</h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">({bookmarks.length})</span>
              </div>
              <button
                onClick={() => setShowBookmarks(false)}
                className="p-1.5 rounded-lg bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-dark-700/80 transition-colors flex items-center justify-center"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {bookmarks.length === 0 ? (
              <div className="text-center py-8">
                <Bookmark className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">Henüz yer işareti eklenmemiş</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {bookmarks.map((bookmark) => {
                  const locationInfo = getBookmarkLocationInfo(bookmark)
                  return (
                    <div
                      key={bookmark.id}
                      onClick={() => goToBookmark(bookmark)}
                      className="p-3 bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-xl border border-white/30 dark:border-dark-700/30 cursor-pointer hover:bg-white/80 dark:hover:bg-dark-700/80 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {locationInfo.title}
                          </p>
                          {locationInfo.details && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                              {locationInfo.details}
                            </p>
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
                            onClick={(e) => deleteBookmarkItem(bookmark, e)}
                            className="p-1 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors flex items-center justify-center"
                            title="Yer işaretini sil"
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

      {/* Modern Settings Panel */}
      {showSettings && !isFullscreen && (
        <div className="settings-panel bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Okuma Ayarları</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-lg bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-dark-700/80 transition-colors flex items-center justify-center"
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tema</label>
                <div className="flex gap-2">
                                     {[
                     { id: 'light', name: 'Açık', icon: '☀️' },
                     { id: 'dark', name: 'Koyu', icon: '🌙' }
                   ].map((theme) => (
                     <button
                       key={theme.id}
                       onClick={() => {
                         console.log('Theme button clicked:', theme.id)
                         changeTheme(theme.id)
                       }}
                       className={`flex-1 py-3 px-4 rounded-xl border transition-all duration-200 ${
                         readerTheme === theme.id
                           ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                           : 'bg-white dark:bg-dark-800/60 border-gray-200 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700/80'
                       }`}
                     >
                      <div className="text-center">
                        <div className="text-lg mb-1">{theme.icon}</div>
                        <div className="text-sm font-medium">{theme.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Font Boyutu: {fontSize}%
                </label>
                <div className="flex items-center gap-3">
                                     <button
                     onClick={() => changeFontSize(Math.max(50, fontSize - 10))}
                     className="p-2 rounded-lg bg-white dark:bg-dark-800/60 border border-gray-200 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700/80 transition-colors flex items-center justify-center"
                   >
                     A-
                   </button>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={fontSize}
                      onChange={(e) => changeFontSize(parseInt(e.target.value))}
                      className="w-full h-full appearance-none bg-transparent cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${fontSize}%, #e5e7eb ${fontSize}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                                     <button
                     onClick={() => changeFontSize(Math.min(200, fontSize + 10))}
                     className="p-2 rounded-lg bg-white dark:bg-dark-800/60 border border-gray-200 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700/80 transition-colors flex items-center justify-center"
                   >
                     A+
                   </button>
                </div>
              </div>
            </div>

            {/* Bookmark Section */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Yer İşaretleri</label>
              <div className="flex items-center gap-3">
                                 <button
                   onClick={toggleBookmark}
                   className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                     isBookmarked 
                       ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400' 
                       : 'bg-white dark:bg-dark-800/60 border-gray-200 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700/80'
                   }`}
                 >
                  {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {isBookmarked ? 'Yer İşaretini Kaldır' : 'Yer İşareti Ekle'}
                  </span>
                </button>
                
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {bookmarks.length} yer işareti
                </span>
              </div>
            </div>

            {/* Reset Button */}
            <div className="mt-6">
                             <button
                 onClick={resetReader}
                 className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
               >
                <RotateCcw className="w-4 h-4" />
                Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Reader - Improved Layout */}
      <div className="flex-1 relative overflow-hidden">
        {blobUrl ? (
          <div className={`w-full h-full react-reader-container ${isDarkMode ? 'dark' : ''} ${
            isFullscreen ? 'fullscreen' : ''
          }`}>
            <ReactReader
              url={blobUrl}
              location={location}
              locationChanged={locationChanged}
              getRendition={onReaderReady}
              epubInitOptions={epubInitOptions}
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
              <p className="text-gray-600 dark:text-gray-400">
                {isLoading ? 'Kitap yükleniyor...' : 'Kitap yüklenemedi'}
              </p>
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>
          </div>
        )}

        {/* Fullscreen Toggle Button - Top Right */}
        <div className={`md:hidden fixed top-12 right-6 z-50 transition-all duration-300 ${
          isFullscreen ? 'block' : 'hidden'
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
      <div className={`md:hidden bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-t border-white/30 dark:border-dark-700/30 shadow-lg transition-all duration-300 ${
        isFullscreen ? 'hidden' : ''
      }`}>
        <div className="px-4 py-2">
          {/* Navigasyon butonları - mobil */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevious}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-dark-700/80 transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
              <span className="text-xs">Önceki</span>
            </button>
            
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span>%{progressPercentage}</span>
              {totalPages > 0 && (
                <>
                  <span>•</span>
                  <span>{currentPage}/{totalPages}</span>
                </>
              )}
            </div>
            
            <button
              onClick={goToNext}
              className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-dark-700/80 transition-colors"
            >
              <span className="text-xs">Sonraki</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar - Kompakt */}
      <div className={`hidden md:block bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border-t border-white/30 dark:border-dark-700/30 transition-all duration-300 ${
        isFullscreen ? 'hidden' : ''
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
              <span>%{progressPercentage}</span>
              {totalPages > 0 && (
                <>
                  <span>•</span>
                  <span>{currentPage}/{totalPages}</span>
                </>
              )}
              <span>•</span>
              <span>{bookmarks.length} yer işareti</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EpubReader