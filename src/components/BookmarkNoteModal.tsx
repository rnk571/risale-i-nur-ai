import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, BookmarkPlus } from 'lucide-react'

interface BookmarkNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (note: string) => void
  initialNote?: string
  title?: string
}

export const BookmarkNoteModal: React.FC<BookmarkNoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialNote = '',
  title
}) => {
  const { t } = useTranslation()
  const [note, setNote] = useState(initialNote)

  const handleSave = () => {
    onSave(note.trim())
    onClose()
  }

  const handleClose = () => {
    setNote(initialNote)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl border border-gray-200 dark:border-dark-700 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center gap-3">
            <BookmarkPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title || t('reader.addBookmarkNote')}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <label htmlFor="bookmark-note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('reader.bookmarkNote')}
            </label>
            <textarea
              id="bookmark-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('reader.bookmarkNotePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-700 dark:text-white dark:placeholder-gray-400 resize-none"
              rows={4}
              autoFocus
            />
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('reader.bookmarkNoteHelp')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-dark-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!note.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('reader.saveBookmark')}
          </button>
        </div>
      </div>
    </div>
  )
}
