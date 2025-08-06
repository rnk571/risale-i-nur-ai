import { useState, useEffect } from 'react'
import { supabase, type Book } from './lib/supabase'
import Auth from './components/Auth'
import BookLibrary from './components/BookLibrary'
import EpubReader from './components/EpubReader'
import AdminPanel from './components/AdminPanel'
import type { User } from '@supabase/supabase-js'
import { LogOut, Shield, BookOpen, User as UserIcon, Moon, Sun } from 'lucide-react'
import { useDarkMode } from './hooks/useDarkMode'

type ViewMode = 'library' | 'reader' | 'admin'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('library')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  useEffect(() => {
    // Mevcut oturumu kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkUserRole(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Auth durumu değişikliklerini dinle
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        checkUserRole(session.user.id)
      } else {
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUserRole = async (userId: string) => {
    try {
      // Önce users tablosunda kullanıcıyı kontrol et
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (userError && userError.code === 'PGRST116') {
        // Kullanıcı users tablosunda yok, oluştur
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser.user) {
          const { error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: userId,
                email: authUser.user.email,
                role: authUser.user.email === 'admin@demo.com' ? 'admin' : 'user'
              }
            ])

          if (!insertError) {
            setUserRole(authUser.user.email === 'admin@demo.com' ? 'admin' : 'user')
          }
        }
      } else if (userData) {
        setUserRole(userData.role)
      }
    } catch (error) {
      console.error('Kullanıcı rolü kontrol edilirken hata:', error)
      setUserRole('user') // Varsayılan olarak user
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setViewMode('library')
    setSelectedBook(null)
  }

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book)
    setViewMode('reader')
  }

  const handleBackToLibrary = () => {
    setSelectedBook(null)
    setViewMode('library')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth onAuthSuccess={() => {}} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300">
      {/* Modern Header - sadece library ve admin modunda göster */}
      {viewMode !== 'reader' && (
        <header className="bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl shadow-lg border-b border-white/20 dark:border-dark-700/30 sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo and Brand */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent transition-colors duration-300">
                    {viewMode === 'admin' ? 'Admin Paneli' : 'Elektronik Kitap Okuyucu'}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1 transition-colors duration-300">
                    Hoş geldiniz, {user.email?.split('@')[0]}
                  </p>
                </div>
              </div>

              {/* Navigation and User Menu */}
              <div className="flex items-center gap-3">
                {/* Admin Toggle */}
                {userRole === 'admin' && (
                  <button
                    onClick={() => setViewMode(viewMode === 'admin' ? 'library' : 'admin')}
                    className="relative group flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-dark-800 hover:bg-blue-50 dark:hover:bg-dark-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200 dark:border-dark-600 hover:border-blue-200 dark:hover:border-blue-400"
                  >
                    <Shield className="w-4 h-4 transition-transform group-hover:scale-110 duration-300" />
                    <span className="hidden md:inline">
                      {viewMode === 'admin' ? 'Kütüphane' : 'Admin Paneli'}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                  </button>
                )}

                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleDarkMode}
                  className="group p-2.5 bg-white dark:bg-dark-800 hover:bg-gray-50 dark:hover:bg-dark-700 border border-gray-200 dark:border-dark-600 hover:border-gray-300 dark:hover:border-dark-500 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  title={isDarkMode ? 'Açık tema' : 'Koyu tema'}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 text-amber-500 group-hover:text-amber-600 transition-colors group-hover:rotate-180 duration-300" />
                  ) : (
                    <Moon className="w-5 h-5 text-slate-600 group-hover:text-slate-700 transition-colors group-hover:rotate-12 duration-300" />
                  )}
                </button>

                {/* User Info Badge */}
                <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-600 transition-colors duration-300">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden lg:block">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${userRole === 'admin' ? 'bg-purple-500' : 'bg-blue-500'} animate-pulse`}></div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">
                        {userRole === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1 duration-200" />
                  <span className="hidden sm:inline">Çıkış</span>
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="relative">
        {viewMode === 'library' && (
          <BookLibrary 
            onBookSelect={handleBookSelect}
            userId={user.id}
            userRole={userRole}
          />
        )}
        
        {viewMode === 'reader' && selectedBook && (
          <EpubReader 
            bookUrl={selectedBook.epub_file_path}
            bookTitle={selectedBook.title}
            bookId={selectedBook.id}
            userId={user.id}
            onBackToLibrary={handleBackToLibrary}
          />
        )}
        
        {viewMode === 'admin' && userRole === 'admin' && (
          <AdminPanel onBackToLibrary={() => setViewMode('library')} />
        )}
      </main>
    </div>
  )
}

export default App