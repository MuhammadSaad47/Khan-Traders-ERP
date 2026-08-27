import { useEffect } from 'react'

type ShortcutMap = {
  [key: string]: (e: KeyboardEvent) => void
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts when user is typing in an input field
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Create a string representation of the keypress for matching
      // e.g. "F2", "Ctrl+K", "Escape"
      let keyCombo = ''
      if (e.ctrlKey || e.metaKey) keyCombo += 'Ctrl+'
      if (e.shiftKey) keyCombo += 'Shift+'
      if (e.altKey) keyCombo += 'Alt+'
      
      // Capitalize first letter of standard keys, or just use the key name directly
      let keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key
      // Handle edge cases
      if (keyName === 'Escape') keyName = 'Esc'
      
      keyCombo += keyName

      // Check if exact combo exists
      if (shortcuts[keyCombo]) {
        e.preventDefault()
        shortcuts[keyCombo](e)
      } 
      // Fallback: check if just the base key exists (like 'F2') without modifiers
      else if (shortcuts[keyName]) {
        e.preventDefault()
        shortcuts[keyName](e)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
