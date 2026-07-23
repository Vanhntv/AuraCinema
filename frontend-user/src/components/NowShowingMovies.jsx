import { useEffect, useState } from 'react'
import { getMovies } from '../services/movieService'
import { getShowtimes } from '../services/showtimeService'
import BookingModal from './BookingModal'
import MovieDetailModal from './MovieDetailModal'

const fallbackPoster =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22 viewBox=%220 0 300 450%22%3E%3Crect width=%22300%22 height=%22450%22 fill=%22%23151b26%22/%3E%3Ctext x=%22150%22 y=%22225%22 fill=%22%23f8fafc%22 font-family=%22Arial%22 font-size=%2222%22 text-anchor=%22middle%22%3ENo Poster%3C/text%3E%3C/svg%3E'

function formatDuration(duration) {
  if (!duration) return 'Đang cập nhật'
  return `${duration} phút`
}

function getReleaseYear(dateValue) {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  return date.getFullYear()
}

function normalizeText(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function isComingSoonMovie(movie) {
  const status = normalizeText(movie.status || movie.movieStatus)
  const releaseDate = new Date(movie.release_date || movie.releaseDate)
  const isFutureRelease = !Number.isNaN(releaseDate.getTime()) && releaseDate > new Date()

  return (
    status === 'coming_soon' ||
    status === 'comingsoon' ||
    status === 'upcoming' ||
    status.includes('sap_chieu') ||
    status.includes('sap chieu') ||
    isFutureRelease
  )
}

function isNowShowingMovie(movie) {
  return !isComingSoonMovie(movie) && movie.status === 'now_showing'
}

function getMovieId(movie) {
  return String(movie?._id || movie?.id || movie?.movie_id || '')
}

function getScheduledMovieId(showtime) {
  return String(showtime?.movie_id || '')
}

function buildScheduledMovies(showtimes, movies) {
  const moviesById = new Map(movies.map((movie) => [getMovieId(movie), movie]))
  const scheduledMovies = new Map()

  showtimes.forEach((showtime) => {
    const movieId = getScheduledMovieId(showtime)
    if (!movieId || scheduledMovies.has(movieId)) return

    const movie = moviesById.get(movieId) || {
      _id: movieId,
      title: showtime.movieTitle,
      poster: showtime.moviePoster,
      duration: showtime.movieDuration,
      status: showtime.movieStatus,
    }

    scheduledMovies.set(movieId, movie)
  })

  return Array.from(scheduledMovies.values())
}

function MovieCard({ movie, onOpenDetail, onOpenBooking }) {
  const year = getReleaseYear(movie.release_date || movie.releaseDate)

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_18px_45px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:-translate-y-1"
      onClick={() => onOpenDetail(movie)}
    >
      <div className="aspect-[2/3] overflow-hidden bg-[#151b26]">
        <img
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          src={movie.poster || fallbackPoster}
          alt={movie.title}
          onError={(event) => {
            event.currentTarget.src = fallbackPoster
          }}
        />
      </div>

      <div className="p-5">
        <h3 className="line-clamp-2 min-h-14 font-[Montserrat,Arial,sans-serif] text-lg font-black text-white">
          {movie.title}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-xs font-bold text-slate-300">
          <span className="rounded-full bg-white/10 px-3 py-1">
            {formatDuration(movie.duration)}
          </span>
          {year && (
            <span className="rounded-full bg-white/10 px-3 py-1">{year}</span>
          )}
          {movie.age_limit || movie.ageLimit ? (
            <span className="rounded-full bg-[#ff6070]/20 px-3 py-1 text-[#ff9aa5]">
              {movie.age_limit || movie.ageLimit}+
            </span>
          ) : null}
        </div>
        <button
          className="mt-5 h-11 w-full rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(255,83,100,0.24)]"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onOpenBooking(movie)
          }}
        >
          Đặt vé
        </button>
      </div>
    </article>
  )
}

function MovieGroup({ title, movies, emptyText, onOpenDetail, onOpenBooking }) {
  return (
    <div className="mt-10 first:mt-0">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="font-[Montserrat,Arial,sans-serif] text-2xl font-black text-white max-sm:text-xl">
          {title}
        </h3>
        <span className="rounded-full bg-white/10 px-4 py-2 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-xs font-bold text-slate-300">
          {movies.length} phim
        </span>
      </div>

      {movies.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-slate-300">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {movies.map((movie) => (
            <MovieCard
              key={movie._id}
              movie={movie}
              onOpenDetail={onOpenDetail}
              onOpenBooking={onOpenBooking}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NowShowingMovies() {
  const [movies, setMovies] = useState([])
  const [scheduledShowtimes, setScheduledShowtimes] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [bookingMovie, setBookingMovie] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadMovies() {
      try {
        setIsLoading(true)
        const [movieData, showtimeData] = await Promise.all([
          getMovies({ limit: 1000 }),
          getShowtimes({ status: 'scheduled' }),
        ])

        if (isMounted) {
          setMovies(movieData)
          setScheduledShowtimes(showtimeData?.data || [])
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Không thể tải danh sách phim')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadMovies()

    return () => {
      isMounted = false
    }
  }, [])

  const openBooking = (movie) => {
    setSelectedMovie(null)
    setBookingMovie(movie)
  }

  const nowShowingMovies = movies.filter(isNowShowingMovie)
  const comingSoonMovies = [
    ...movies.filter(isComingSoonMovie),
    ...buildScheduledMovies(scheduledShowtimes, movies),
  ].filter((movie, index, list) => {
    const movieId = getMovieId(movie)
    return movieId && list.findIndex((item) => getMovieId(item) === movieId) === index
  })

  return (
    <section className="mx-auto w-[min(1280px,calc(100%_-_40px))] py-14 max-sm:w-[calc(100%_-_28px)] max-sm:py-10">
      <div className="mb-8 flex items-end justify-between gap-5 max-sm:block">
        <div>
          <p className="font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-bold uppercase tracking-[0.24em] text-[#ff6070]">
            Aura Cinema
          </p>
          <h2 className="mt-2 font-[Montserrat,Arial,sans-serif] text-3xl font-black text-white max-sm:text-2xl">
            Phim
          </h2>
        </div>
        <a
          className="font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-bold text-slate-300 no-underline transition-colors hover:text-[#ff6070] max-sm:mt-4 max-sm:inline-block"
          href="/lich-chieu"
        >
          Xem tất cả
        </a>
      </div>

      {isLoading && (
        <div className="grid grid-cols-4 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="h-[430px] animate-pulse rounded-2xl bg-white/[0.06]"
              key={index}
            ></div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm text-red-100">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <MovieGroup
            title="Phim đang chiếu"
            movies={nowShowingMovies.slice(0, 4)}
            emptyText="Chưa có phim đang chiếu."
            onOpenDetail={setSelectedMovie}
            onOpenBooking={openBooking}
          />
          <MovieGroup
            title="Phim sắp chiếu"
            movies={comingSoonMovies}
            emptyText="Chưa có phim sắp chiếu."
            onOpenDetail={setSelectedMovie}
            onOpenBooking={openBooking}
          />
        </>
      )}

      <MovieDetailModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onBook={openBooking}
      />
      <BookingModal movie={bookingMovie} onClose={() => setBookingMovie(null)} />
    </section>
  )
}

export default NowShowingMovies
