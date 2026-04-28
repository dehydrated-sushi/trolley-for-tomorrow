const STORAGE_KEY = 'cooked_meals_store'
const EVENT_NAME = 'cooked-meals-updated'

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStore(meals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meals))
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

function estimateCost(recipe) {
  const ingredientCount = recipe.total_ingredients || recipe.ingredients?.length || 4
  return Number((ingredientCount * 1.65).toFixed(2))
}

function estimateCarbon(recipe) {
  const ingredientCount = recipe.total_ingredients || recipe.ingredients?.length || 4
  const matched = recipe.match_count || 0
  return Number(((ingredientCount * 0.22) + (matched * 0.08)).toFixed(2))
}

function createCookedMeal(recipe) {
  const cookedAmount = 100
  return {
    id: `cooked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recipeId: recipe.id,
    name: recipe.name,
    tags: recipe.tags || [],
    calories: recipe.calories || null,
    minutes: recipe.minutes || null,
    servings: recipe.servings || 2,
    cookedAmount,
    consumedAmount: 0,
    wastedAmount: 0,
    leftoverAmount: cookedAmount,
    suggestedPortion: 25,
    estimatedCost: estimateCost(recipe),
    estimatedCarbon: estimateCarbon(recipe),
    createdAt: new Date().toISOString(),
    status: 'active',
  }
}

export function getCookedMeals() {
  return readStore()
}

export function summarizeCookedMeals(meals = readStore()) {
  return meals.reduce(
    (acc, meal) => {
      const cookedAmount = Number(meal.cookedAmount) || 0
      const consumedAmount = Number(meal.consumedAmount) || 0
      const wastedAmount = Number(meal.wastedAmount) || 0
      const leftoverAmount = Math.max(cookedAmount - consumedAmount - wastedAmount, 0)
      const wasteRatio = cookedAmount > 0 ? wastedAmount / cookedAmount : 0

      acc.totalMeals += 1
      acc.activeMeals += meal.status === 'finished' || leftoverAmount === 0 ? 0 : 1
      acc.eaten += consumedAmount
      acc.wasted += wastedAmount
      acc.leftovers += leftoverAmount
      acc.wasteCost += (Number(meal.estimatedCost) || 0) * wasteRatio
      acc.wasteCarbon += (Number(meal.estimatedCarbon) || 0) * wasteRatio
      return acc
    },
    {
      totalMeals: 0,
      activeMeals: 0,
      eaten: 0,
      wasted: 0,
      leftovers: 0,
      wasteCost: 0,
      wasteCarbon: 0,
    }
  )
}

export function addCookedMeal(recipe) {
  const nextMeal = createCookedMeal(recipe)
  const meals = readStore()
  meals.unshift(nextMeal)
  writeStore(meals)
  return nextMeal
}

export function logCookedMealAction(mealId, type, amount) {
  const meals = readStore()
  let appliedAmount = 0

  const nextMeals = meals.map((meal) => {
    if (meal.id !== mealId) return meal

    const remaining = Math.max(meal.cookedAmount - meal.consumedAmount - meal.wastedAmount, 0)
    appliedAmount = Math.min(Math.max(Number(amount) || 0, 0), remaining)

    const nextConsumed =
      type === 'eat' ? meal.consumedAmount + appliedAmount : meal.consumedAmount
    const nextWasted =
      type === 'waste' ? meal.wastedAmount + appliedAmount : meal.wastedAmount
    const nextLeftover = Math.max(meal.cookedAmount - nextConsumed - nextWasted, 0)

    return {
      ...meal,
      consumedAmount: nextConsumed,
      wastedAmount: nextWasted,
      leftoverAmount: nextLeftover,
      status: nextLeftover === 0 ? 'finished' : 'active',
      lastActionAt: new Date().toISOString(),
      lastActionType: type,
      lastActionAmount: appliedAmount,
    }
  })

  writeStore(nextMeals)
  return appliedAmount
}

export function clearCookedMeal(mealId) {
  writeStore(readStore().filter((meal) => meal.id !== mealId))
}

export function subscribeCookedMeals(callback) {
  const emit = () => callback(readStore())
  window.addEventListener(EVENT_NAME, emit)
  window.addEventListener('storage', emit)
  return () => {
    window.removeEventListener(EVENT_NAME, emit)
    window.removeEventListener('storage', emit)
  }
}
