import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { apiFetch } from '../../lib/api'
import { getCategoryInfo } from '../../shared/nutrition'

const EASE = [0.22, 1, 0.36, 1]

const REASONS = ['Expired later', 'Cooked too much', 'Forgotten leftovers', 'Did not like taste', 'Storage issue']

const EMISSION_FACTORS = {
  meat: 27,
  poultry: 6.9,
  seafood: 5.1,
  dairy: 3.2,
  grains: 1.4,
  vegetables: 2.0,
  fruits: 1.1,
  beverages: 1.2,
  protein: 6.8,
  fats: 2.8,
  herbs: 0.8,
  other: 2.3,
}

const FALLBACK_ITEMS = [
  {
    id: 101,
    name: 'Chicken Breast',
    matched_name: 'chicken breast',
    qty: '500g',
    price: 8.9,
    created_at: '2026-04-24T09:00:00Z',
    category: 'protein',
  },
  {
    id: 102,
    name: 'Tomato',
    matched_name: 'tomato',
    qty: '4 unit',
    price: 3.5,
    created_at: '2026-04-25T09:00:00Z',
    category: 'vegetables',
  },
  {
    id: 103,
    name: 'Pasta',
    matched_name: 'pasta',
    qty: '500g',
    price: 2.8,
    created_at: '2026-04-23T09:00:00Z',
    category: 'grains',
  },
]

function titleise(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value) {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'N/A'
  return parsed.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function clampNumber(value, max) {
  const parsed = Number(value)
  if (Number.isNaN(parsed) || parsed < 0) return 0
  return Math.min(parsed, max)
}

function parseQuantity(rawQty) {
  const raw = String(rawQty || '1').trim()
  const match = raw.match(/([\d.]+)\s*([a-zA-Z]+)?/)
  if (!match) {
    return { amount: 1, unit: 'unit', raw }
  }

  return {
    amount: Number(match[1]) || 1,
    unit: (match[2] || 'unit').toLowerCase(),
    raw,
  }
}

function formatShelfLife(min, max, metric) {
  if (min == null && max == null) return 'N/A'
  const unit = metric || 'days'
  if (min != null && max != null && min !== max) {
    return `${min}-${max} ${unit}`
  }
  return `${max ?? min} ${unit}`
}

function toDays(min, max, metric) {
  const value = max ?? min
  if (value == null) return null

  const unit = String(metric || 'days').toLowerCase()
  const multipliers = {
    day: 1,
    days: 1,
    week: 7,
    weeks: 7,
    month: 30,
    months: 30,
    year: 365,
    years: 365,
  }

  return Math.round(value * (multipliers[unit] || 1))
}

function estimateCarbonKg(item, productType) {
  const { amount, unit } = parseQuantity(item.qty)
  const type = String(productType || item.category || 'other').toLowerCase()

  const factor =
    Object.entries(EMISSION_FACTORS).find(([key]) => type.includes(key))?.[1] ||
    EMISSION_FACTORS[item.category] ||
    EMISSION_FACTORS.other

  let quantityKg = 0.2
  if (unit === 'kg') quantityKg = amount
  else if (unit === 'g') quantityKg = amount / 1000
  else if (unit === 'l') quantityKg = amount
  else if (unit === 'ml') quantityKg = amount / 1000
  else quantityKg = Math.max(amount * 0.2, 0.2)

  return Number((factor * quantityKg).toFixed(2))
}

function deriveShelfLife(product) {
  if (!product) {
    return { label: 'N/A', days: null }
  }

  const candidates = [
    {
      min: product.refrigerate_min,
      max: product.refrigerate_max,
      metric: product.refrigerate_metric,
    },
    {
      min: product.dop_refrigerate_min,
      max: product.dop_refrigerate_max,
      metric: product.dop_refrigerate_metric,
    },
    {
      min: product.pantry_min,
      max: product.pantry_max,
      metric: product.pantry_metric,
    },
    {
      min: product.freeze_min,
      max: product.freeze_max,
      metric: product.freeze_metric,
    },
  ]

  const selected = candidates.find((entry) => entry.min != null || entry.max != null)
  if (!selected) {
    return { label: 'N/A', days: null }
  }

  return {
    label: formatShelfLife(selected.min, selected.max, selected.metric),
    days: toDays(selected.min, selected.max, selected.metric),
  }
}

function estimateExpiry(createdAt, shelfLifeDays) {
  if (!createdAt || !shelfLifeDays) return 'N/A'
  const base = new Date(createdAt)
  if (Number.isNaN(base.getTime())) return 'N/A'
  base.setDate(base.getDate() + shelfLifeDays)
  return formatDate(base.toISOString())
}

async function enrichItem(item) {
  const searchTerm = item.matched_name || item.name
  let product = null

  try {
    const search = await apiFetch(`/api/foodkeeper/products?q=${encodeURIComponent(searchTerm)}&limit=1`)
    const productId = search?.products?.[0]?.id
    if (productId) {
      const detail = await apiFetch(`/api/foodkeeper/products/${productId}`)
      product = detail?.product || null
    }
  } catch {
    product = null
  }

  const shelfLife = deriveShelfLife(product)
  const nutrition = getCategoryInfo(item.category || 'other')
  const productType =
    product?.category_name ||
    titleise(item.category || 'other')

  return {
    ...item,
    productType,
    buyDate: item.created_at,
    buyDateLabel: formatDate(item.created_at),
    shelfLifeLabel: shelfLife.label,
    estimatedExpiryLabel: estimateExpiry(item.created_at, shelfLife.days),
    nutritionLabel: nutrition.label,
    priceQtyLabel: `${item.price != null ? `$${Number(item.price).toFixed(2)}` : '$0.00'} · ${String(item.qty || '1')}`,
    carbonKg: estimateCarbonKg(item, productType),
  }
}

export default function WasteAnalyticsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dataSourceLabel, setDataSourceLabel] = useState('Waiting for fridge data')
  const [cookedAmount, setCookedAmount] = useState(100)
  const [consumedAmount, setConsumedAmount] = useState(50)
  const [leftoverAmount, setLeftoverAmount] = useState(30)
  const [wastedAmount, setWastedAmount] = useState(20)
  const [cookedDate, setCookedDate] = useState('2026-04-28')
  const [cookedTime, setCookedTime] = useState('18:30')
  const [wasteItemId, setWasteItemId] = useState('')
  const [wasteReason, setWasteReason] = useState(REASONS[0])
  const [notes, setNotes] = useState('')
  const [statusMessage, setStatusMessage] = useState('Ready to confirm')

  useEffect(() => {
    let cancelled = false

    async function loadItems() {
      setLoading(true)
      setError('')
      try {
        const data = await apiFetch('/api/fridge/items')
        const sourceItems = Array.isArray(data?.items) ? data.items.slice(0, 8) : []
        const itemsToUse = sourceItems.length > 0 ? sourceItems : FALLBACK_ITEMS
        const enriched = await Promise.all(sourceItems.map(enrichItem))

        if (!cancelled) {
          const safeItems = enriched.length > 0 ? enriched : await Promise.all(itemsToUse.map(enrichItem))
          setItems(safeItems)
          setDataSourceLabel(
            sourceItems.length > 0
              ? `Using ${sourceItems.length} real fridge items`
              : 'No live fridge items yet, showing backend-shaped demo data'
          )
          setWasteItemId(String(safeItems[0]?.id || ''))
        }
      } catch (err) {
        if (!cancelled) {
          const fallbackItems = await Promise.all(FALLBACK_ITEMS.map(enrichItem))
          setError('Live fridge data could not be loaded, so this page is using a demo dataset with the same backend attributes.')
          setItems(fallbackItems)
          setDataSourceLabel('Using backend-shaped demo data')
          setWasteItemId(String(fallbackItems[0]?.id || ''))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadItems()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedWasteItem = items.find((item) => String(item.id) === String(wasteItemId)) || null

  const totals = useMemo(() => {
    const totalAllocated = consumedAmount + leftoverAmount + wastedAmount
    const remainingToAssign = cookedAmount - totalAllocated
    const wasteRatio = cookedAmount > 0 ? wastedAmount / cookedAmount : 0
    const totalCost = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
    const totalCarbon = items.reduce((sum, item) => sum + (Number(item.carbonKg) || 0), 0)

    return {
      totalAllocated,
      remainingToAssign,
      wasteRatio,
      totalCost,
      totalCarbon,
      wastedCost: totalCost * wasteRatio,
      wastedCarbon: totalCarbon * wasteRatio,
      selectedWasteCost: (Number(selectedWasteItem?.price) || 0) * wasteRatio,
      selectedWasteCarbon: (Number(selectedWasteItem?.carbonKg) || 0) * wasteRatio,
    }
  }, [consumedAmount, leftoverAmount, wastedAmount, cookedAmount, items, selectedWasteItem])

  function updateCookedAmount(nextValue) {
    const nextCooked = Math.max(0, Number(nextValue) || 0)
    setCookedAmount(nextCooked)
    setConsumedAmount((current) => Math.min(current, nextCooked))
    setLeftoverAmount((current) => Math.min(current, nextCooked))
    setWastedAmount((current) => Math.min(current, nextCooked))
  }

  function handleConsumedChange(nextValue) {
    const max = cookedAmount - leftoverAmount - wastedAmount
    setConsumedAmount(clampNumber(nextValue, Math.max(max, 0)))
  }

  function handleLeftoverChange(nextValue) {
    const max = cookedAmount - consumedAmount - wastedAmount
    setLeftoverAmount(clampNumber(nextValue, Math.max(max, 0)))
  }

  function handleWasteChange(nextValue) {
    const max = cookedAmount - consumedAmount - leftoverAmount
    setWastedAmount(clampNumber(nextValue, Math.max(max, 0)))
  }

  function handleMarkCooked() {
    setStatusMessage('Meal marked as cooked.')
  }

  function handleSaveLeftovers() {
    setStatusMessage(`Saved ${leftoverAmount}g as leftovers.`)
  }

  function handleWasteIt() {
    if (!selectedWasteItem) {
      setStatusMessage('Choose a wasted item first.')
      return
    }
    setStatusMessage(`Logged ${wastedAmount}g of waste for ${selectedWasteItem.name}.`)
  }

  return (
    <div className="px-6 md:px-10 max-w-7xl mx-auto pb-12">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mb-6"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-white border border-emerald-100 shadow-sm p-5 md:p-6">
          <div className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-bold mb-5">
            {statusMessage}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-stretch">
            <div className="rounded-[1.6rem] min-h-[290px] bg-gradient-to-br from-emerald-100 via-white to-emerald-50 border border-emerald-100 p-6 flex flex-col justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-700/70 uppercase tracking-widest mb-3">Backend-connected attributes</p>
                <h1 className="text-4xl font-extrabold text-emerald-950 mb-3">Cooked Meal Tracking</h1>
                <p className="text-sm text-emerald-800/75 leading-relaxed">
                  This page now uses your real fridge item attributes first, then enriches them with FoodKeeper shelf-life guidance where available.
                </p>
              </div>

              <div className="space-y-2">
                <InfoPill icon="cloud_sync" label={dataSourceLabel} />
                <InfoPill icon="inventory_2" label={`${items.length} fridge items loaded`} />
                <InfoPill icon="sell" label={`Total tracked cost $${totals.totalCost.toFixed(2)}`} />
                <InfoPill icon="co2" label={`Estimated CO2e ${totals.totalCarbon.toFixed(2)} kg`} />
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Field label="Cooked date">
                  <input
                    type="date"
                    value={cookedDate}
                    onChange={(event) => setCookedDate(event.target.value)}
                    className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </Field>

                <Field label="Cooked time">
                  <input
                    type="time"
                    value={cookedTime}
                    onChange={(event) => setCookedTime(event.target.value)}
                    className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </Field>

                <Field label="Cooked amount (g)">
                  <input
                    type="number"
                    min="0"
                    value={cookedAmount}
                    onChange={(event) => updateCookedAmount(event.target.value)}
                    className="w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </Field>

                <Field label="Still unassigned">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-900 font-bold">
                    {Math.max(totals.remainingToAssign, 0)}g
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <AmountCard
                  title="Consumed"
                  value={consumedAmount}
                  onChange={handleConsumedChange}
                  max={Math.max(cookedAmount - leftoverAmount - wastedAmount, 0)}
                  tone="emerald"
                />
                <AmountCard
                  title="Saved as leftovers"
                  value={leftoverAmount}
                  onChange={handleLeftoverChange}
                  max={Math.max(cookedAmount - consumedAmount - wastedAmount, 0)}
                  tone="lime"
                />
                <AmountCard
                  title="Wasted later"
                  value={wastedAmount}
                  onChange={handleWasteChange}
                  max={Math.max(cookedAmount - consumedAmount - leftoverAmount, 0)}
                  tone="red"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.75fr] gap-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: EASE }}
          className="space-y-6"
        >
          <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-emerald-700">table_chart</span>
              <h2 className="text-2xl font-extrabold text-emerald-950">Backend Attribute View</h2>
            </div>

            {loading ? (
              <p className="text-sm text-emerald-800/70">Loading fridge items and shelf-life data…</p>
            ) : error ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {error}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-emerald-800/70">No fridge items found yet. Add or upload some food items first.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1100px]">
                  <thead>
                    <tr className="text-xs uppercase tracking-widest text-emerald-700/60 border-b border-emerald-100">
                      <th className="pb-3 pr-4">ID</th>
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Product type</th>
                      <th className="pb-3 pr-4">Buy date</th>
                      <th className="pb-3 pr-4">Shelf life</th>
                      <th className="pb-3 pr-4">Price · Qty</th>
                      <th className="pb-3 pr-4">Est. expiry</th>
                      <th className="pb-3 pr-4">Nutrition dataset</th>
                      <th className="pb-3">Carbon dioxide</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-emerald-50 last:border-b-0 align-top">
                        <td className="py-4 pr-4 text-sm font-semibold text-emerald-950">{item.id}</td>
                        <td className="py-4 pr-4">
                          <div className="text-sm font-semibold text-emerald-950">{item.name}</div>
                          {item.matched_name && (
                            <div className="text-xs text-emerald-700/60 mt-1">matched: {item.matched_name}</div>
                          )}
                        </td>
                        <td className="py-4 pr-4 text-sm text-emerald-900">{item.productType}</td>
                        <td className="py-4 pr-4 text-sm text-emerald-800/75">{item.buyDateLabel}</td>
                        <td className="py-4 pr-4 text-sm text-emerald-800/75">{item.shelfLifeLabel}</td>
                        <td className="py-4 pr-4 text-sm text-emerald-900">{item.priceQtyLabel}</td>
                        <td className="py-4 pr-4 text-sm font-semibold text-emerald-900">{item.estimatedExpiryLabel}</td>
                        <td className="py-4 pr-4">
                          <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {item.nutritionLabel}
                          </span>
                        </td>
                        <td className="py-4 text-sm font-semibold text-emerald-900">{item.carbonKg.toFixed(2)} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-emerald-700">pie_chart</span>
              <h2 className="text-2xl font-extrabold text-emerald-950">Meal Allocation Logic</h2>
            </div>

            <div className="rounded-[1.5rem] bg-emerald-50 border border-emerald-100 p-4">
              <div className="flex items-center justify-between mb-2 text-sm font-semibold text-emerald-900">
                <span>Allocation progress</span>
                <span>{totals.totalAllocated}g / {cookedAmount}g</span>
              </div>
              <div className="h-3 w-full rounded-full overflow-hidden bg-white">
                <div className="h-full flex">
                  <div className="bg-emerald-600" style={{ width: `${cookedAmount ? (consumedAmount / cookedAmount) * 100 : 0}%` }} />
                  <div className="bg-lime-400" style={{ width: `${cookedAmount ? (leftoverAmount / cookedAmount) * 100 : 0}%` }} />
                  <div className="bg-red-400" style={{ width: `${cookedAmount ? (wastedAmount / cookedAmount) * 100 : 0}%` }} />
                </div>
              </div>
              <p className="text-xs text-emerald-800/70 mt-3">
                Example logic: cook 100g, eat 50g, keep 20g, waste 30g. The waste ratio is 30%, and cost plus CO2e are estimated from that ratio.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-emerald-700">edit_note</span>
              <h2 className="text-2xl font-extrabold text-emerald-950">Cooking Notes</h2>
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              placeholder="Add anything worth remembering for next time, like storage notes, why food was wasted, or whether leftovers were finished."
              className="w-full rounded-[1.5rem] border border-emerald-100 bg-emerald-50 px-4 py-4 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14, ease: EASE }}
          className="space-y-6"
        >
          <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm p-5">
            <p className="text-sm font-bold text-emerald-700/70 uppercase tracking-widest mb-4">Confirm meal</p>
            <div className="space-y-3">
              <ActionButton label="Mark as Cooked" icon="check_circle" tone="emerald" onClick={handleMarkCooked} />
              <ActionButton label="Save Leftovers" icon="inventory_2" tone="lime" onClick={handleSaveLeftovers} />
              <ActionButton label="Waste It" icon="delete" tone="red" onClick={handleWasteIt} />
            </div>
          </div>

          <div className="bg-slate-50 rounded-[2rem] border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold text-slate-800">Waste Log Entry</p>
              <span className="material-symbols-outlined text-slate-500">expand_more</span>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-4">
              <Field label="Wasted item">
                <select
                  value={wasteItemId}
                  onChange={(event) => setWasteItemId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Reason">
                <select
                  value={wasteReason}
                  onChange={(event) => setWasteReason(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricBox label="Est. cost" value={`$${totals.selectedWasteCost.toFixed(2)}`} tone="red" />
              <MetricBox label="CO2e impact" value={`${totals.selectedWasteCarbon.toFixed(2)} kg`} tone="red" />
            </div>

            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              `buy date`, `price`, `qty`, and `category` come from your current backend data. `shelf life` and `estimated expiry` are enriched from FoodKeeper when a product match is found.
            </p>
          </div>

          <div className="bg-emerald-900 rounded-[2rem] text-white p-5 shadow-xl">
            <p className="text-sm font-bold text-emerald-300 uppercase tracking-widest mb-3">What is real right now</p>
            <ul className="space-y-3 text-sm text-emerald-50/85">
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-emerald-300">check_circle</span>
                <span>ID, name, qty, price, created date, and nutrition category are coming from your backend.</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-emerald-300">check_circle</span>
                <span>Product type, shelf life, and estimated expiry are filled when FoodKeeper finds a product match.</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-emerald-300">check_circle</span>
                <span>Carbon dioxide is currently an estimate calculated on the frontend from product type plus quantity.</span>
              </li>
            </ul>
          </div>
        </motion.aside>
      </div>
    </div>
  )
}

function InfoPill({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-sm font-semibold">
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </span>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700/60 block mb-2">{label}</span>
      {children}
    </label>
  )
}

function AmountCard({ title, value, onChange, max, tone }) {
  const toneClasses = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-950',
    lime: 'bg-lime-50 border-lime-100 text-lime-950',
    red: 'bg-red-50 border-red-100 text-red-950',
  }

  return (
    <div className={`rounded-[1.5rem] border p-4 ${toneClasses[tone]}`}>
      <p className="text-sm font-bold mb-3">{title}</p>
      <input
        type="number"
        min="0"
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white bg-white/90 px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <p className="text-xs mt-2 opacity-70">Maximum available right now: {max}g</p>
    </div>
  )
}

function ActionButton({ label, icon, tone, onClick }) {
  const tones = {
    emerald: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    lime: 'bg-lime-400 hover:bg-lime-500 text-emerald-950',
    red: 'bg-white border border-red-200 hover:bg-red-50 text-red-600',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-4 py-3 font-bold flex items-center justify-center gap-2 transition-colors ${tones[tone]}`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </button>
  )
}

function MetricBox({ label, value, tone }) {
  return (
    <div className={`rounded-xl bg-white px-4 py-4 border ${tone === 'red' ? 'border-red-100' : 'border-emerald-100'}`}>
      <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold mb-1">{label}</p>
      <p className={`text-xl font-extrabold ${tone === 'red' ? 'text-red-500' : 'text-emerald-700'}`}>{value}</p>
    </div>
  )
}
