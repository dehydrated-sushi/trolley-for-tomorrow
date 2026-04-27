// Hardcoded demo sequences for the landing-page HeroDemo.
// Rotated through on every animation loop so someone watching for 20s
// sees 2-3 different examples. Add/remove entries freely — shape must stay stable.

export const DEMO_SEQUENCES = [
  {
    id: 'omelette',
    store: 'Woolworths',
    date: '21 Apr',
    receiptItems: [
      { line: 'Free Range Eggs 12pk' },
      { line: 'Baby Spinach 200g' },
      { line: 'Cheddar Block 250g' },
    ],
    tracking: { before: 52, after: 74 },
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
      keepsListLean: true,
    },
  },
  {
    id: 'stirfry',
    store: 'Coles',
    date: '18 Apr',
    receiptItems: [
      { line: 'Chicken Thigh 500g' },
      { line: 'Jasmine Rice 1kg' },
      { line: 'Broccoli' },
    ],
    tracking: { before: 38, after: 61 },
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
      keepsListLean: true,
    },
  },
  {
    id: 'pasta',
    store: 'Aldi',
    date: '15 Apr',
    receiptItems: [
      { line: 'Penne Pasta 500g' },
      { line: 'Roma Tomatoes' },
      { line: 'Garlic Bulb' },
    ],
    tracking: { before: 71, after: 89 },
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
      keepsListLean: true,
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
