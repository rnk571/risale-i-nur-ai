import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase, type Book } from '../lib/supabase'
import { BookOpen, ChevronRight } from 'lucide-react'
import { BookFilters, defaultFilters, type FilterState } from './BookFilters'
import { filterAndSortBooks } from '../utils/bookFilters'

interface BookLibraryProps {
  onBookSelect: (book: Book) => void
  userId?: string
  userRole?: 'user' | 'admin' | null
  isDarkMode?: boolean
}

type BookCardVariant = 'large' | 'small'

function BookCard({
  book,
  variant,
  onSelect,
  t,
  shelfRow = false,
}: {
  book: Book
  variant: BookCardVariant
  onSelect: (b: Book) => void
  t: (k: string) => string
  /** Tek satır rafta yatay kaydırma için sabit genişlik */
  shelfRow?: boolean
}) {
  const isLarge = variant === 'large'
  const epubPath = (book as { epub_file_path?: string }).epub_file_path || ''
  const isPdf = epubPath.toLowerCase().endsWith('.pdf')
  const hasAudio = Boolean((book as { audio_file_path?: string }).audio_file_path)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(book)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(book)
        }
      }}
      className={[
        'group flex cursor-pointer flex-col rounded-lg border bg-white transition-colors duration-200 dark:bg-zinc-900',
        'border-zinc-200 dark:border-zinc-800',
        'hover:border-sky-400/60 hover:bg-zinc-50/90 dark:hover:border-sky-500/35 dark:hover:bg-zinc-800/50',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500',
        isLarge ? 'border-l-[3px] border-l-amber-500 pl-2 dark:border-l-amber-400' : '',
        'p-2 sm:p-2.5',
        shelfRow ? (isLarge ? 'w-[10.5rem] shrink-0 sm:w-[11.5rem]' : 'w-[9.25rem] shrink-0 sm:w-[10.25rem]') : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Başlık üstte — daha okunaklı; kapak bilinçli olarak dar tutuldu */}
      <h3 className="order-1 mb-1.5 min-h-[3.25rem] text-center text-[0.95rem] font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100 sm:min-h-[3.5rem] sm:text-[1.0625rem]">
        <span className="line-clamp-2">{book.title}</span>
      </h3>

      <div
        className={[
          'order-2 relative mx-auto mb-2 aspect-[3/4] w-full shrink-0 overflow-hidden rounded-md bg-zinc-100 ring-1 ring-zinc-200/90 dark:bg-zinc-800 dark:ring-zinc-700/90',
          isLarge ? 'max-w-[7rem] sm:max-w-[7.75rem]' : 'max-w-[5.875rem] sm:max-w-[6.5rem]',
        ].join(' ')}
      >
        {book.cover_image ? (
          <img
            src={book.cover_image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
            <BookOpen
              className={`shrink-0 opacity-60 ${isLarge ? 'h-8 w-8' : 'h-7 w-7'}`}
              strokeWidth={1.25}
            />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-900/0 transition-colors duration-200 group-hover:bg-zinc-900/10 dark:group-hover:bg-black/20"
          aria-hidden
        />
        <div className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-zinc-700 opacity-0 shadow-sm ring-1 ring-zinc-200/80 transition-opacity duration-200 group-hover:opacity-100 dark:bg-zinc-800/95 dark:text-zinc-200 dark:ring-zinc-600/80">
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </div>
      </div>

      <div className="order-3 flex flex-1 flex-col gap-1">
        {book.author ? (
          <p className="text-center text-[10px] text-zinc-500 dark:text-zinc-400 sm:text-[11px]">{book.author}</p>
        ) : null}
        {book.description ? (
          <p className="line-clamp-1 text-center text-[10px] leading-snug text-zinc-500 dark:text-zinc-500">
            {book.description}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center justify-center gap-1 pt-0.5">
          {isLarge ? (
            <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 sm:text-[10px]">
              {t('admin.filter.sizeLarge')}
            </span>
          ) : null}
          <span
            className={`rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide sm:text-[10px] ${
              book.language === 'en'
                ? 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200'
                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
          >
            {book.language === 'en' ? 'EN' : 'TR'}
          </span>
          <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 sm:text-[10px]">
            {isPdf ? 'PDF' : 'EPUB'}
          </span>
          {hasAudio ? (
            <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 sm:text-[10px]">
              {t('library.audioBook')}
            </span>
          ) : null}
          {book.is_public ? (
            <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 sm:text-[10px]">
              {t('common.public')}
            </span>
          ) : null}
        </div>
      </div>

      <div className="order-4 mt-2 border-t border-zinc-100 pt-1.5 text-center dark:border-zinc-800">
        <span className="text-[10px] font-medium text-sky-600 opacity-90 group-hover:opacity-100 dark:text-sky-400 sm:text-[11px]">
          {t('common.startReading')}
        </span>
      </div>
    </article>
  )
}

function SectionHeading({
  id,
  title,
  accent,
  countLabel,
  shelfBadge,
}: {
  id: string
  title: string
  accent: 'amber' | 'zinc'
  countLabel: string
  shelfBadge: string
}) {
  const { t } = useTranslation()
  const line =
    accent === 'amber'
      ? 'bg-amber-500 dark:bg-amber-400'
      : 'bg-zinc-300 dark:bg-zinc-600'
  return (
    <div className="mb-3 flex flex-col gap-1 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-2.5">
        <div className={`h-6 w-0.5 shrink-0 rounded-full sm:h-7 ${line}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={id} className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-lg">
              {title}
            </h2>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:text-[11px] ${
                accent === 'amber'
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                  : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {shelfBadge}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 sm:text-xs">
            <span>{countLabel}</span>
            <span className="hidden sm:inline"> · </span>
            <span className="mt-0.5 block text-zinc-400 dark:text-zinc-500 sm:mt-0 sm:inline">
              {t('library.shelfScrollHint')}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

/** Tek satır, soldan sağa kaydırılabilir raf şeridi */
function ShelfScroll({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="library-shelf-scroll flex snap-x snap-proximity touch-pan-x gap-3 overflow-x-auto overflow-y-hidden scroll-smooth pb-1 pt-0.5 [-webkit-overflow-scrolling:touch] sm:gap-3.5"
      role="list"
    >
      {children}
      <div className="w-2 shrink-0 sm:w-3" aria-hidden />
    </div>
  )
}

/** Büyük / küçük boy bölümlerini iki ayrı raf gibi gösterir (üst raf + alt raf). */
function Bookshelf({
  id,
  title,
  countLabel,
  accent,
  shelfBadge,
  children,
}: {
  id: string
  title: string
  countLabel: string
  accent: 'amber' | 'zinc'
  shelfBadge: string
  children: React.ReactNode
}) {
  const niche =
    accent === 'amber'
      ? 'border-amber-200/70 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/15'
      : 'border-zinc-200/90 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-900/40'
  const plankEdge =
    accent === 'amber'
      ? 'from-amber-200/95 to-amber-300/80 dark:from-amber-800/90 dark:to-amber-950/70'
      : 'from-zinc-200 to-zinc-300/95 dark:from-zinc-600 dark:to-zinc-800'
  const plankFront =
    accent === 'amber'
      ? 'bg-amber-300/90 shadow-[0_6px_14px_-4px_rgba(146,64,14,0.35)] dark:bg-amber-900/85 dark:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.45)]'
      : 'bg-zinc-300/90 shadow-[0_5px_12px_-4px_rgba(0,0,0,0.12)] dark:bg-zinc-700 dark:shadow-[0_8px_18px_-4px_rgba(0,0,0,0.35)]'

  return (
    <section aria-labelledby={id} className="relative">
      <SectionHeading
        id={id}
        title={title}
        accent={accent}
        countLabel={countLabel}
        shelfBadge={shelfBadge}
      />
      <div className={`rounded-t-xl border border-b-0 px-1 pb-2 pt-1 sm:px-2 sm:pb-2.5 sm:pt-1.5 ${niche}`}>
        {children}
      </div>
      <div className="relative" aria-hidden>
        <div className={`h-2 rounded-t-md bg-gradient-to-b sm:h-2.5 ${plankEdge}`} />
        <div className={`h-2.5 rounded-b-md sm:h-3 ${plankFront}`} />
      </div>
    </section>
  )
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

  const filteredBooks = filterAndSortBooks(books, searchTerm, filters)

  if (loading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 animate-pulse text-sky-600 dark:text-sky-400" strokeWidth={1.25} />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-zinc-50 py-12 text-center dark:bg-zinc-950">
        <p className="text-base font-medium text-red-600 dark:text-red-400">{t('common.error')}</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
        <button
          type="button"
          onClick={fetchBooks}
          className="mt-4 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }

  const largeBooks = filteredBooks.filter((book) => book.book_size === 'large')
  let smallBooks = filteredBooks.filter((book) => !book.book_size || book.book_size === 'small')
  if (filters.sortBy === 'created_desc') {
    smallBooks = [...smallBooks].sort((a, b) => a.title.localeCompare(b.title, 'tr'))
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-5 sm:py-8">
        <header className="mb-6 border-b border-zinc-200/90 pb-6 dark:border-zinc-800 sm:mb-7 sm:pb-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                {t('library.title')}
              </h1>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 sm:mt-2 sm:text-sm">
                {t('library.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs sm:gap-3 sm:text-sm">
              <div className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900 sm:px-3.5 sm:py-2">
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{filteredBooks.length}</span>
                <span className="ml-1.5 text-zinc-500 dark:text-zinc-400">{t('library.totalBooks')}</span>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900 sm:px-3.5 sm:py-2">
                <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">24/7</span>
                <span className="ml-1.5 text-zinc-500 dark:text-zinc-400">{t('library.access')}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="mb-7 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:mb-8">
          <div className="p-3 sm:p-4">
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

        {filteredBooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-zinc-300 dark:text-zinc-600" strokeWidth={1.25} />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {searchTerm ? t('library.notFound') : t('library.noBooks')}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
              {searchTerm ? t('library.notFoundSubtitle') : t('library.emptySubtitle')}
            </p>
            {(searchTerm || showFilters) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setFilters(defaultFilters)
                }}
                className="mt-6 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                {t('library.clearSearch')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-12 sm:space-y-14">
            {largeBooks.length > 0 ? (
              <Bookshelf
                id="section-large"
                title={t('admin.filter.sizeLarge')}
                accent="amber"
                countLabel={t('library.bookSectionCount', { count: largeBooks.length })}
                shelfBadge={t('library.shelfUpper')}
              >
                <ShelfScroll>
                  {largeBooks.map((book) => (
                    <div key={book.id} className="snap-start" role="listitem">
                      <BookCard book={book} variant="large" shelfRow onSelect={onBookSelect} t={t} />
                    </div>
                  ))}
                </ShelfScroll>
              </Bookshelf>
            ) : null}

            {smallBooks.length > 0 ? (
              <Bookshelf
                id="section-small"
                title={t('admin.filter.sizeSmall')}
                accent="zinc"
                countLabel={t('library.bookSectionCount', { count: smallBooks.length })}
                shelfBadge={t('library.shelfLower')}
              >
                <ShelfScroll>
                  {smallBooks.map((book) => (
                    <div key={book.id} className="snap-start" role="listitem">
                      <BookCard book={book} variant="small" shelfRow onSelect={onBookSelect} t={t} />
                    </div>
                  ))}
                </ShelfScroll>
              </Bookshelf>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export default BookLibrary
