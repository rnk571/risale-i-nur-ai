import React from 'react'
import { useTranslation } from 'react-i18next'
import { Highlighter, Copy, Search, Volume2, X } from 'lucide-react'

export interface ReaderContextMenuProps {
  show: boolean
  x: number
  y: number
  selectedText: string
  onHighlight: () => void
  onCopy: () => void
  onSearch: () => void
  onClose: () => void
  onSpeak?: () => void
  isTtsAvailable?: boolean
}

export const ReaderContextMenu: React.FC<ReaderContextMenuProps> = ({
  show,
  x,
  y,
  selectedText,
  onHighlight,
  onCopy,
  onSearch,
  onClose,
  onSpeak,
  isTtsAvailable,
}) => {
  const { t } = useTranslation()

  if (!show || !selectedText) return null

  const isMobile = window.innerWidth < 768
  const menuWidth = isMobile ? Math.min(280, window.innerWidth - 20) : 240
  const extra = isTtsAvailable && onSpeak ? 1 : 0
  const menuItemCount = 3 + extra
  const menuHeight = 60 + (menuItemCount * 44) + 8

  let adjustedX = x - menuWidth / 2
  let adjustedY = y

  if (adjustedX + menuWidth > window.innerWidth - 10) {
    adjustedX = window.innerWidth - menuWidth - 10
  }
  if (adjustedX < 10) {
    adjustedX = 10
  }

  if (adjustedY + menuHeight > window.innerHeight - 10) {
    adjustedY = y - menuHeight - 10
  }
  if (adjustedY < 10) {
    adjustedY = 10
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      />

      <div
        className={`
          fixed z-50 context-menu select-none
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
          border border-white/20 dark:border-gray-700/50
          rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10
          ${isMobile ? 'animate-in slide-in-from-bottom-4' : 'animate-in fade-in-0 zoom-in-95'}
          duration-200 ease-out
        `}
        style={{
          left: adjustedX,
          top: adjustedY,
          width: menuWidth,
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-purple-500/20 rounded-2xl p-[1px]">
          <div className="w-full h-full bg-white/95 dark:bg-gray-900/95 rounded-2xl" />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 z-10 p-1.5 rounded-full 
                       text-gray-400 hover:text-gray-600 dark:text-gray-500 
                       dark:hover:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/80
                       transition-colors duration-150"
          >
            <X size={14} />
          </button>
          <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
            <p className={`text-xs text-gray-500 dark:text-gray-400 truncate font-medium ${isMobile ? 'max-w-[240px]' : 'max-w-[200px]'}`}>
              "{selectedText.length > (isMobile ? 40 : 30) ? selectedText.substring(0, isMobile ? 40 : 30) + '...' : selectedText}"
            </p>
          </div>

          <div className="p-2">
            {isTtsAvailable && onSpeak && (
              <button
                onClick={(e) => { e.stopPropagation(); onSpeak() }}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onSpeak() }}
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onSpeak() }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 mb-1
                  text-sm font-medium text-gray-700 dark:text-gray-300 
                  hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400
                  rounded-xl transition-all duration-200 ease-out
                  ${isMobile ? 'active:scale-95' : ''}
                `}
              >
                <Volume2 size={18} className="flex-shrink-0" />
                <span className="flex-1 text-left">{t('reader.speak')}</span>
              </button>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onHighlight() }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onHighlight() }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onHighlight() }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 mb-1
                text-sm font-medium text-gray-700 dark:text-gray-300 
                hover:bg-yellow-50 dark:hover:bg-yellow-950/30 hover:text-yellow-600 dark:hover:text-yellow-400
                rounded-xl transition-all duration-200 ease-out
                ${isMobile ? 'active:scale-95' : ''}
              `}
            >
              <Highlighter size={18} className="flex-shrink-0" />
              <span className="flex-1 text-left">{t('reader.highlight')}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onCopy() }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onCopy() }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onCopy() }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 mb-1
                text-sm font-medium text-gray-700 dark:text-gray-300 
                hover:bg-green-50 dark:hover:bg-green-950/30 hover:text-green-600 dark:hover:text-green-400
                rounded-xl transition-all duration-200 ease-out
                ${isMobile ? 'active:scale-95' : ''}
              `}
            >
              <Copy size={18} className="flex-shrink-0" />
              <span className="flex-1 text-left">{t('reader.copy')}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onSearch() }}
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onSearch() }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); onSearch() }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5
                text-sm font-medium text-gray-700 dark:text-gray-300 
                hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:text-purple-600 dark:hover:text-purple-400
                rounded-xl transition-all duration-200 ease-out
                ${isMobile ? 'active:scale-95' : ''}
              `}
            >
              <Search size={18} className="flex-shrink-0" />
              <span className="flex-1 text-left">{t('reader.search')}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
