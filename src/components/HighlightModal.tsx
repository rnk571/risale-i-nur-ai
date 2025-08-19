import React, { useState, useEffect } from 'react'
import { X, Palette, MessageSquare, Trash2 } from 'lucide-react'

interface HighlightModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (color: string, note: string) => void
  onDelete?: () => void
  selectedText: string
  existingColor?: string
  existingNote?: string
  isEditing?: boolean
}

const colorOptions = [
  { id: 'yellow', name: 'Sarı', bgClass: 'bg-yellow-200', borderClass: 'border-yellow-400' },
  { id: 'blue', name: 'Mavi', bgClass: 'bg-blue-200', borderClass: 'border-blue-400' },
  { id: 'green', name: 'Yeşil', bgClass: 'bg-green-200', borderClass: 'border-green-400' },
  { id: 'pink', name: 'Pembe', bgClass: 'bg-pink-200', borderClass: 'border-pink-400' },
  { id: 'red', name: 'Kırmızı', bgClass: 'bg-red-200', borderClass: 'border-red-400' },
  { id: 'purple', name: 'Mor', bgClass: 'bg-purple-200', borderClass: 'border-purple-400' }
]

export const HighlightModal: React.FC<HighlightModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  selectedText,
  existingColor = 'yellow',
  existingNote = '',
  isEditing = false
}) => {

  const [selectedColor, setSelectedColor] = useState(existingColor)
  const [note, setNote] = useState(existingNote)

  // Modal açıldığında mevcut değerleri yükle
  useEffect(() => {
    if (isOpen) {
      setSelectedColor(existingColor)
      setNote(existingNote)
    }
  }, [isOpen, existingColor, existingNote])

  const handleSave = () => {
    onSave(selectedColor, note.trim())
    onClose()
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-dark-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Vurgulamayı Düzenle' : 'Vurgulama Ekle'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selected Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Seçilen Metin
            </label>
            <div className="p-4 bg-gray-50 dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                "{selectedText}"
              </p>
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Palette className="w-4 h-4" />
              Vurgulama Rengi
            </label>
            <div className="grid grid-cols-3 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                    selectedColor === color.id
                      ? `${color.bgClass} ${color.borderClass} scale-105`
                      : `${color.bgClass} border-transparent hover:${color.borderClass} hover:scale-102`
                  }`}
                >
                  <div className="text-center">
                    <div className={`w-6 h-6 rounded-full ${color.bgClass} mx-auto mb-1 border border-gray-300 dark:border-gray-600`}></div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {color.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <MessageSquare className="w-4 h-4" />
              Not (Opsiyonel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bu vurgulamayla ilgili notunuzu yazın..."
              className="w-full p-3 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
              rows={3}
              maxLength={500}
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
              {note.length}/500
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 rounded-b-2xl">
          <div className="flex gap-2">
            {isEditing && onDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors border border-red-200 dark:border-red-800"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Sil</span>
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-lg"
            >
              {isEditing ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HighlightModal
