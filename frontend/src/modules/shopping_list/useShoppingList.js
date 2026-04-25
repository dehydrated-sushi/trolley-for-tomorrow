import { useState } from 'react'

// Mock fridge contents — replace with real fridge context/API later
const MOCK_FRIDGE = [
  { name: 'Brown rice',  quantity: 1,   unit: 'kg'  },
  { name: 'Eggs',        quantity: 6,   unit: 'pcs' },
  { name: 'Whole milk',  quantity: 2,   unit: 'L'   },
  { name: 'Spinach',     quantity: 200, unit: 'g'   },
]

// Mock recipes with ingredients — replace with API later
export const MOCK_RECIPES = [
  {
    id: 1,
    name: 'Garlic chicken & wilted spinach',
    price: 2.40,
    ingredients: [
      { name: 'Chicken breast', quantity: 500, unit: 'g'   },
      { name: 'Spinach',        quantity: 100, unit: 'g'   },
      { name: 'Garlic',         quantity: 3,   unit: 'pcs' },
      { name: 'Olive oil',      quantity: 2,   unit: 'tbsp'},
    ],
  },
  {
    id: 2,
    name: 'Banana oat porridge',
    price: 0.60,
    ingredients: [
      { name: 'Oats',   quantity: 80,  unit: 'g'   },
      { name: 'Banana', quantity: 1,   unit: 'pcs' },
      { name: 'Whole milk', quantity: 200, unit: 'ml' },
    ],
  },
  {
    id: 3,
    name: 'Simple tomato pasta',
    price: 1.50,
    ingredients: [
      { name: 'Pasta',    quantity: 200, unit: 'g'   },
      { name: 'Tomatoes', quantity: 3,   unit: 'pcs' },
      { name: 'Garlic',   quantity: 2,   unit: 'pcs' },
      { name: 'Olive oil',quantity: 2,   unit: 'tbsp'},
    ],
  },
  {
    id: 4,
    name: 'Chicken rice bowl',
    price: 3.10,
    ingredients: [
      { name: 'Chicken breast', quantity: 400, unit: 'g'   },
      { name: 'Brown rice',     quantity: 200, unit: 'g'   },
      { name: 'Soy sauce',      quantity: 2,   unit: 'tbsp'},
      { name: 'Garlic',         quantity: 2,   unit: 'pcs' },
    ],
  },
  {
    id: 5,
    name: 'Smashed avo & egg toast',
    price: 1.80,
    ingredients: [
      { name: 'Avocado',        quantity: 1,   unit: 'pcs' },
      { name: 'Eggs',           quantity: 2,   unit: 'pcs' },
      { name: 'Wholegrain bread', quantity: 2, unit: 'pcs' },
      { name: 'Lemon',          quantity: 1,   unit: 'pcs' },
    ],
  },
]

// Check if ingredient already exists in fridge (by name, case-insensitive)
function isInFridge(name) {
  return MOCK_FRIDGE.some(f => f.name.toLowerCase() === name.toLowerCase())
}

// Merge ingredients from multiple recipes, consolidate duplicates
function buildShoppingList(selectedRecipes) {
  const map = {}
  for (const recipe of selectedRecipes) {
    for (const ing of recipe.ingredients) {
      const key = ing.name.toLowerCase()
      if (isInFridge(ing.name)) continue  // skip if already in fridge
      if (map[key]) {
        // Same unit — add quantities
        if (map[key].unit === ing.unit) {
          map[key].quantity += ing.quantity
        }
        // Different unit — keep as separate entry with suffix
        else {
          const altKey = `${key}_${ing.unit}`
          if (map[altKey]) {
            map[altKey].quantity += ing.quantity
          } else {
            map[altKey] = { ...ing, id: altKey, checked: false, fromFridge: false }
          }
        }
      } else {
        map[key] = { ...ing, id: key, checked: false, fromFridge: false }
      }
    }
  }
  return Object.values(map)
}

let manualId = 1000

export function useShoppingList() {
  const [selectedRecipeIds, setSelectedRecipeIds] = useState([])
  const [manualItems, setManualItems]             = useState([])
  const [checkedIds, setCheckedIds]               = useState(new Set())
  const [editingId, setEditingId]                 = useState(null)
  const [budget, setBudget]                       = useState(100) // AUD — replace with profile budget

  // Selected recipe objects
  const selectedRecipes = MOCK_RECIPES.filter(r => selectedRecipeIds.includes(r.id))

  // Auto-generated items from recipes
  const generatedItems = buildShoppingList(selectedRecipes)

  // All items = generated + manual
  const allItems = [...generatedItems, ...manualItems]

  // Total estimated cost
  const totalCost = selectedRecipes.reduce((sum, r) => sum + r.price, 0)
  const isOverBudget = totalCost > budget

  // Toggle recipe selection
  const toggleRecipe = (id) => {
    setSelectedRecipeIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  // Toggle item checked (purchased)
  const toggleCheck = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Add manual item
  const addManualItem = (data) => {
    setManualItems(prev => [...prev, {
      ...data,
      id: `manual_${manualId++}`,
      checked: false,
      manual: true,
    }])
  }

  // Edit item (manual only)
  const updateItem = (id, data) => {
    setManualItems(prev => prev.map(i => i.id === id ? { ...i, ...data } : i))
    setEditingId(null)
  }

  // Remove manual item
  const removeItem = (id) => {
    setManualItems(prev => prev.filter(i => i.id !== id))
    setCheckedIds(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  // Items marked as purchased
  const purchasedItems = allItems.filter(i => checkedIds.has(i.id))
  const purchasedCount = purchasedItems.length

  // Add purchased items to fridge (returns list for parent to handle)
  const confirmPurchased = () => {
    return purchasedItems
    // TODO: call fridge context / API to add purchased items
  }

  return {
    recipes: MOCK_RECIPES,
    selectedRecipeIds,
    selectedRecipes,
    allItems,
    generatedItems,
    manualItems,
    checkedIds,
    editingId,
    budget,
    totalCost,
    isOverBudget,
    purchasedCount,
    toggleRecipe,
    toggleCheck,
    addManualItem,
    updateItem,
    removeItem,
    setEditingId,
    confirmPurchased,
  }
}