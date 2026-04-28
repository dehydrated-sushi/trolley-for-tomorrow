import { useState } from 'react'

const MOCK_SCANNED_ITEMS = [
  { id: 1, name: 'Chicken breast', quantity: 500, unit: 'g',   category: 'protein', recognised: true  },
  { id: 2, name: 'Brown rice',     quantity: 1,   unit: 'kg',  category: 'grains',  recognised: true  },
  { id: 3, name: 'Spinach',        quantity: 200, unit: 'g',   category: 'veg',     recognised: true  },
  { id: 4, name: 'Whole milk',     quantity: 2,   unit: 'L',   category: 'fats',    recognised: true  },
  { id: 5, name: 'Unknown #3417', quantity: 1,   unit: 'pcs', category: 'veg',     recognised: false },
]

export const SCAN_STATE = {
  IDLE:     'idle',
  SCANNING: 'scanning',
  SUCCESS:  'success',
  FAILED:   'failed',
  IMPORTED: 'imported',
}

export function useScanner() {
  const [scanState, setScanState]     = useState(SCAN_STATE.IDLE)
  const [items, setItems]             = useState([])
  const [checkedIds, setCheckedIds]   = useState(new Set())
  const [editingItem, setEditingItem] = useState(null)

  const startScan = () => {
    setScanState(SCAN_STATE.SCANNING)
    setTimeout(() => {
      const success = Math.random() > 0.2
      if (success) {
        const loaded = MOCK_SCANNED_ITEMS.map(i => ({ ...i }))
        setItems(loaded)
        setCheckedIds(new Set(loaded.filter(i => i.recognised).map(i => i.id)))
        setScanState(SCAN_STATE.SUCCESS)
      } else {
        setScanState(SCAN_STATE.FAILED)
      }
    }, 2000)
  }

  const forceSuccess = () => {
    const loaded = MOCK_SCANNED_ITEMS.map(i => ({ ...i }))
    setItems(loaded)
    setCheckedIds(new Set(loaded.filter(i => i.recognised).map(i => i.id)))
    setScanState(SCAN_STATE.SUCCESS)
  }

  const reset = () => {
    setScanState(SCAN_STATE.IDLE)
    setItems([])
    setCheckedIds(new Set())
    setEditingItem(null)
  }

  const toggleCheck = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const updateItem = (id, data) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i))
    setEditingItem(null)
  }

  const removeItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id))
    setCheckedIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  const confirmImport = (onImport) => {
    const toImport = items.filter(i => checkedIds.has(i.id))
    onImport?.(toImport)
    setScanState(SCAN_STATE.IMPORTED)
  }

  return {
    scanState, items, checkedIds, editingItem,
    selectedCount: checkedIds.size,
    startScan, forceSuccess, reset,
    toggleCheck, updateItem, removeItem,
    setEditingItem, confirmImport,
  }
}