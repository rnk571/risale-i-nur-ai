import type { Book } from '../lib/supabase'
import type { FilterState } from '../components/BookFilters'

export const filterAndSortBooks = (
  books: Book[],
  searchTerm: string,
  filters: FilterState
): Book[] => {
  return books
    .filter(book => {
      // Arama terimi filtresi
      const matchesSearch = !searchTerm ||
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (book.description && book.description.toLowerCase().includes(searchTerm.toLowerCase()))

      // Durum filtresi (sadece admin panelinde kullanılır)
      const matchesStatus = filters.status === 'all' ||
        (filters.status === 'active' && book.is_active) ||
        (filters.status === 'inactive' && !book.is_active)

      // Dil filtresi
      const matchesLanguage = filters.language === 'all' ||
        book.language === filters.language

      // Format filtresi
      const filePath = (book as any).epub_file_path || ''
      const bookFormat: 'epub' | 'pdf' = (typeof filePath === 'string' && filePath.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'epub'
      const matchesFormat = filters.format === 'all' || bookFormat === filters.format

      // Erişim türü filtresi
      const matchesAccessType = filters.accessType === 'all' ||
        (filters.accessType === 'public' && book.is_public) ||
        (filters.accessType === 'private' && !book.is_public)

      // Kitap boyutu filtresi
      const matchesBookSize = filters.bookSize === 'all' ||
        book.book_size === filters.bookSize ||
        (!book.book_size && filters.bookSize === 'small') // Varsayılan değer small

      return matchesSearch && matchesStatus && matchesLanguage && matchesFormat && matchesAccessType && matchesBookSize
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'created_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'title_asc':
          return a.title.localeCompare(b.title, 'tr')
        case 'title_desc':
          return b.title.localeCompare(a.title, 'tr')
        case 'author_asc':
          return a.author.localeCompare(b.author, 'tr')
        case 'author_desc':
          return b.author.localeCompare(a.author, 'tr')
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
}
