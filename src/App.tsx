import { useState, useEffect } from 'react'
import { supabase, type Book } from './lib/supabase'
import { Auth } from './components/Auth'
import { BookLibrary } from './components/BookLibrary'
import { EpubReader } from './components/EpubReader'
import { AdminPanel } from './components/AdminPanel'
import { useDarkMode } from './hooks/useDarkMode'
import { BookOpen, Settings, LogOut, Moon, Sun, Menu } from 'lucide-react'

type ViewMode = 'auth' | 'library' | 'reader' | 'admin'

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('auth')
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  useEffect(() => {
    // Kullanıcı oturumunu kontrol et
    const checkUser = async () => {
      try {
        setLoading(true)
        
        // Önce mevcut session'ı kontrol et
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          await loadUserData(session)
        } else {
          setViewMode('auth')
          setLoading(false)
        }
      } catch (error) {
        console.error('Session kontrol hatası:', error)
        setViewMode('auth')
        setLoading(false)
      }
    }

    checkUser()

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true)
        await loadUserData(session)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserRole(null)
        setViewMode('auth')
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setLoading(true)
        await loadUserData(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserData = async (session?: any) => {
    try {
      // Session parametresi varsa onu kullan, yoksa session al
      let userSession = session
      if (!userSession) {
        const { data: { session: newSession } } = await supabase.auth.getSession()
        userSession = newSession
      }
      
      if (userSession?.user) {
        // Session'dan user objesi oluştur
        const user: User = {
          id: userSession.user.id,
          email: userSession.user.email!,
          role: userSession.user.email === 'admin@demo.com' ? 'admin' : 'user'
        }
        
        setUser(user)
        setUserRole(user.role)
        setViewMode('library')
        setLoading(false)
        return
      }
      
      // Session yoksa hata
      setLoading(false)
      setViewMode('auth')
      
    } catch (error) {
      console.error('Kullanıcı verileri yüklenirken hata:', error)
      setLoading(false)
      setViewMode('auth')
    }
  }

  const handleAuthSuccess = () => {
    // Auth başarılı olduğunda loadUserData zaten çağrılacak
  }

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book)
    setViewMode('reader')
  }

  const handleBackToLibrary = () => {
    setSelectedBook(null)
    setViewMode('library')
  }

  const handleLogout = async () => {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300">
      {/* Modern Header */}
      {viewMode !== 'reader' && (
        <header className="bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                    Readigo
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                  title={isDarkMode ? 'Açık moda geç' : 'Koyu moda geç'}
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* User Menu */}
                {user && (
                  <div className="relative user-menu-container">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                      title="Kullanıcı menüsü"
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
                              <span className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${
                                userRole === 'admin' 
                                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' 
                                  : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                              }`}>
                                {userRole === 'admin' ? 'Admin' : 'Kullanıcı'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-2">
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
                              <span>Admin Paneli</span>
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
                            <span>Çıkış Yap</span>
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
          <Auth onAuthSuccess={handleAuthSuccess} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
        )}
        {viewMode === 'library' && (
          <BookLibrary 
            onBookSelect={handleBookSelect} 
            userId={user?.id} 
            userRole={userRole}
          />
        )}
        {viewMode === 'reader' && selectedBook && (
          <EpubReader 
            bookUrl={selectedBook.epub_file_path} 
            bookTitle={selectedBook.title} 
            bookId={selectedBook.id} 
            userId={user!.id} 
            onBackToLibrary={handleBackToLibrary}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
          />
        )}
        {viewMode === 'admin' && userRole === 'admin' && (
          <AdminPanel 
            onBackToLibrary={() => setViewMode('library')} 
          />
        )}
      </main>
    </div>
  )
}

export default App