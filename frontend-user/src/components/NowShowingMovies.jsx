import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMovies } from '../services/movieService'
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

function MovieCard({ movie, onOpenDetail, onOpenBooking }) {
  const year = getReleaseYear(movie.release_date || movie.releaseDate)

  return (
    <article
      className="group cursor-pointer overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.035] shadow-[0_18px_45px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-[#ff6070]/40 hover:bg-white/[0.055]"
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

      <div className="p-4">
        <h3 className="line-clamp-2 min-h-12 font-[var(--display)] text-base font-black uppercase leading-6 text-white">
          {movie.title}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2 font-[var(--sans)] text-xs font-bold text-slate-300">
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
          className="mt-5 h-10 w-full rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] font-[var(--sans)] text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(255,83,100,0.24)] transition-transform active:scale-[0.98]"
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
    <div className="mt-12 first:mt-0">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h3 className="font-[var(--display)] text-2xl font-black uppercase text-white max-sm:text-xl">
          {title}
        </h3>
        <span className="rounded-full bg-white/10 px-4 py-2 font-[var(--sans)] text-xs font-bold text-slate-300">
          {movies.length} phim
        </span>
      </div>

      {movies.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center font-[var(--sans)] text-slate-300">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-5 max-2xl:grid-cols-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
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
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [bookingMovie, setBookingMovie] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadMovies() {
      try {
        setIsLoading(true)
        const data = await getMovies()

        if (isMounted) {
          setMovies(data)
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

  const nowShowingMovies = movies.filter((movie) => movie.status === 'now_showing')
  const comingSoonMovies = movies.filter((movie) => movie.status === 'coming_soon')

  return (
    <section
      className="mx-auto w-[min(1760px,calc(100%_-_96px))] py-16 max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)] max-sm:py-12"
      id="phim"
    >
      <div className="mb-8 flex items-end justify-between gap-5 max-sm:block">
        <div>
          <p className="font-[var(--sans)] text-sm font-bold uppercase tracking-[0.24em] text-[#ff6070]">
            Aura Cinema
          </p>
          <h2 className="mt-2 font-[var(--display)] text-4xl font-black uppercase text-white max-sm:text-3xl">
            Phim đang nổi bật
          </h2>
        </div>
        <Link
          className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-[var(--sans)] text-sm font-bold text-slate-200 no-underline transition-colors hover:border-[#ff6070] hover:text-white max-sm:mt-4 max-sm:inline-flex"
          to="/lich-chieu"
        >
          Xem lịch chiếu
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-5 gap-5 max-2xl:grid-cols-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="h-[420px] animate-pulse rounded-[18px] bg-white/[0.06]"
              key={index}
            ></div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 font-[var(--sans)] text-sm text-red-100">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <MovieGroup
            title="Phim đang chiếu"
            movies={nowShowingMovies}
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
