const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api'

export async function getTrailersByMovie(movieId) {
  const params = new URLSearchParams({
    movie_id: movieId,
    status: 'true',
  })

  const response = await fetch(`${API_BASE_URL}/trailers?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Không thể tải trailer')
  }

  const result = await response.json()
  return result.data || []
}
