import { useState, useCallback, useRef } from 'react'

export interface TextSelection {
  text: string
  startOffset: number
  endOffset: number
  boundingRect: DOMRect
  range: Range
  cfiRange?: string
}

export interface CustomContextMenu {
  x: number
  y: number
  visible: boolean
  selection: TextSelection | null
}

interface UseCustomTextSelectionProps {
  onTextSelected?: (selection: TextSelection) => void
  onContextMenu?: (selection: TextSelection) => void
}

export const useCustomTextSelection = ({
  onTextSelected,
  onContextMenu
}: UseCustomTextSelectionProps = {}) => {
  const [contextMenu, setContextMenu] = useState<CustomContextMenu>({
    x: 0,
    y: 0,
    visible: false,
    selection: null
  })

  // Callback'leri ref'lerde saklayalım
  const onTextSelectedRef = useRef(onTextSelected)
  const onContextMenuRef = useRef(onContextMenu)
  
  // Props değiştiğinde ref'leri güncelle
  onTextSelectedRef.current = onTextSelected
  onContextMenuRef.current = onContextMenu

  // Bağlam menüsünü göster
  const showContextMenu = useCallback((x: number, y: number, textSelection: TextSelection) => {
    console.log('showContextMenu called with:', { x, y, text: textSelection.text.substring(0, 50) })
    setContextMenu({
      x,
      y,
      visible: true,
      selection: textSelection
    })
    
    // Callback'leri çağır
    if (onTextSelectedRef.current) {
      onTextSelectedRef.current(textSelection)
    }
    if (onContextMenuRef.current) {
      onContextMenuRef.current(textSelection)
    }
  }, [])

  // Bağlam menüsünü gizle
  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false }))
  }, [])

  return {
    contextMenu,
    hideContextMenu,
    showContextMenu
  }
}


