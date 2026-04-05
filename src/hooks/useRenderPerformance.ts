import { useLayoutEffect, useRef } from 'react'

const LOG_STYLE =
  'color:#22d3ee;font-weight:bold;background:#0f172a;padding:2px 6px;border-radius:4px'

/**
 * Bu bileşenin bir render döngüsünde (commit / layout aşamasına kadar) geçen süreyi ölçer.
 * Dev ortamında konsola renkli log basar.
 */
export function useRenderPerformance(componentName: string): void {
  const startRef = useRef(0)
  startRef.current = typeof performance !== 'undefined' ? performance.now() : 0

  useLayoutEffect(() => {
    if (typeof performance === 'undefined') return
    const ms = performance.now() - startRef.current
    console.log(
      `%c⚡ ${componentName}%c · ${ms.toFixed(2)} ms (commit→layout)`,
      LOG_STYLE,
      'color:#a5b4fc;font-weight:600'
    )
  })
}
