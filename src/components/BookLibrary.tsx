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
          <BookOpen className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Kitaplar yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <p className="text-lg font-medium">Hata</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={fetchBooks}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tekrar Dene
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6 pt-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Kitap Kütüphanesi
            </h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            Dijital kitap koleksiyonunuzu keşfedin. Yüzlerce kitap arasından seçiminizi yapın ve okuma yolculuğunuza başlayın.
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-lg mx-auto">
            <div className="absolute inset-y-0 left-4 flex items-center">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Kitap, yazar veya konu ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white/80 backdrop-blur-sm border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg text-gray-900 placeholder-gray-500 transition-all duration-200"
            />
            <div className="absolute inset-y-0 right-4 flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full opacity-50"></div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/30 text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{filteredBooks.length}</h3>
            <p className="text-gray-600 text-sm">Toplam Kitap</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/30 text-center">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">24/7</h3>
            <p className="text-gray-600 text-sm">Erişim</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/30 text-center">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 text-white font-bold flex items-center justify-center">∞</div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Sınırsız</h3>
            <p className="text-gray-600 text-sm">Okuma</p>
          </div>
        </div>

        {/* Book Grid */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-12 border border-white/30 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {searchTerm ? 'Kitap Bulunamadı' : 'Henüz Kitap Yok'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Arama kriterlerinizi değiştirip tekrar deneyin' 
                  : 'Yönetici tarafından kitaplar eklendiğinde burada görünecek'
                }
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
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
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/30 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 group-hover:bg-white/90">
                  {/* Book Cover */}
                  <div className="aspect-[3/4] bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl relative overflow-hidden mb-4 shadow-lg">
                    {book.cover_image ? (
                      <img
                        src={book.cover_image}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white opacity-80" />
                      </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <div className="w-0 h-0 border-l-[8px] border-l-blue-600 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  </div>

                  {/* Book Info */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200 text-sm leading-tight">
                      {book.title}
                    </h3>
                    <p className="text-xs text-gray-600 font-medium">{book.author}</p>
                    {book.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {book.description}
                      </p>
                    )}
                  </div>

                  {/* Read Button */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-xl text-center shadow-lg">
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