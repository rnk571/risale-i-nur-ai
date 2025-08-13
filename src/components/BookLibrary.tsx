import React, { useEffect, useState } from 'react'
import { supabase, type Book } from '../lib/supabase'
import { BookOpen, Search } from 'lucide-react'

interface BookLibraryProps {
  onBookSelect: (book: Book) => void
  userId?: string
  userRole?: 'user' | 'admin' | null
  isDarkMode?: boolean
}

export const BookLibrary: React.FC<BookLibraryProps> = ({ onBookSelect, userId, userRole }) => {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBooks()
  }, [userId, userRole])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      setError(null)

      // Admin kullanıcıları tüm kitapları görebilir
      let query = supabase
        .from('books')
        .select('*')
        .eq('is_active', true)

      // Sadece normal kullanıcılar için erişim kontrolü yap
      if (userId && userRole === 'user') {
        // Kullanıcının erişimi olan kitapları getir
        const { data: accessData } = await supabase
          .from('user_book_access')
          .select('book_id')
          .eq('user_id', userId)

        if (accessData && accessData.length > 0) {
          const bookIds = accessData.map(access => access.book_id)
          query = query.in('id', bookIds)
        } else {
          // Kullanıcının hiçbir kitaba erişimi yoksa boş liste döndür
          setBooks([])
          setLoading(false)
          return
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setBooks(data || [])
    } catch (err) {
      console.error('Kitaplar yüklenirken hata:', err)
      setError('Kitaplar yüklenemedi. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BookOpen className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <p className="text-gray-600 dark:text-gray-400">Kitaplar yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 dark:text-red-400 mb-4">
          <p className="text-lg font-medium">Hata</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={fetchBooks}
          className="px-4 py-2 bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg"
        >
          Tekrar Dene
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-6 pt-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-6">
            Kitap Kütüphanesi
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Dijital kitap koleksiyonunuzu keşfedin. Yüzlerce kitap arasından seçiminizi yapın ve okuma yolculuğunuza başlayın.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-lg mx-auto">
            <div className="absolute inset-y-0 left-4 flex items-center">
              <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Kitap, yazar veya konu ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
            />
            <div className="absolute inset-y-0 right-4 flex items-center">
              <div className="w-2 h-2 bg-blue-400 dark:bg-blue-300 rounded-full opacity-50"></div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 mb-12">
          <div className="bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-dark-700/30 text-center">
            <div className="w-12 h-12 bg-blue-500 dark:bg-blue-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-white flex-shrink-0" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredBooks.length}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Toplam Kitap</p>
          </div>
          <div className="bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-dark-700/30 text-center">
            <div className="w-12 h-12 bg-emerald-500 dark:bg-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 rounded-full bg-white dark:bg-dark-700 flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse flex-shrink-0"></div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">24/7</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Erişim</p>
          </div>
        </div>

        {/* Book Grid */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-3xl p-12 border border-gray-200 dark:border-dark-700/30 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-dark-600 dark:to-dark-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {searchTerm ? 'Kitap Bulunamadı' : 'Henüz Kitap Yok'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm 
                  ? 'Arama kriterlerinizi değiştirip tekrar deneyin' 
                  : 'Yönetici tarafından kitaplar eklendiğinde burada görünecek'
                }
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-2 bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl"
                >
                  Aramayı Temizle
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredBooks.map((book, index) => (
              <div
                key={book.id}
                onClick={() => onBookSelect(book)}
                className="group cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 group-hover:bg-white/90 dark:group-hover:bg-dark-700/90">
                  {/* Book Cover */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 dark:from-blue-600 dark:via-purple-600 dark:to-indigo-700 rounded-xl relative overflow-hidden mb-4 shadow-lg">
                    {book.cover_image ? (
                      <img
                        src={book.cover_image}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white opacity-80 flex-shrink-0" />
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="w-12 h-12 bg-white/90 dark:bg-dark-700/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <div className="w-0 h-0 border-l-[8px] border-l-blue-600 dark:border-l-blue-400 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  </div>

                  {/* Book Info */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 text-sm leading-tight">
                      {book.title}
                    </h3>
                     <div className="flex items-center gap-2">
                       <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">{book.author}</p>
                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                         book.language === 'en'
                           ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                           : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                       }`}>
                         {book.language === 'en' ? 'EN' : 'TR'}
                       </span>
                     </div>
                    {book.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 leading-relaxed">
                        {book.description}
                      </p>
                    )}
                  </div>

                  {/* Read Button */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white text-xs font-semibold rounded-xl text-center shadow-lg">
                      Okumaya Başla
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BookLibrary