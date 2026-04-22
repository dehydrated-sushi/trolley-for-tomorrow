// Hardcoded demo sequences for the landing-page HeroDemo.
// Rotated through on every animation loop so someone watching for 20s
// sees 2-3 different examples. Add/remove entries freely — shape must stay stable.

export const DEMO_SEQUENCES = [
  {
    id: 'omelette',
    store: 'Woolworths',
    date: '21 Apr',
    receiptItems: [
      { line: 'Free Range Eggs 12pk', price: '6.50' },
      { line: 'Baby Spinach 200g',    price: '3.80' },
      { line: 'Cheddar Block 250g',   price: '5.90' },
    ],
    receiptTotal: '16.20',
    budget: { weekly: 250, spentBefore: 128.50 },
    fridgeItems: [
      { name: 'Eggs',         qty: '12',    category: 'protein' },
      { name: 'Baby Spinach', qty: '200g',  category: 'vegetables' },
      { name: 'Cheddar',      qty: '250g',  category: 'protein' },
    ],
    recipe: {
      name: 'Spinach & Cheese Omelette',
      minutes: 15,
      tags: ['quick', 'high_protein'],
      matchCount: 3,
      totalIngredients: 3,
    },
    shoppingList: {
      items: [
        { name: 'Avocado',   category: 'fats',   neededFor: 2 },
        { name: 'Sourdough', category: 'grains', neededFor: 1 },
      ],
      estimatedCost: '7.40',
      fitsBudget: true,
    },
  },
  {
    id: 'stirfry',
    store: 'Coles',
    date: '18 Apr',
    receiptItems: [
      { line: 'Chicken Thigh 500g',  price: '9.50' },
      { line: 'Jasmine Rice 1kg',    price: '4.00' },
      { line: 'Broccoli',            price: '3.20' },
    ],
    receiptTotal: '16.70',
    budget: { weekly: 250, spentBefore: 84.30 },
    fridgeItems: [
      { name: 'Chicken Thigh', qty: '500g',  category: 'protein' },
      { name: 'Jasmine Rice',  qty: '1kg',   category: 'grains' },
      { name: 'Broccoli',      qty: '1 head', category: 'vegetables' },
    ],
    recipe: {
      name: 'Chicken & Broccoli Stir-Fry',
      minutes: 25,
      tags: ['high_protein', 'hearty'],
      matchCount: 3,
      totalIngredients: 4,
    },
    shoppingList: {
      items: [
        { name: 'Soy Sauce', category: 'other',      neededFor: 2 },
        { name: 'Ginger',    category: 'vegetables', neededFor: 1 },
      ],
      estimatedCost: '5.20',
      fitsBudget: true,
    },
  },
  {
    id: 'pasta',
    store: 'Aldi',
    date: '15 Apr',
    receiptItems: [
      { line: 'Penne Pasta 500g', price: '2.50' },
      { line: 'Roma Tomatoes',    price: '4.80' },
      { line: 'Garlic Bulb',      price: '1.20' },
    ],
    receiptTotal: '8.50',
    budget: { weekly: 180, spentBefore: 162.40 },
    fridgeItems: [
      { name: 'Penne',    qty: '500g',   category: 'grains' },
      { name: 'Tomatoes', qty: '6',      category: 'vegetables' },
      { name: 'Garlic',   qty: '1 bulb', category: 'vegetables' },
    ],
    recipe: {
      name: 'Garlic Tomato Penne',
      minutes: 20,
      tags: ['simple', 'quick'],
      matchCount: 3,
      totalIngredients: 5,
    },
    shoppingList: {
      items: [
        { name: 'Parmesan',  category: 'protein', neededFor: 3 },
        { name: 'Olive Oil', category: 'fats',    neededFor: 2 },
      ],
      estimatedCost: '12.80',
      fitsBudget: true,
    },
  },
]

// Subset of tag styling — mirrors frontend/src/modules/meals/MealsPage.jsx.
// Duplicated so HeroDemo has no cross-module coupling.
export const TAG_STYLES = {
  drink:        { bg: '#e0e7ff', fg: '#6366f1', icon: 'local_bar',      label: 'Drink' },
  high_protein: { bg: '#ccfbf1', fg: '#14b8a6', icon: 'fitness_center', label: 'High protein' },
  low_carb:     { bg: '#fef3c7', fg: '#b45309', icon: 'grain',          label: 'Low carb' },
  light:        { bg: '#ecfdf5', fg: '#059669', icon: 'air',            label: 'Light' },
  hearty:       { bg: '#fee2e2', fg: '#b91c1c', icon: 'restaurant',     label: 'Hearty' },
  quick:        { bg: '#dbeafe', fg: '#2563eb', icon: 'bolt',           label: 'Quick' },
  sweet:        { bg: '#fce7f3', fg: '#ec4899', icon: 'cake',           label: 'Sweet' },
  simple:       { bg: '#f3f4f6', fg: '#374151', icon: 'looks_one',      label: 'Simple' },
}
