export default function BudgetInput({ value, error, saved, onChange, onSave }) {
    return (
      <div>
        <label className="block text-xs font-medium text-[#2d4a38] mb-2">
          Weekly food budget
        </label>
  
        {/* Input row */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center flex-1 border rounded-xl overflow-hidden transition-colors
            ${error
              ? 'border-red-400 bg-red-50'
              : 'border-[#cce4d6] bg-white focus-within:border-[#5cad76]'
            }`}
          >
            <span className="px-4 py-3 text-sm font-medium text-[#5a7a68] border-r border-[#cce4d6] bg-[#f4fbf6]">
              AUD $
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="e.g. 120"
              className="flex-1 px-4 py-3 text-sm text-[#0c1f14] outline-none bg-transparent"
            />
            <span className="px-4 py-3 text-xs text-[#5a7a68]">/ week</span>
          </div>
  
          <button
            onClick={onSave}
            className="px-5 py-3 rounded-xl bg-[#1e3d2a] text-white text-sm font-medium hover:bg-[#2d5a3d] transition-colors flex-shrink-0"
          >
            Save
          </button>
        </div>
  
        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 mt-1.5">{error}</p>
        )}
  
        {/* No budget warning */}
        {!value && !error && (
          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-base flex-shrink-0">⚠️</span>
            <p className="text-xs text-amber-700 leading-relaxed">
              No budget set — meal and shopping recommendations may exceed what you can afford.
            </p>
          </div>
        )}
  
        {/* Success */}
        {saved && (
          <p className="text-xs text-[#5cad76] font-medium mt-1.5 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
            </svg>
            Budget saved successfully
          </p>
        )}
  
        <p className="text-xs text-[#5a7a68] font-light mt-2">
          Positive numbers only. Used to filter recipe and shopping recommendations.
        </p>
      </div>
    )
  }