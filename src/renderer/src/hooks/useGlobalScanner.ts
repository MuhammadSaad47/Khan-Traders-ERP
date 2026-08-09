import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export function useGlobalScanner() {
  const navigate = useNavigate()
  const location = useLocation()
  const buffer = useRef<string>('')
  const lastKeyTime = useRef<number>(Date.now())

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      ) {
        return
      }

      const currentTime = Date.now()
      const timeDiff = currentTime - lastKeyTime.current
      
      // Barcode scanners type very quickly (usually < 30ms between strokes).
      // If there's a long pause, reset the buffer.
      if (timeDiff > 50) {
        buffer.current = ''
      }
      
      lastKeyTime.current = currentTime

      if (e.key === 'Enter') {
        const scannedCode = buffer.current
        buffer.current = ''
        
        if (!scannedCode) return

        // Process Barcode
        if (scannedCode.startsWith('INV-')) {
          try {
            const saleId = await window.api.sales.getIdByInvoiceNo(scannedCode)
            if (saleId) {
              navigate(`/pos?editSaleId=${saleId}`)
            } else {
              console.warn('Scanned sale invoice not found:', scannedCode)
            }
          } catch (err) {
            console.error('Error resolving sale invoice:', err)
          }
        } else if (scannedCode.startsWith('PUR-')) {
          try {
            const purchaseId = await window.api.purchases.getIdByInvoiceNo(scannedCode)
            if (purchaseId) {
              navigate(`/purchases?editPurchaseId=${purchaseId}`)
            } else {
              console.warn('Scanned purchase invoice not found:', scannedCode)
            }
          } catch (err) {
            console.error('Error resolving purchase invoice:', err)
          }
        }
      } else {
        // Append character to buffer (only printable single characters)
        if (e.key.length === 1) {
          buffer.current += e.key
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [navigate, location.pathname]) // Re-bind if pathname changes so navigation works correctly
}
