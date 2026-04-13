import { useState } from 'react'

// Nutrition category → colour mapping
export const NUTRITION_CATEGORIES = {
  protein:  { label: 'Protein',      bg: 'bg-teal-100',   text: 'text-teal-800',   dot: 'bg-teal-500'   },
  grains:   { label: 'Grains',       bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500'  },
  veg:      { label: 'Vegetables',   bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  fats:     { label: 'Healthy Fats', bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
  fruit:    { label: 'Fruits',       bg: 'bg-pink-100',   text: 'text-pink-800',   dot: 'bg-pink-500'   },
}

// Mock initial data — replace with API call later
const INITIAL_INGREDIENTS = [
  { id: 1, name: 'Chicken breast', quantity: 500, unit: 'g',   category: 'protein', expiryDate: '2026-04-06' },
  { id: 2, name: 'Spinach',        quantity: 200, unit: 'g',   category: 'veg',     expiryDate: '2026-04-07' },
  { id: 3, name: 'Brown rice',     quantity: 1,   unit: 'kg',  category: 'grains',  expiryDate: null         },
  { id: 4, name: 'Avocado',        quantity: 2,   unit: 'pcs', category: 'fats',    expiryDate: '2026-04-10' },
  { id: 5, name: 'Whole milk',     quantity: 2,   unit: 'L',   category: 'fats',    expiryDate: '2026-04-05' },
  { id: 6, name: 'Banana',         quantity: 3,   unit: 'pcs', category: 'fruit',   expiryDate: '2026-04-08' },
  { id: 7, name: 'Oats',           quantity: 500, unit: 'g',   category: 'grains',  expiryDate: null         },
  { id: 8, name: 'Eggs',           quantity: 6,   unit: 'pcs', category: 'protein', expiryDate: '2026-04-15' },
]

// Calculate days until expiry
export function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24))
}

// Get expiry status
export function getExpiryStatus(expiryDate) {
  const days = getDaysUntilExpiry(expiryDate)
  if (days === null) return 'none'
  if (days < 0)  return 'expired'
  if (days <= 3) return 'soon'
  return 'ok'
}

let nextId = INITIAL_INGREDIENTS.length + 1

export function useFridge() {
  const [ingredients, setIngredients] = useState(INITIAL_INGREDIENTS)
  const [filter, setFilter]           = useState('all')   // 'all' | 'expiring' | category key
  const [sortBy, setSortBy]           = useState('expiry') // 'expiry' | 'name' | 'category'
  const [editingItem, setEditingItem] = useState(null)     // ingredient being edited
  const [deleteTarget, setDeleteTarget] = useState(null)   // ingredient pending delete confirm
  const [detailItem, setDetailItem]   = useState(null)     // ingredient shown in detail panel

  // ── CRUD ──
  const addIngredient = (data) => {
    setIngredients(prev => [...prev, { ...data, id: nextId++ }])
  }

  const updateIngredient = (id, data) => {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, ...data } : i))
  }

  const deleteIngredient = (id) => {
    setIngredients(prev => prev.filter(i => i.id !== id))
    setDeleteTarget(null)
  }

  // ── FILTER + SORT ──
  const filtered = ingredients
    .filter(i => {
      if (filter === 'all')      return true
      if (filter === 'expiring') return ['expired', 'soon'].includes(getExpiryStatus(i.expiryDate))
      return i.category === filter
    })
    .sort((a, b) => {
      if (sortBy === 'name')     return a.name.localeCompare(b.name)
      if (sortBy === 'category') return a.category.localeCompare(b.category)
      // Default: sort by expiry (expired first, then soonest, then no date)
      const da = getDaysUntilExpiry(a.expiryDate) ?? 9999
      const db = getDaysUntilExpiry(b.expiryDate) ?? 9999
      return da - db
    })

  // ── COUNTS ──
  const expiringCount = ingredients.filter(i =>
    ['expired', 'soon'].includes(getExpiryStatus(i.expiryDate))
  ).length

  return {
    ingredients: filtered,
    allIngredients: ingredients,
    filter, setFilter,
    sortBy, setSortBy,
    editingItem, setEditingItem,
    deleteTarget, setDeleteTarget,
    detailItem, setDetailItem,
    expiringCount,
    addIngredient,
    updateIngredient,
    deleteIngredient,
  }
}