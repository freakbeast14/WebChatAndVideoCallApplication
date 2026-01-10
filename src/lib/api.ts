export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

export const fetchJson = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed')
  }
  return data
}
