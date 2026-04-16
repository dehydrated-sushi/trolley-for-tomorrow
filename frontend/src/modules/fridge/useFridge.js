import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'

export const NUTRITION_CATEGORIES = {
  uncategorised: {
    label: 'Receipt Items',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    dot: 'bg-slate-500',
  },
}

export function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24))
}

export function getExpiryStatus(expiryDate) {
  const days = getDaysUntilExpiry(expiryDate)
  if (days === null) return 'none'
  if (days < 0) return 'expired'
  if (days <= 3) return 'soon'
  return 'ok'
}

export function useFridge() {
  const [ingredients, setIngredients] = useState([])
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [editingItem, setEditingItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [detailItem, setDetailItem] = useState(null)

  useEffect(() => {
    async function loadItems() {
      try {
        const data = await apiFetch('/api/fridge/items')

        const mapped = (data.items || []).map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.qty ?? 1,
          unit: 'pcs',
          category: 'uncategorised',
          expiryDate: null,
          price: item.price,
          createdAt: item.created_at,
        }))

        setIngredients(mapped)
      } catch (error) {
        console.error('Failed to load fridge items:', error.message)
        setIngredients([])
      }
    }

    loadItems()
  }, [])

  const filtered = useMemo(() => {
    return [...ingredients]
      .filter((i) => {
        if (filter === 'all') return true
        if (filter === 'expiring') return ['expired', 'soon'].includes(getExpiryStatus(i.expiryDate))
        return i.category === filter
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'category') return a.category.localeCompare(b.category)
        const da = getDaysUntilExpiry(a.expiryDate) ?? 9999
        const db = getDaysUntilExpiry(b.expiryDate) ?? 9999
        return da - db
      })
  }, [ingredients, filter, sortBy])

  const expiringCount = ingredients.filter((i) =>
    ['expired', 'soon'].includes(getExpiryStatus(i.expiryDate))
  ).length

  const addIngredient = () => {}
  const updateIngredient = () => {}
  const deleteIngredient = () => {}

  return {
    ingredients: filtered,
    allIngredients: ingredients,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    editingItem,
    setEditingItem,
    deleteTarget,
    setDeleteTarget,
    detailItem,
    setDetailItem,
    expiringCount,
    addIngredient,
    updateIngredient,
    deleteIngredient,
  }
}