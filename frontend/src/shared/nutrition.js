// Nutritional category config — mirrors backend modules/nutrition/classifier.py
// Source of truth is the backend (/api/ingredients/categories); this is a
// static fallback so components render instantly before the fetch resolves.

export const CATEGORY_FALLBACK = {
  protein: {
    label: 'Protein',
    colour: '#14b8a6',
    bg: '#ccfbf1',
    icon: 'egg',
    description: 'Meat, fish, eggs, dairy, legumes',
  },
  grains: {
    label: 'Grains & Carbs',
    colour: '#b45309',
    bg: '#fef3c7',
    icon: 'grain',
    description: 'Bread, rice, pasta, cereals, potatoes',
  },
  vegetables: {
    label: 'Vegetables',
    colour: '#a855f7',
    bg: '#f3e8ff',
    icon: 'eco',
    description: 'Leafy greens, roots, herbs, mushrooms',
  },
  fats: {
    label: 'Healthy Fats',
    colour: '#2563eb',
    bg: '#dbeafe',
    icon: 'opacity',
    description: 'Nuts, seeds, avocado, olive oil',
  },
  fruits: {
    label: 'Fruits',
    colour: '#ec4899',
    bg: '#fce7f3',
    icon: 'nutrition',
    description: 'Fresh and dried fruits',
  },
  beverages: {
    label: 'Beverages',
    colour: '#6366f1',
    bg: '#e0e7ff',
    icon: 'local_bar',
    description: 'Drinks — alcohol, soft drinks, tea, coffee, juice, water',
  },
  other: {
    label: 'Other',
    colour: '#6b7280',
    bg: '#f3f4f6',
    icon: 'category',
    description: 'Drinks, condiments, seasonings, unclassified',
  },
}

export function getCategoryInfo(categoryKey, legendData = null) {
  if (legendData && legendData[categoryKey]) return legendData[categoryKey]
  return CATEGORY_FALLBACK[categoryKey] || CATEGORY_FALLBACK.other
}
