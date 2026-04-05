import { Haptics, ImpactStyle } from '@capacitor/haptics'

export type ReaderHapticKind = 'light' | 'medium' | 'selection'

const styleMap: Record<ReaderHapticKind, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  selection: ImpactStyle.Light,
}

let hapticsAvailable: boolean | null = null

function checkCapacitor(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.())
}

/**
 * Capacitor native ortamında hafif titreşim; web’de sessiz no-op.
 */
export async function triggerReaderHaptic(kind: ReaderHapticKind = 'light'): Promise<void> {
  if (!checkCapacitor()) return
  if (hapticsAvailable === false) return
  try {
    await Haptics.impact({ style: styleMap[kind] })
    hapticsAvailable = true
  } catch {
    hapticsAvailable = false
  }
}
