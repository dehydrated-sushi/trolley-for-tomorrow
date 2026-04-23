/**
 * Visual treatment (colour + icon) for each recipe-level tag.
 *
 * Tag keys and their rules come from the backend (`GET /api/meals/tags` →
 * `TAG_DEFINITIONS` in `backend/modules/meal_plan/routes.py`). Labels and
 * descriptions are backend-owned; colours and icons are frontend-only.
 *
 * Keep keys in sync with the backend's `TAG_KEYS` set.
 */
export const TAG_STYLES = {
  drink:        { bg: '#e0e7ff', fg: '#6366f1', icon: 'local_bar' },            // indigo
  high_protein: { bg: '#ccfbf1', fg: '#14b8a6', icon: 'fitness_center' },       // teal
  low_carb:     { bg: '#ecfccb', fg: '#65a30d', icon: 'grass' },                // lime — veggie/plant focus, not grain
  light:        { bg: '#ecfdf5', fg: '#059669', icon: 'air' },                  // emerald
  hearty:       { bg: '#fee2e2', fg: '#b91c1c', icon: 'restaurant' },           // red
  quick:        { bg: '#dbeafe', fg: '#2563eb', icon: 'bolt' },                 // blue
  sweet:        { bg: '#fce7f3', fg: '#ec4899', icon: 'cake' },                 // pink
  simple:       { bg: '#f3f4f6', fg: '#374151', icon: 'format_list_bulleted' }, // neutral — ≤5 ingredients = short list
}

export const TAG_STYLE_FALLBACK = { bg: '#f3f4f6', fg: '#6b7280', icon: 'label' }
