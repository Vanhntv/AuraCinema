const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'
async function request(path, options) {
  const response = await fetch(`${API}${path}`, options)
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'Không thể xử lý yêu cầu')
  return result.data
}
export const getMovieShowtimes = (movieId) => request(`/showtimes/movie/${movieId}`)
export const getAvailability = (showtimeId) => request(`/bookings/availability/${showtimeId}`)
export const bookTickets = (data) => request('/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
