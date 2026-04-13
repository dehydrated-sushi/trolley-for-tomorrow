import { useState } from 'react'

export function useBudget() {
  const [budget, setBudget]   = useState('')
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  // Mock: spent this week — replace with real data from API later
  const spent = 84.60

  const validate = (val) => {
    if (!val || val === '') return 'Please enter a weekly budget'
    if (isNaN(val) || Number(val) <= 0) return 'Budget must be a positive number'
    return ''
  }

  const handleChange = (val) => {
    setBudget(val)
    setSaved(false)
    setError('')
  }

  const handleSave = () => {
    const err = validate(budget)
    if (err) { setError(err); return }
    setSaved(true)
    setError('')
    // TODO: call API to persist budget
  }

  const remaining  = budget ? Math.max(0, Number(budget) - spent).toFixed(2) : null
  const spentPct   = budget ? Math.min(100, (spent / Number(budget)) * 100) : 0
  const isOver     = budget && spent > Number(budget)

  return {
    budget,
    spent,
    remaining,
    spentPct,
    isOver,
    saved,
    error,
    handleChange,
    handleSave,
  }
}