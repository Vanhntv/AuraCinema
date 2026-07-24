const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export async function getHomeBannerSettings() {
  const response = await fetch(`${API_BASE_URL}/settings/home-banner`)

  if (!response.ok) {
    throw new Error('Không thể tải cấu hình banner')
  }

  const result = await response.json()
  return result.data || {}
}
