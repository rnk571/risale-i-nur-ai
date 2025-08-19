import React from 'react'
import { X, Highlighter, Edit3, Trash2, MessageSquare } from 'lucide-react'
import type { Highlight } from '../lib/progressService'

interface HighlightPanelProps {
  isOpen: boolean
  onClose: () => void
  highlights: Highlight[]
  onHighlightClick: (highlight: Highlight) => void
  onEditHighlight: (highlight: Highlight) => void
  onDeleteHighlight: (highlightId: string) => void
}

const getColorClasses = (color: string) => {
  switch (color) {
    case 'yellow':
      return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-600', text: 'text-yellow-800 dark:text-yellow-300' }
    case 'blue':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-600', text: 'text-blue-800 dark:text-blue-300' }
    case 'green':
      return { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-600', text: 'text-green-800 dark:text-green-300' }
    case 'pink':
      return { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-600', text: 'text-pink-800 dark:text-pink-300' }
    case 'red':
      return { bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-600', text: 'text-red-800 dark:text-red-300' }
    case 'purple':
      return { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-600', text: 'text-purple-800 dark:text-purple-300' }
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-900/30', border: 'border-gray-300 dark:border-gray-600', text: 'text-gray-800 dark:text-gray-300' }
  }
}

export const HighlightPanel: React.FC<HighlightPanelProps> = ({
  isOpen,
  onClose,
  highlights,
  onHighlightClick,
  onEditHighlight,
  onDeleteHighlight
}) => {
  const [selectedHighlightId, setSelectedHighlightId] = React.useState<string | null>(null)
  
  // Panel açıldığında seçili highlight'ı temizle
  React.useEffect(() => {
    if (isOpen) {
      setSelectedHighlightId(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="highlight-panel bg-white/95 dark:bg-dark-900/95 backdrop-blur-xl border-b border-white/30 dark:border-dark-700/30 shadow-lg z-10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Highlighter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Vurgulamalar</h3>
            <span className="text-sm text-gray-600 dark:text-gray-400">({highlights.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-dark-700/80 transition-colors flex items-center justify-center"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {highlights.length === 0 ? (
          <div className="text-center py-8">
            <Highlighter className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Henüz vurgulama yapılmamış</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Metin seçerek vurgulama ekleyebilirsiniz
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {highlights.map((highlight) => {
              const colorClasses = getColorClasses(highlight.color)
              return (
                <div
                  key={highlight.id}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
                    selectedHighlightId === highlight.id 
                      ? 'ring-2 ring-blue-500 ring-offset-2' 
                      : ''
                  } ${colorClasses.bg} ${colorClasses.border}`}
                  onClick={() => {
                    setSelectedHighlightId(highlight.id)
                    onHighlightClick(highlight)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Selected Text */}
                      <div className="mb-2">
                        <p className={`text-sm font-medium leading-relaxed ${colorClasses.text}`}>
                          "{highlight.selected_text}"
                        </p>
                      </div>

                      {/* Note */}
                      {highlight.note && (
                        <div className="mb-2">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-3 h-3 mt-0.5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                            <p className="text-xs text-gray-700 dark:text-gray-300 italic">
                              {highlight.note}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Chapter & Date */}
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        {highlight.chapter_title && (
                          <>
                            <span className="truncate max-w-32">{highlight.chapter_title}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>
                          {new Date(highlight.created_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Color Indicator */}
                      <div className={`w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 ${colorClasses.bg}`}></div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditHighlight(highlight)
                        }}
                        className="p-1 rounded-lg bg-white/60 dark:bg-dark-800/60 border border-white/30 dark:border-dark-700/30 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/80 dark:hover:bg-dark-700/80 transition-colors flex items-center justify-center"
                        title="Düzenle"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteHighlight(highlight.id)
                        }}
                        className="p-1 rounded-lg bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors flex items-center justify-center"
                        title="Sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default HighlightPanel
