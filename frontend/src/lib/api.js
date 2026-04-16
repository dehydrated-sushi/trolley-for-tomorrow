export const API_BASE =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options)

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`)
  }

  return data
}