const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export async function getMovies(params = {}) {
  const searchParams = new URLSearchParams(params)
  const queryString = searchParams.toString()
  const response = await fetch(`${API_BASE_URL}/movies${queryString ? `?${queryString}` : ''}`)

  if (!response.ok) {
    throw new Error('Không thể tải danh sách phim')
  }

  const result = await response.json()
  return result.data || []
}
