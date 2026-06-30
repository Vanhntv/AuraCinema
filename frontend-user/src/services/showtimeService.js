const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export async function getShowtimesByDate(date) {
  const response = await fetch(`${API_BASE_URL}/showtimes?date=${encodeURIComponent(date)}`)
  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(result.message || 'Không thể tải lịch chiếu')
  }

  return result.data || []
}
