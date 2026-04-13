import { getDaysUntilExpiry, getExpiryStatus } from './useFridge'

export default function ExpiryBadge({ expiryDate }) {
  const status = getExpiryStatus(expiryDate)
  const days   = getDaysUntilExpiry(expiryDate)

  if (status === 'none') {
    return (
      <span className="text-[11px] text-[#5a7a68] italic">No expiry set</span>
    )
  }

  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        Expired
      </span>
    )
  }

  if (status === 'soon') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        ⏰ {days === 0 ? 'Today' : `${days}d left`}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      {days}d left
    </span>
  )
}