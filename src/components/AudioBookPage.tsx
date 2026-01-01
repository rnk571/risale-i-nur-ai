import React from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Headphones, Sun, Moon } from 'lucide-react'
import { type Book } from '../lib/supabase'
import { AudioBookPlayer } from './AudioBookPlayer'

interface AudioBookPageProps {
  book: Book
  userId: string
  onBackToLibrary: () => void
  isDarkMode?: boolean
  toggleDarkMode?: () => void
}

export const AudioBookPage: React.FC<AudioBookPageProps> = ({
  book,
  onBackToLibrary,
  isDarkMode = false,
  toggleDarkMode
}) => {
  const { t } = useTranslation()

  const isIOSDevice =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

  const iosNavSafeAreaClass = isIOSDevice ? 'ios-nav-safe-area' : ''

  const audioUrl = (book as any).audio_file_path as string | null | undefined
  const transcriptUrl = (book as any).audio_transcript_path as string | null | undefined

  const hasAudio = !!audioUrl

  return (
    <div className={`h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-dark-950 dark:via-dark-900 dark:to-dark-800 transition-colors duration-300 flex flex-col overflow-hidden`}>
      {/* Header */}
      <div className={`bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/40 shadow-lg z-20 ${iosNavSafeAreaClass}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onBackToLibrary}
                className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/40 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Headphones className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                    {t('reader.audioBook') || 'Sesli Kitap'}
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                  {book.title}
                </h1>
                {book.author && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {book.author}
                  </p>
                )}
              </div>
            </div>
            {toggleDarkMode && (
              <button
                onClick={toggleDarkMode}
                className="p-1.5 rounded-lg bg-white dark:bg-dark-800/80 backdrop-blur-sm border border-gray-200 dark:border-dark-700/30 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center"
                title={isDarkMode ? t('app.light') : t('app.dark')}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 flex-1 flex flex-col gap-4 min-h-0">
          {!hasAudio && (
            <div className="mt-8">
              <div className="max-w-md mx-auto bg-white/90 dark:bg-dark-900/95 backdrop-blur-xl border border-red-100 dark:border-red-900/40 rounded-2xl shadow-xl p-6 text-center">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
                  {t('reader.audioTranscriptError') || 'Sesli kitap verisi bulunamadı.'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                  Bu kitap için ses dosyası veya transkript tanımlanmamış görünüyor.
                </p>
                <button
                  onClick={onBackToLibrary}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md"
                >
                  {t('app.toLibrary')}
                </button>
              </div>
            </div>
          )}

          {hasAudio && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* İsteğe bağlı açıklama alanı */}
              {book.description && (
                <div className="mb-3 hidden sm:block">
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                    {book.description}
                  </p>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <AudioBookPlayer
                  audioUrl={audioUrl!}
                  transcriptUrl={transcriptUrl}
                  bookTitle={book.title}
                  onClose={onBackToLibrary}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AudioBookPage


