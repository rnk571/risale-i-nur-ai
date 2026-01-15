import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { supabase, type Book } from './lib/supabase'
import { trackEvent } from './lib/analytics'
import { Auth } from './components/Auth'
import { BookLibrary } from './components/BookLibrary'
import { EpubReader } from './components/EpubReader'
import { PdfReader } from './components/PdfReader'
import { AdminPanel } from './components/AdminPanel'
import { Profile } from './components/Profile'
import { Annotations } from './components/Annotations'
import { AudioBookPage } from './components/AudioBookPage'
import { PrivacyPolicy } from './components/PrivacyPolicy'

import { useDarkMode } from './hooks/useDarkMode'
import { BookOpen, Settings, LogOut, Moon, Sun, Menu, User as UserIcon, Bookmark, Headphones } from 'lucide-react'

type ViewMode = 'auth' | 'library' | 'reader' | 'audio' | 'admin' | 'profile' | 'annotations' | 'privacy'

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
}

function App() {
  const { t, i18n } = useTranslation()


  // ViewMode'u localStorage'dan al veya varsayılan değer kullan
  const getInitialViewMode = (): ViewMode => {
    // Check URL first
    if (window.location.pathname === '/privacy') {
      return 'privacy'
    }

    try {
      const savedViewMode = localStorage.getItem('readigo_viewMode')
      if (savedViewMode && ['auth', 'library', 'reader', 'audio', 'admin', 'profile', 'annotations', 'privacy'].includes(savedViewMode)) {
        return savedViewMode as ViewMode
      }
    } catch (error) {
      console.warn('ViewMode localStorage okuma hatası:', error)
    }
    return 'auth'
  }

  // SelectedBook'u localStorage'dan al
  const getInitialSelectedBook = (): Book | null => {
    try {
      const savedBook = localStorage.getItem('readigo_selectedBook')
      if (savedBook) {
        return JSON.parse(savedBook)
      }
    } catch (error) {
      console.warn('SelectedBook localStorage okuma hatası:', error)
    }
    return null
  }

  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null)
  const [selectedBook, setSelectedBook] = useState<Book | null>(getInitialSelectedBook)
  const [initialReaderLocation, setInitialReaderLocation] = useState<string | null>(null)
  const [initialHighlightCfi, setInitialHighlightCfi] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const [bookOpenChoice, setBookOpenChoice] = useState<Book | null>(null)

  // iOS cihaz tespiti (safe area sınıflarını sadece iOS'ta uygulamak için)
  const isIOSDevice =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

  const iosSafeAreaClass = isIOSDevice ? 'ios-safe-area' : ''
  const iosNavSafeAreaClass = isIOSDevice ? 'ios-nav-safe-area' : ''

  // ViewMode değiştiğinde localStorage'a kaydet ve URL'i güncelle
  useEffect(() => {
    try {
      localStorage.setItem('readigo_viewMode', viewMode)

      // Basic URL update
      if (viewMode === 'privacy') {
        if (window.location.pathname !== '/privacy') {
          window.history.pushState(null, '', '/privacy')
        }
      } else {
        if (window.location.pathname === '/privacy') {
          window.history.pushState(null, '', '/')
        }
      }
    } catch (error) {
      console.warn('ViewMode localStorage yazma hatası:', error)
    }
  }, [viewMode])

  // Browser navigation (Back/Forward) handling
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/privacy') {
        setViewMode('privacy')
      } else if (user) {
        // If logged in and going back from privacy, default to library
        setViewMode('library')
      } else {
        // If not logged in, default to auth
        setViewMode('auth')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [user])

  // SelectedBook değiştiğinde localStorage'a kaydet
  useEffect(() => {
    try {
      if (selectedBook) {
        localStorage.setItem('readigo_selectedBook', JSON.stringify(selectedBook))
      } else {
        localStorage.removeItem('readigo_selectedBook')
      }
    } catch (error) {
      console.warn('SelectedBook localStorage yazma hatası:', error)
    }
  }, [selectedBook])

  // Odağa dönünce zorunlu kontrolü devre dışı bıraktık (kullanıcı akışını bölmesin)

  // Eski odağa dönünce sesssion doğrulama fonksiyonu kaldırıldı (akışı bölmemek için)

  useEffect(() => {
    // Kullanıcı oturumunu kontrol et
    const checkUser = async () => {
      try {
        setLoading(true)

        // Önce mevcut session'ı kontrol et
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          await loadUserData(session, false) // viewMode'u değiştirmeyi devre dışı bırak
          setLoading(false)
        } else {
          // Session yoksa auth'a yönlendir (eğer privacy modunda değilsek)
          if (window.location.pathname !== '/privacy') {
            setViewMode('auth')
          }
          setSelectedBook(null)
          localStorage.removeItem('readigo_viewMode')
          localStorage.removeItem('readigo_selectedBook')
          setLoading(false)
        }
      } catch (error) {
        console.error('Session kontrol hatası:', error)
        setViewMode('auth')
        setSelectedBook(null)
        localStorage.removeItem('readigo_viewMode')
        localStorage.removeItem('readigo_selectedBook')
        setLoading(false)
      }
    }

    checkUser()

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true)
        await loadUserData(session, true) // İlk giriş için viewMode'u değiştir
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserRole(null)
        setSelectedBook(null)
        setViewMode('auth')
        localStorage.removeItem('readigo_viewMode')
        localStorage.removeItem('readigo_selectedBook')
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setLoading(true)
        await loadUserData(session, false) // Token yenileme için viewMode'u değiştirme
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = async (session?: any, shouldChangeViewMode: boolean = true) => {
    try {
      // Session parametresi varsa onu kullan, yoksa session al
      let userSession = session
      if (!userSession) {
        const { data: { session: newSession } } = await supabase.auth.getSession()
        userSession = newSession
      }

      if (userSession?.user) {
        // Önce optimistik kullanıcıyı ayarla, mevcut admin'i düşürme
        const optimisticUser: User = {
          id: userSession.user.id,
          email: userSession.user.email!,
          role: 'user'
        }
        setUser(optimisticUser)
        setUserRole((prev) => (prev === 'admin' ? 'admin' : 'user'))

        // Sadece belirli durumlarda viewMode'u değiştir
        if (shouldChangeViewMode) {
          // Eğer localStorage'da reader mode varsa ve selectedBook varsa, reader'da kal
          const savedViewMode = localStorage.getItem('readigo_viewMode')
          const savedBook = localStorage.getItem('readigo_selectedBook')

          console.log('loadUserData - shouldChangeViewMode:', shouldChangeViewMode)
          console.log('loadUserData - savedViewMode:', savedViewMode)
          console.log('loadUserData - savedBook:', savedBook)

          if (savedViewMode === 'reader' && savedBook) {
            try {
              const parsedBook = JSON.parse(savedBook)
              setSelectedBook(parsedBook)
              setViewMode('reader')
              console.log('loadUserData - reader mode restored')
            } catch (error) {
              console.warn('Saved book parse hatası:', error)
              setViewMode('library')
            }
          } else if (savedViewMode === 'admin') {
            // Admin panelindeyken aynı modda kal sadece localStorage dokunma
            setViewMode((prev) => (prev === 'admin' ? prev : 'admin'))
            console.log('loadUserData - admin mode restored')
          } else if (savedViewMode === 'profile') {
            // Profil sayfasındayken profil sayfasında kal
            setViewMode('profile')
            console.log('loadUserData - profile mode restored')
          } else if (savedViewMode === 'annotations') {
            // Notlar sayfasındayken aynı modda kal
            setViewMode('annotations')
            console.log('loadUserData - annotations mode restored')
          } else if (savedViewMode === 'privacy') {
            setViewMode('privacy')
          } else {
            setViewMode('library')
            console.log('loadUserData - library mode set')
          }
        } else {
          console.log('loadUserData - viewMode not changed (shouldChangeViewMode: false)')
        }

        // Rolü arkaplanda getir ve güncelle
        supabase
          .from('users')
          .select('role')
          .eq('id', userSession.user.id)
          .maybeSingle()
          .then(({ data: roleRow, error: roleError }: any) => {
            if (!roleError && roleRow && (roleRow as any).role === 'admin') {
              setUserRole('admin')
              setUser(prev => prev ? { ...prev, role: 'admin' } : prev)
            }
          })
        return
      }

      // Session yoksa hata (ama privacy modundaysak yönlendirme yapma)
      if (window.location.pathname !== '/privacy') {
        setViewMode('auth')
      }

    } catch (error) {
      console.error('Kullanıcı verileri yüklenirken hata:', error)
      console.error('Kullanıcı verileri yüklenirken hata:', error)
      if (window.location.pathname !== '/privacy') {
        setViewMode('auth')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAuthSuccess = () => {
    // Auth başarılı olduğunda loadUserData zaten çağrılacak
  }



  const handleBookSelect = (book: Book) => {
    setInitialReaderLocation(null)
    setInitialHighlightCfi(null)

    // Transkript olmasa bile ses dosyası varsa sesli kitap modu sunulsun
    const hasAudio = !!(book as any).audio_file_path

    if (hasAudio) {
      setBookOpenChoice(book)
    } else {
      // PostHog: Track book opened as text (no audio option)
      trackEvent({
        event: 'risaleinurai_book_opened',
        properties: {
          book_id: book.id,
          book_title: book.title,
          mode: 'text'
        }
      })
      setSelectedBook(book)
      setViewMode('reader')
    }
  }

  const handleBackToLibrary = () => {
    setSelectedBook(null)
    setInitialReaderLocation(null)
    setInitialHighlightCfi(null)
    setViewMode('library')
    // localStorage'dan reader verilerini temizle
    localStorage.removeItem('readigo_selectedBook')
  }

  const openBookAtLocation = async (bookId: string, location: string, isHighlight: boolean = false) => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .maybeSingle()

      if (error || !data) {
        console.error('Kitap yüklenirken hata:', error)
        return
      }

      const book = data as Book
      setSelectedBook(book)
      if (isHighlight) {
        setInitialReaderLocation(null)
        setInitialHighlightCfi(location)
      } else {
        setInitialReaderLocation(location)
        setInitialHighlightCfi(null)
      }
      setViewMode('reader')
    } catch (err) {
      console.error('Kitap açma hatası:', err)
    }
  }

  const handleLogout = async () => {
    // PostHog: Track logout
    trackEvent({
      event: 'risaleinurai_user_logged_out',
      properties: {
        source: 'user_menu'
      }
    })
    await supabase.auth.signOut()
  }

  // Menü dışına tıklandığında menüyü kapat
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as Element
    if (!target.closest('.user-menu-container')) {
      setShowUserMenu(false)
    }
  }

  useEffect(() => {
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showUserMenu])

  // Loading durumunda loading ekranı göster
  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 flex items-center justify-center ${iosSafeAreaClass}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 ${iosSafeAreaClass}`}>
      {/* Modern Header */}
      {viewMode !== 'reader' && viewMode !== 'audio' && (
        <header className={`bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg sticky top-0 z-50 ${iosNavSafeAreaClass}`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-4">
                <img
                  src="/logo-512.png"
                  alt="App Logo"
                  className="w-8 h-8 md:w-10 md:h-10 rounded-xl shadow-lg object-cover"
                />
                <div>
                  <h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent whitespace-nowrap">
                    {t('app.name')}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                  title={isDarkMode ? t('app.light') : t('app.dark')}
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Language Switch */}
                <button
                  onClick={() => i18n.changeLanguage(i18n.language?.startsWith('tr') ? 'en' : 'tr')}
                  className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                  title={t('app.switchLanguage')}
                  aria-label={t('app.switchLanguage')}
                >
                  <span className="text-[10px] font-semibold uppercase">
                    {i18n.language?.startsWith('tr') ? 'TR' : 'EN'}
                  </span>
                </button>

                {/* User Menu */}
                {user && (
                  <div className="relative user-menu-container">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                      title={t('app.userMenu')}
                    >
                      <Menu className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border border-white/30 dark:border-dark-700/30 rounded-xl shadow-xl z-50">
                        <div className="p-4 border-b border-white/30 dark:border-dark-600/30">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {user.email}
                              </p>
                              <span className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${userRole === 'admin'
                                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                                : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                }`}>
                                {userRole === 'admin' ? t('app.admin') : t('app.user')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-2">
                          {/* Profile Button */}
                          {viewMode === 'library' && (
                            <button
                              onClick={() => {
                                setViewMode('profile')
                                setShowUserMenu(false)
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-white/60 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                            >
                              <UserIcon className="w-4 h-4" />
                              <span>{t('app.profile')}</span>
                            </button>
                          )}

                          {/* Annotations Button */}
                          <button
                            onClick={() => {
                              setViewMode('annotations')
                              setShowUserMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-white/60 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                          >
                            <Bookmark className="w-4 h-4" />
                            <span>{t('app.annotations')}</span>
                          </button>

                          {/* Profile'dan Çıkış Butonu */}
                          {viewMode === 'profile' && (
                            <button
                              onClick={() => {
                                setViewMode('library')
                                setShowUserMenu(false)
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-white/60 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                            >
                              <BookOpen className="w-4 h-4" />
                              <span>{t('app.toLibrary')}</span>
                            </button>
                          )}

                          {/* Annotations'dan Çıkış Butonu */}
                          {viewMode === 'annotations' && (
                            <button
                              onClick={() => {
                                setViewMode('library')
                                setShowUserMenu(false)
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-white/60 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                            >
                              <BookOpen className="w-4 h-4" />
                              <span>{t('app.toLibrary')}</span>
                            </button>
                          )}

                          {/* Admin Panel Button */}
                          {userRole === 'admin' && viewMode === 'library' && (
                            <button
                              onClick={() => {
                                setViewMode('admin')
                                setShowUserMenu(false)
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-white/60 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                            >
                              <Settings className="w-4 h-4" />
                              <span>{t('app.adminPanel')}</span>
                            </button>
                          )}

                          {/* Admin Panelden Çıkış Butonu */}
                          {userRole === 'admin' && viewMode === 'admin' && (
                            <button
                              onClick={() => {
                                setViewMode('library')
                                setShowUserMenu(false)
                                // Admin panel localStorage verilerini temizle
                                localStorage.removeItem('admin_showAddForm')
                                localStorage.removeItem('admin_formData')
                                localStorage.removeItem('admin_editingBook')
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-white/60 dark:hover:bg-dark-800/60 transition-colors text-gray-700 dark:text-gray-300"
                            >
                              <BookOpen className="w-4 h-4" />
                              <span>{t('app.toLibrary')}</span>
                            </button>
                          )}



                          <div className="my-2 border-t border-gray-200 dark:border-dark-700"></div>

                          {/* Logout Button */}
                          <button
                            onClick={() => {
                              handleLogout()
                              setShowUserMenu(false)
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-white/60 dark:hover:bg-dark-800/60 transition-colors text-red-600 dark:text-red-400"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>{t('app.logout')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="relative">
        {viewMode === 'auth' && (
          <Auth
            onAuthSuccess={handleAuthSuccess}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            onPrivacyClick={() => setViewMode('privacy')}
          />
        )}
        {viewMode === 'library' && (
          <>
            <BookLibrary
              onBookSelect={handleBookSelect}
              userId={user?.id}
              userRole={userRole}
            />

            {bookOpenChoice && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-full max-w-md mx-4 bg-white dark:bg-dark-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 dark:border-dark-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
                      {bookOpenChoice.title}
                    </p>
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                      {t('library.openModeTitle')}
                    </h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {t('library.openModeSubtitle')}
                    </p>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        // PostHog: Track book opened as text
                        trackEvent({
                          event: 'risaleinurai_book_opened',
                          properties: {
                            book_id: bookOpenChoice.id,
                            book_title: bookOpenChoice.title,
                            mode: 'text'
                          }
                        })
                        setSelectedBook(bookOpenChoice)
                        setViewMode('reader')
                        setBookOpenChoice(null)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 hover:bg-gray-50 dark:hover:bg-dark-700/80 hover:border-blue-200 dark:hover:border-blue-800 transition-all text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {t('library.openAsText')}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {t('library.openAsTextHint')}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // PostHog: Track book opened as audiobook
                        trackEvent({
                          event: 'risaleinurai_audiobook_started',
                          properties: {
                            book_id: bookOpenChoice.id,
                            book_title: bookOpenChoice.title,
                            mode: 'audio'
                          }
                        })
                        setSelectedBook(bookOpenChoice)
                        setViewMode('audio')
                        setBookOpenChoice(null)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 hover:bg-gray-50 dark:hover:bg-dark-700/80 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Headphones className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {t('library.openAsAudio')}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {t('library.openAsAudioHint')}
                        </div>
                      </div>
                    </button>
                  </div>
                  <div className="px-5 py-3 border-t border-gray-200 dark:border-dark-700 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setBookOpenChoice(null)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {viewMode === 'reader' && selectedBook && (
          selectedBook.epub_file_path?.toLowerCase().endsWith('.pdf') ? (
            <PdfReader
              bookUrl={selectedBook.epub_file_path}
              bookTitle={selectedBook.title}
              bookId={selectedBook.id}
              userId={user!.id}
              onBackToLibrary={handleBackToLibrary}
              isDarkMode={isDarkMode}
              toggleDarkMode={toggleDarkMode}
              initialLocation={initialReaderLocation || undefined}
            />
          ) : (
            <EpubReader
              bookUrl={selectedBook.epub_file_path}
              bookTitle={selectedBook.title}
              bookId={selectedBook.id}
              userId={user!.id}
              onBackToLibrary={handleBackToLibrary}
              isDarkMode={isDarkMode}
              toggleDarkMode={toggleDarkMode}
              initialLocation={initialReaderLocation || undefined}
              initialHighlightCfi={initialHighlightCfi || undefined}
            />
          )
        )}
        {viewMode === 'audio' && selectedBook && user && (
          <AudioBookPage
            book={selectedBook}
            userId={user.id}
            onBackToLibrary={handleBackToLibrary}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
          />
        )}
        {viewMode === 'admin' && userRole === 'admin' && (
          <AdminPanel
            onBackToLibrary={() => {
              setViewMode('library')
              // Admin panel localStorage verilerini temizle
              localStorage.removeItem('admin_showAddForm')
              localStorage.removeItem('admin_formData')
              localStorage.removeItem('admin_editingBook')
            }}
          />
        )}
        {viewMode === 'profile' && user && (
          <Profile
            user={user}
            onBackToLibrary={() => setViewMode('library')}
          />
        )}
        {viewMode === 'annotations' && user && (
          <Annotations
            user={user}
            onBackToLibrary={() => setViewMode('library')}
            onOpenBookmark={(bookId, location) => openBookAtLocation(bookId, location, false)}
            onOpenHighlight={(bookId, cfiRange) => openBookAtLocation(bookId, cfiRange, true)}
          />
        )}

        {viewMode === 'privacy' && (
          <PrivacyPolicy
            onBack={() => {
              if (user) {
                setViewMode('library')
              } else {
                setViewMode('auth')
              }
            }}
          />
        )}
      </main>
    </div>
  )
}

export default App