import React from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal, RotateCcw, X } from 'lucide-react'

export interface FilterState {
  status: 'all' | 'active' | 'inactive'
  language: 'all' | 'tr' | 'en'
  format: 'all' | 'epub' | 'pdf'
  accessType: 'all' | 'public' | 'private'
  bookSize: 'all' | 'small' | 'large'
  sortBy: 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc' | 'author_asc' | 'author_desc'
}

export const defaultFilters: FilterState = {
  status: 'all',
  language: 'all',
  format: 'all',
  accessType: 'all',
  bookSize: 'all',
  sortBy: 'created_desc'
}

interface BookFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  showFilters: boolean
  onToggleFilters: () => void
  totalCount: number
  filteredCount: number
  showStatusFilter?: boolean
  className?: string
}

export const BookFilters: React.FC<BookFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  showFilters,
  onToggleFilters,
  totalCount,
  filteredCount,
  showStatusFilter = false,
  className = ''
}) => {
  const { t } = useTranslation()

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const resetFilters = () => {
    onFiltersChange(defaultFilters)
    onSearchChange('')
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('library.filterTitle')}
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({filteredCount} / {totalCount} {t('library.totalBooks').toLowerCase()})
            </span>
          </div>

          {/* Arama ve Filtre - Desktop'ta yan yana */}
          <div className="flex flex-col sm:flex-row gap-3 lg:items-center">
            {/* Arama Barı */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={t('library.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full sm:w-80 pl-10 pr-10 py-3 bg-white/60 dark:bg-dark-700/60 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 shadow-lg hover:shadow-xl focus:shadow-xl"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title={t('admin.clearSearch')}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtre Toggle */}
            <button
              onClick={onToggleFilters}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 whitespace-nowrap ${showFilters
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'bg-white/60 dark:bg-dark-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-600/60'
                } border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">{t('admin.filters')}</span>
            </button>
          </div>
        </div>

        {/* Filtreler */}
        {showFilters && (
          <div className="bg-white/60 dark:bg-dark-700/60 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 rounded-xl p-4 shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Durum Filtresi - Sadece admin panelinde göster */}
              {showStatusFilter && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('admin.filter.status')}
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">{t('admin.filter.statusAll')}</option>
                    <option value="active">{t('admin.filter.statusActive')}</option>
                    <option value="inactive">{t('admin.filter.statusInactive')}</option>
                  </select>
                </div>
              )}

              {/* Format Filtresi */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.filter.format')}
                </label>
                <select
                  value={filters.format}
                  onChange={(e) => handleFilterChange('format', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">{t('admin.filter.formatAll')}</option>
                  <option value="epub">EPUB</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              {/* Dil Filtresi */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.filter.language')}
                </label>
                <select
                  value={filters.language}
                  onChange={(e) => handleFilterChange('language', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">{t('admin.filter.langAll')}</option>
                  <option value="tr">{t('admin.filter.langTr')}</option>
                  <option value="en">{t('admin.filter.langEn')}</option>
                </select>
              </div>

              {/* Erişim Türü */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.filter.access')}
                </label>
                <select
                  value={filters.accessType}
                  onChange={(e) => handleFilterChange('accessType', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">{t('admin.filter.langAll')}</option>
                  <option value="public">{t('admin.filter.accessPublic')}</option>
                  <option value="private">{t('admin.filter.accessPrivate')}</option>
                </select>
              </div>

              {/* Kitap Boyutu */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.filter.bookSize')}
                </label>
                <select
                  value={filters.bookSize}
                  onChange={(e) => handleFilterChange('bookSize', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">{t('admin.filter.sizeAll')}</option>
                  <option value="small">{t('admin.filter.sizeSmall')}</option>
                  <option value="large">{t('admin.filter.sizeLarge')}</option>
                </select>
              </div>

              {/* Sıralama */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.filter.sort')}
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                >
                  <option value="created_desc">{t('admin.filter.sortNewest')}</option>
                  <option value="created_asc">{t('admin.filter.sortOldest')}</option>
                  <option value="title_asc">{t('admin.filter.sortTitleAsc')}</option>
                  <option value="title_desc">{t('admin.filter.sortTitleDesc')}</option>
                  <option value="author_asc">{t('admin.filter.sortAuthorAsc')}</option>
                  <option value="author_desc">{t('admin.filter.sortAuthorDesc')}</option>
                </select>
              </div>
            </div>

            {/* Filtreleri Temizle */}
            <div className="flex justify-end mt-4 pt-3 border-t border-gray-200 dark:border-dark-600">
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                {t('admin.filter.reset')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookFilters
