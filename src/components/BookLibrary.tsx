import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase, type Book } from '../lib/supabase'
import { BookOpen } from 'lucide-react'
import { BookFilters, defaultFilters, type FilterState } from './BookFilters'
import { filterAndSortBooks } from '../utils/bookFilters'

interface BookLibraryProps {
  onBookSelect: (book: Book) => void
  userId?: string
  userRole?: 'user' | 'admin' | null
  isDarkMode?: boolean
}

export const BookLibrary: React.FC<BookLibraryProps> = ({ onBookSelect, userId }) => {
  const { t } = useTranslation()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBooks()
  }, [userId])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      setError(null)

      // Tek sorgu, sonuçları RLS belirler: admin tüm aktifleri, user ise public + atanmışları görür
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBooks(data || [])
    } catch (err) {
      console.error('Kitaplar yüklenirken hata:', err)
      setError(t('library.loadError'))
    } finally {
      setLoading(false)
    }
  }

  // Filtreleme ve sıralama - kullanıcılar sadece aktif kitapları görür
  const filteredBooks = filterAndSortBooks(books, searchTerm, filters)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BookOpen className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 dark:text-red-400 mb-4">
          <p className="text-lg font-medium">{t('common.error')}</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={fetchBooks}
          className="px-4 py-2 bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto p-6 pt-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent mb-4">
            {t('library.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            {t('library.subtitle')}
          </p>
        </div>

        {/* Filters Section */}
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200 dark:border-dark-700/30 shadow-xl overflow-hidden mb-8">
          <div className="p-6">
            <BookFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filters={filters}
              onFiltersChange={setFilters}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              totalCount={books.length}
              filteredCount={filteredBooks.length}
              showStatusFilter={false}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:gap-6 mb-12">
          <div className="bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-dark-700/30 text-center">
            <div className="w-12 h-12 bg-blue-500 dark:bg-blue-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-white flex-shrink-0" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredBooks.length}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{t('library.totalBooks')}</p>
          </div>
          <div className="bg-white/60 dark:bg-dark-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-dark-700/30 text-center">
            <div className="w-12 h-12 bg-emerald-500 dark:bg-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-3">
              <div className="w-6 h-6 rounded-full bg-white dark:bg-dark-700 flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-pulse flex-shrink-0"></div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">24/7</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{t('library.access')}</p>
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
                {searchTerm ? t('library.notFound') : t('library.noBooks')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm ? t('library.notFoundSubtitle') : t('library.emptySubtitle')}
              </p>
              {(searchTerm || showFilters) && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilters(defaultFilters)
                  }}
                  className="px-6 py-2 bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl"
                >
                  {t('library.clearSearch')}
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
                    </div>
                    {book.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 leading-relaxed">
                        {book.description}
                      </p>
                    )}
                    {/* Badges at bottom */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        book.language === 'en'
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                          : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                      }`}>
                        {book.language === 'en' ? 'EN' : 'TR'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {((book as any).epub_file_path || '').toLowerCase().endsWith('.pdf') ? 'PDF' : 'EPUB'}
                      </span>
                      {book.is_public && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                          {t('common.public')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Read Button */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 text-white text-xs font-semibold rounded-xl text-center shadow-lg">
                      {t('common.startReading')}
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