import { memo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { triggerReaderHaptic } from '../../lib/readerHaptics'
import { useReaderStore } from '../../stores/useReaderStore'

export interface ReaderNavigationProps {
  /** Dikey akış (scroll) modunda false geçilir; her şey gizlenir */
  visible: boolean
  onPrev: () => void
  onNext: () => void
}

/**
 * Liquid-Glass sayfa navigasyonu.
 *
 * navMode:
 *  'always'   → butonlar her zaman görünür
 *  'on_touch' → chrome (header/footer) ile birlikte göster/gizle
 *  'hidden'   → buton yok (edge-tap hâlâ çalışır)
 *
 * Edge-tap overlay'lar: iframe içi epubjs click handler'ı çalışmadığında
 * parent-document üzerinde sol %20 / sağ %25'e dokunuş yakalayan şeffaf
 * katmanlar. pointer-events sadece bu divlerde, EPUB içeriği etkilenmez.
 */
export const ReaderNavigation = memo(function ReaderNavigation({
  visible,
  onPrev,
  onNext,
}: ReaderNavigationProps) {
  const { t } = useTranslation()
  const navChromeMode = useReaderStore((s) => s.readerNavChromeMode)
  const readerChromeVisible = useReaderStore((s) => s.readerChromeVisible)
  const edgeTapEnabled = useReaderStore((s) => s.readerEdgeTapEnabled)

  // --- Touch-start zamanlaması (tap vs swipe ayrımı) ---
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  useEffect(() => {
    if (!visible || !edgeTapEnabled) return

    const TAP_MAX_MOVE = 10 // px — bu değerden fazla hareket = swipe

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      touchStartXRef.current = t.clientX
      touchStartYRef.current = t.clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartXRef.current === null || touchStartYRef.current === null) return
      const t = e.changedTouches[0]
      const dx = Math.abs(t.clientX - touchStartXRef.current)
      const dy = Math.abs(t.clientY - touchStartYRef.current)
      if (dx > TAP_MAX_MOVE || dy > TAP_MAX_MOVE) return // swipe, yoksay

      const ratio = touchStartXRef.current / window.innerWidth
      if (ratio < 0.2) {
        void triggerReaderHaptic('light')
        onPrev()
      } else if (ratio > 0.75) {
        void triggerReaderHaptic('light')
        onNext()
      }
      touchStartXRef.current = null
      touchStartYRef.current = null
    }

    // Parent document'a (iframe dışı) edge-tap listener
    // Not: iframe içi click'ler zaten rendition.on('click') ile yakalanıyor.
    // Bu listener iframe'in üzerindeki parent-window alanını kapsar.
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [visible, edgeTapEnabled, onPrev, onNext])

  // Scroll modunda hiçbir şey gösterme
  if (!visible) return null

  const showButtons = navChromeMode !== 'hidden'

  // 'always' → her zaman görünür; 'on_touch' → chrome görünürlüğüne bağlı
  const isOpaque = navChromeMode === 'always' || readerChromeVisible

  const glassBase =
    'pointer-events-auto flex h-14 w-14 items-center justify-center rounded-2xl ' +
    'border bg-white/10 backdrop-blur-md will-change-transform ' +
    'transition-[transform,opacity,box-shadow] duration-200 ease-out ' +
    'active:scale-90 select-none'

  const glassIdle =
    'border-white/20 shadow-[0_2px_16px_rgba(0,0,0,0.06)] text-gray-700/80 ' +
    'hover:bg-white/22 hover:border-white/30 hover:shadow-[0_6px_28px_rgba(0,0,0,0.13)] hover:text-gray-900 ' +
    'dark:border-white/10 dark:text-gray-300/80 dark:hover:bg-white/14 dark:hover:text-gray-100'

  const opacityClass = isOpaque
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-3 pointer-events-none'

  const pos =
    'fixed z-[48] bottom-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]'

  return (
    <>
      {showButtons && (
        <>
          {/* Önceki Sayfa */}
          <button
            type="button"
            data-reader-fab-nav
            aria-label={t('reader.previous')}
            onClick={() => {
              void triggerReaderHaptic('light')
              onPrev()
            }}
            className={[glassBase, glassIdle, opacityClass, pos, 'left-3 sm:left-4 md:left-8'].join(' ')}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>

          {/* Sonraki Sayfa */}
          <button
            type="button"
            data-reader-fab-nav
            aria-label={t('reader.next')}
            onClick={() => {
              void triggerReaderHaptic('light')
              onNext()
            }}
            className={[glassBase, glassIdle, opacityClass, pos, 'right-3 sm:right-4 md:right-8'].join(' ')}
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2} />
          </button>
        </>
      )}
    </>
  )
})
