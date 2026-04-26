import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getUserProfile, updateUserProfile } from '../../lib/auth'

const EASE = [0.22, 1, 0.36, 1]

const DEFAULT_SETTINGS = {
  householdSize: '2 people',
  lowWasteFocus: 'Use food before it expires',
  impactGoal: 'Reduce food waste each week',
  expiryReminders: true,
  useFirstMeals: true,
  shoppingGuardrails: true,
}

const SETTINGS_KEY = 'profile_settings'
const AVATAR_KEY = 'profile_avatar_data'

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY)
  if (!raw) return DEFAULT_SETTINGS

  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export default function ProfilePage() {
  const fileInputRef = useRef(null)
  const user = getUserProfile() || { name: 'Trolley Member', email: 'member@local' }

  const [name, setName] = useState(user.name || '')
  const [email] = useState(user.email || '')
  const [avatar, setAvatar] = useState(localStorage.getItem(AVATAR_KEY) || '')
  const [settings, setSettings] = useState(loadSettings)
  const [savedMessage, setSavedMessage] = useState('')
  const [editingIdentity, setEditingIdentity] = useState(false)
  const [editingPreferences, setEditingPreferences] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState(false)

  useEffect(() => {
    if (!savedMessage) return undefined
    const timer = setTimeout(() => setSavedMessage(''), 2500)
    return () => clearTimeout(timer)
  }, [savedMessage])

  function handleAvatarPick(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const imageData = typeof reader.result === 'string' ? reader.result : ''
      setAvatar(imageData)
      localStorage.setItem(AVATAR_KEY, imageData)
      window.dispatchEvent(new CustomEvent('profile-updated'))
      setSavedMessage('Profile photo updated.')
      setEditingPhoto(false)
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveAvatar() {
    setAvatar('')
    localStorage.removeItem(AVATAR_KEY)
    window.dispatchEvent(new CustomEvent('profile-updated'))
    setSavedMessage('Profile photo removed.')
    setEditingPhoto(false)
  }

  function handleSaveProfile(event) {
    event.preventDefault()

    const nextUser = {
      ...user,
      name: name.trim() || user.name || 'Trolley Member',
      email,
    }

    updateUserProfile(nextUser)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    window.dispatchEvent(new CustomEvent('profile-updated'))
    setName(nextUser.name)
    setSavedMessage('Profile saved.')
    setEditingIdentity(false)
    setEditingPreferences(false)
  }

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const impactCards = [
    {
      title: 'Low-waste focus',
      value: settings.lowWasteFocus,
      icon: 'eco',
    },
    {
      title: 'Household routine',
      value: settings.householdSize,
      icon: 'groups',
    },
    {
      title: 'Current goal',
      value: settings.impactGoal,
      icon: 'track_changes',
    },
  ]

  return (
    <div className="px-6 md:px-10 max-w-6xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="mb-8"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-emerald-900 p-8 md:p-12 text-white shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <span className="text-emerald-300 font-bold uppercase tracking-widest text-xs mb-4 block">
              Your Profile
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-5 leading-tight">
              Shape a lower-waste routine that fits your home.
            </h1>
            <p className="text-emerald-100/80 text-lg leading-relaxed">
              Keep your identity, photo, and home habits up to date so the app can support
              more responsible food choices.
            </p>
          </div>
          <div className="absolute -right-16 -top-10 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="absolute left-20 bottom-0 h-32 w-32 rounded-full bg-lime-300/15 blur-3xl" />
        </div>
      </motion.header>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: EASE }}
          onSubmit={handleSaveProfile}
          className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm p-6 md:p-8"
        >
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700/60 font-bold mb-2">
                Personal details
              </p>
              <h2 className="text-2xl font-extrabold text-emerald-950">Your low-waste identity</h2>
            </div>
            {savedMessage && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                {savedMessage}
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="h-28 w-28 rounded-[2rem] bg-emerald-100 overflow-hidden flex items-center justify-center shadow-inner">
                {avatar ? (
                  <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-5xl text-emerald-700">person</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditingPhoto((current) => !current)}
                className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 text-sm font-semibold hover:bg-emerald-100 transition-colors"
              >
                {editingPhoto ? 'Hide photo tools' : 'Edit photo'}
              </button>
              <AnimatePresence initial={false}>
                {editingPhoto && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="flex flex-wrap gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-full bg-emerald-900 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors"
                    >
                      Upload photo
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 text-sm font-semibold hover:bg-emerald-100 transition-colors"
                    >
                      Remove
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarPick}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm font-semibold text-emerald-950">Profile details</p>
                  <p className="text-sm text-emerald-800/70 mt-1">Your current identity inside the app.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingIdentity((current) => !current)}
                  className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 text-sm font-semibold hover:bg-emerald-100 transition-colors"
                >
                  {editingIdentity ? 'Hide editor' : 'Edit'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard label="Name" value={name || 'Trolley Member'} />
                <InfoCard label="Email" value={email} muted />
              </div>

              <AnimatePresence initial={false}>
                {editingIdentity && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
                  >
                    <label className="block">
                      <span className="text-sm font-semibold text-emerald-900 block mb-2">Name</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="w-full rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Your name"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-emerald-900 block mb-2">Email</span>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full rounded-2xl bg-stone-100 border border-stone-200 px-4 py-3 text-stone-500 cursor-not-allowed"
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="border-t border-emerald-100 pt-8">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700/60 font-bold mb-2">
              Home preferences
            </p>
            <h3 className="text-2xl font-extrabold text-emerald-950 mb-6">
              Make the app feel more relevant to your household
            </h3>

            <div className="flex items-center justify-between gap-4 mb-4">
              <p className="text-sm text-emerald-800/70">Your current household preferences are shown below.</p>
              <button
                type="button"
                onClick={() => setEditingPreferences((current) => !current)}
                className="px-4 py-2 rounded-full bg-emerald-50 text-emerald-800 text-sm font-semibold hover:bg-emerald-100 transition-colors"
              >
                {editingPreferences ? 'Hide editor' : 'Edit'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <InfoCard label="Household size" value={settings.householdSize} />
              <InfoCard label="Low-waste focus" value={settings.lowWasteFocus} />
            </div>
            <div className="mb-6">
              <InfoCard label="Current impact goal" value={settings.impactGoal} />
            </div>

            <div className="space-y-3 mb-8">
              <TogglePreview
                label="Expiry reminders"
                description="Show stronger nudges when ingredients should be used soon."
                checked={settings.expiryReminders}
              />
              <TogglePreview
                label="Use-first meal ideas"
                description="Prioritise recipes that help use food already at home."
                checked={settings.useFirstMeals}
              />
              <TogglePreview
                label="Shopping guardrails"
                description="Keep the shopping list focused on essentials and missing items."
                checked={settings.shoppingGuardrails}
              />
            </div>

            <AnimatePresence initial={false}>
              {editingPreferences && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22, ease: EASE }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <label className="block">
                      <span className="text-sm font-semibold text-emerald-900 block mb-2">Household size</span>
                      <select
                        value={settings.householdSize}
                        onChange={(event) => updateSetting('householdSize', event.target.value)}
                        className="w-full rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option>1 person</option>
                        <option>2 people</option>
                        <option>3-4 people</option>
                        <option>5+ people</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-emerald-900 block mb-2">Low-waste focus</span>
                      <select
                        value={settings.lowWasteFocus}
                        onChange={(event) => updateSetting('lowWasteFocus', event.target.value)}
                        className="w-full rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option>Use food before it expires</option>
                        <option>Buy only what is missing</option>
                        <option>Build healthier kitchen routines</option>
                        <option>Reduce household waste overall</option>
                      </select>
                    </label>
                  </div>

                  <label className="block mb-6">
                    <span className="text-sm font-semibold text-emerald-900 block mb-2">Current impact goal</span>
                    <select
                      value={settings.impactGoal}
                      onChange={(event) => updateSetting('impactGoal', event.target.value)}
                      className="w-full rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option>Reduce food waste each week</option>
                      <option>Cook more from what is already at home</option>
                      <option>Avoid duplicate shopping</option>
                      <option>Keep better track of expiry risk</option>
                    </select>
                  </label>

                  <div className="space-y-3 mb-8">
                    <ToggleRow
                      label="Expiry reminders"
                      description="Show stronger nudges when ingredients should be used soon."
                      checked={settings.expiryReminders}
                      onChange={(value) => updateSetting('expiryReminders', value)}
                    />
                    <ToggleRow
                      label="Use-first meal ideas"
                      description="Prioritise recipes that help use food already at home."
                      checked={settings.useFirstMeals}
                      onChange={(value) => updateSetting('useFirstMeals', value)}
                    />
                    <ToggleRow
                      label="Shopping guardrails"
                      description="Keep the shopping list focused on essentials and missing items."
                      checked={settings.shoppingGuardrails}
                      onChange={(value) => updateSetting('shoppingGuardrails', value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="px-6 py-3 rounded-full bg-emerald-900 text-white font-semibold hover:bg-emerald-800 transition-colors"
            >
              Save profile
            </button>
          </div>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14, ease: EASE }}
          className="space-y-6"
        >
          <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700/60 font-bold mb-2">
              Snapshot
            </p>
            <h3 className="text-2xl font-extrabold text-emerald-950 mb-5">What this profile is set up for</h3>
            <div className="space-y-3">
              {impactCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-4 flex items-start gap-3"
                >
                  <span className="material-symbols-outlined text-emerald-700 mt-0.5">{card.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-950">{card.title}</p>
                    <p className="text-sm text-emerald-800/75 mt-1">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-[2rem] text-white p-6 shadow-xl">
            <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300 font-bold mb-2">
              Why this matters
            </p>
            <h3 className="text-2xl font-extrabold mb-4">Small profile choices can support better everyday habits.</h3>
            <ul className="space-y-3 text-emerald-50/85">
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-emerald-300">check_circle</span>
                <span>Use your name and photo to make the experience feel like your own kitchen companion.</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-emerald-300">check_circle</span>
                <span>Choose a low-waste focus so reminders and recommendations feel more intentional.</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-emerald-300">check_circle</span>
                <span>Keep your household setup current so planning feels realistic, not generic.</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function InfoCard({ label, value, muted = false }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${muted ? 'bg-stone-50 border-stone-200' : 'bg-emerald-50 border-emerald-100'}`}>
      <p className={`text-sm font-semibold ${muted ? 'text-stone-700' : 'text-emerald-950'}`}>{label}</p>
      <p className={`text-sm mt-1 ${muted ? 'text-stone-500' : 'text-emerald-800/75'}`}>{value}</p>
    </div>
  )
}

function TogglePreview({ label, description, checked }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-emerald-950">{label}</p>
        <p className="text-sm text-emerald-800/70 mt-1">{description}</p>
      </div>
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${checked ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
        {checked ? 'On' : 'Off'}
      </span>
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-4 cursor-pointer">
      <div>
        <p className="text-sm font-semibold text-emerald-950">{label}</p>
        <p className="text-sm text-emerald-800/70 mt-1">{description}</p>
      </div>
      <span
        className={`relative mt-1 inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
          checked ? 'bg-emerald-700' : 'bg-emerald-200'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </span>
    </label>
  )
}
