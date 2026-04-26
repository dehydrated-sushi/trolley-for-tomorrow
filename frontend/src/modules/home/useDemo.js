import { useState } from 'react'

export const INGREDIENTS = [
  { id: 'chicken', label: 'Chicken breast', dot: '#1D9E75', category: 'protein', expiring: true  },
  { id: 'rice',    label: 'Brown rice',     dot: '#EF9F27', category: 'grains'                   },
  { id: 'spinach', label: 'Spinach',        dot: '#7F77DD', category: 'veg',     expiring: true  },
  { id: 'egg',     label: 'Eggs',           dot: '#1D9E75', category: 'protein'                  },
  { id: 'avo',     label: 'Avocado',        dot: '#378ADD', category: 'fats'                     },
  { id: 'tomato',  label: 'Tomatoes',       dot: '#D85A30', category: 'veg'                      },
  { id: 'oat',     label: 'Oats',           dot: '#EF9F27', category: 'grains'                   },
  { id: 'milk',    label: 'Milk',           dot: '#378ADD', category: 'fats',    expiring: true  },
  { id: 'banana',  label: 'Banana',         dot: '#D4537E', category: 'fruit'                    },
  { id: 'pasta',   label: 'Pasta',          dot: '#EF9F27', category: 'grains'                   },
  { id: 'garlic',  label: 'Garlic',         dot: '#7F77DD', category: 'veg'                      },
  { id: 'broc',    label: 'Broccoli',       dot: '#7F77DD', category: 'veg'                      },
]

export const TAG_LABELS = {
  protein:  { label: 'Protein',      bg: 'bg-teal-100',   text: 'text-teal-800'   },
  veg:      { label: 'Vegetables',   bg: 'bg-purple-100', text: 'text-purple-800' },
  grains:   { label: 'Grains',       bg: 'bg-amber-100',  text: 'text-amber-800'  },
  fats:     { label: 'Healthy Fats', bg: 'bg-blue-100',   text: 'text-blue-800'   },
  fruit:    { label: 'Fruits',       bg: 'bg-pink-100',   text: 'text-pink-800'   },
}

const RECIPES = {
  'chicken+spinach':        { name: 'Garlic chicken & wilted spinach',   cue: 'Use soon',        tags: ['protein','veg'],            match: 92, expiring: true  },
  'chicken+rice':           { name: 'Chicken rice bowl with soy glaze',  cue: 'Good fit',        tags: ['protein','grains'],         match: 88                  },
  'chicken+rice+spinach':   { name: 'One-pan chicken fried rice',        cue: 'High ingredient use', tags: ['protein','grains','veg'],   match: 97, expiring: true  },
  'chicken+garlic+spinach': { name: 'Lemon garlic chicken with spinach', cue: 'Use soon',        tags: ['protein','veg'],            match: 94, expiring: true  },
  'egg+spinach':            { name: 'Spinach & egg scramble',            cue: 'Quick rescue meal', tags: ['protein','veg'],            match: 95, expiring: true  },
  'egg+tomato':             { name: 'Shakshuka with tomatoes',           cue: 'Good fit',        tags: ['protein','veg'],            match: 90                  },
  'egg+avo':                { name: 'Smashed avo & poached egg toast',   cue: 'Small top-up only', tags: ['fats','protein'],           match: 85                  },
  'oat+banana':             { name: 'Banana oat porridge',               cue: 'Ready to cook',   tags: ['grains','fruit'],           match: 98                  },
  'oat+milk+banana':        { name: 'Creamy overnight oats',             cue: 'Already on hand', tags: ['grains','fruit'],           match: 100, expiring: true },
  'oat+milk':               { name: 'Warm oat milk porridge',            cue: 'Use soon',        tags: ['grains'],                  match: 94, expiring: true  },
  'pasta+tomato':           { name: 'Simple tomato pasta',               cue: 'Pantry-friendly', tags: ['grains','veg'],             match: 91                  },
  'pasta+chicken+tomato':   { name: 'Chicken arrabiata pasta',           cue: 'High ingredient use', tags: ['protein','grains'],         match: 89                  },
  'pasta+garlic+tomato':    { name: 'Aglio e olio with tomato',          cue: 'Quick rescue meal', tags: ['grains','veg'],             match: 93                  },
  'broc+garlic':            { name: 'Garlic-roasted broccoli bowl',      cue: 'Veg-first option', tags: ['veg'],                     match: 88                  },
  'broc+chicken+garlic':    { name: 'Ginger chicken & broccoli stir-fry', cue: 'Use soon',       tags: ['protein','veg'],           match: 95                  },
  'avo+egg+tomato':         { name: 'Avo, egg & tomato power bowl',      cue: 'Fresh ingredients first', tags: ['fats','protein','veg'],     match: 90                  },
}

const FALLBACK = [
  { name: 'Simple veggie stir-fry', cue: 'Vegetables first', tags: ['veg','grains'],    match: 72 },
  { name: 'Quick egg fried rice',   cue: 'Use what is on hand', tags: ['protein','grains'], match: 68 },
  { name: 'Whole grain salad',      cue: 'Flexible pantry meal', tags: ['grains','veg'],     match: 65 },
]

function getCombinations(arr, k) {
  if (k === 1) return arr.map(x => [x])
  const result = []
  for (let i = 0; i <= arr.length - k; i++) {
    getCombinations(arr.slice(i + 1), k - 1).forEach(c => result.push([arr[i], ...c]))
  }
  return result
}

function findRecipes(selected) {
  const sorted = [...selected].sort()
  const found = []
  const seen = new Set()

  for (let size = sorted.length; size >= 2; size--) {
    for (const combo of getCombinations(sorted, size)) {
      const key = combo.join('+')
      if (RECIPES[key] && !seen.has(RECIPES[key].name)) {
        found.push(RECIPES[key])
        seen.add(RECIPES[key].name)
      }
    }
    if (found.length >= 3) break
  }

  if (!found.length) return FALLBACK

  return found
    .sort((a, b) => (b.expiring ? 1 : 0) - (a.expiring ? 1 : 0) || b.match - a.match)
    .slice(0, 3)
}

export function useDemo() {
  const [selected, setSelected] = useState(new Set())
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const toggleIngredient = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    // Reset results when selection changes
    setHasGenerated(false)
    setRecipes([])
  }

  const generate = () => {
    if (selected.size < 2) return
    setLoading(true)
    setTimeout(() => {
      setRecipes(findRecipes(selected))
      setLoading(false)
      setHasGenerated(true)
    }, 900)
  }

  const canGenerate = selected.size >= 2
  const selectedCount = selected.size

  return {
    selected,
    recipes,
    loading,
    hasGenerated,
    canGenerate,
    selectedCount,
    toggleIngredient,
    generate,
  }
}
