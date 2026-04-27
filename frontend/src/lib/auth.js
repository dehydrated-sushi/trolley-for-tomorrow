export const TEST_ACCOUNT = {
  email: 'test@123.com',
  password: '123456',
  user: {
    id: '1',
    name: 'Test User',
    email: 'test@123.com',
  },
}

export function saveSession({ token, user, source = 'backend' }) {
  localStorage.setItem('isLoggedIn', 'true')
  localStorage.setItem('token', token)
  localStorage.setItem('user_profile', JSON.stringify(user))
  localStorage.setItem('auth_source', source)
}

export function getUserProfile() {
  const raw = localStorage.getItem('user_profile')
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function updateUserProfile(nextUser) {
  localStorage.setItem('user_profile', JSON.stringify(nextUser))
}

export function clearSession() {
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('token')
  localStorage.removeItem('user_profile')
  localStorage.removeItem('auth_source')
}

export function getToken() {
  return localStorage.getItem('token')
}

export function isAuthenticated() {
  return localStorage.getItem('isLoggedIn') === 'true' && !!getToken()
}

export function isTestAccount(email, password) {
  return (
    email.trim().toLowerCase() === TEST_ACCOUNT.email &&
    password === TEST_ACCOUNT.password
  )
}
