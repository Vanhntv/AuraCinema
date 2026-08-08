import { useEffect, useMemo, useState } from 'react'
import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'
import useCurrentTime from '../hooks/useCurrentTime'
import { getMovies } from '../services/movieService'
import { getShowtimes } from '../services/showtimeService'
import { getShowtimeStartDate } from '../utils/dateTime'

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

function normalizeFilterValue(value = '') {
  return normalizeText(value).trim()
}

function matchesMovieSearch(movie, searchTerm) {
  const keyword = normalizeFilterValue(searchTerm)
  if (!keyword) return true
  return normalizeText(movie?.title).includes(keyword)
}

function getMovieGenreItems(movie) {
  return [
    ...(Array.isArray(movie?.genres) ? movie.genres : []),
    ...(Array.isArray(movie?.genreIds) ? movie.genreIds : []),
    ...(movie?.genre ? [movie.genre] : []),
  ].filter(Boolean)
}

function getGenreOptionParts(item) {
  if (typeof item === 'string') {
    return {
      label: item,
      keys: [item],
    }
  }

  const label = item?.name || item?.title || item?.slug || item?._id || item?.id
  return {
    label,
    keys: [item?._id, item?.id, item?.slug, item?.name, item?.title].filter(Boolean),
  }
}

function getMovieGenreKeys(movie) {
  return new Set(
    getMovieGenreItems(movie)
      .flatMap((item) => getGenreOptionParts(item).keys)
      .map(normalizeFilterValue)
      .filter(Boolean),
  )
}

function matchesMovieGenre(movie, selectedGenre) {
  if (selectedGenre === 'all') return true
  return getMovieGenreKeys(movie).has(selectedGenre)
}

function matchesMovieStatus(movie, selectedStatus) {
  if (selectedStatus === 'all') return true
  return movie?.showtimeStatus === selectedStatus
}

function matchesMovieFilters(movie, { searchTerm, selectedGenre, selectedStatus }) {
  return (
    matchesMovieSearch(movie, searchTerm) &&
    matchesMovieGenre(movie, selectedGenre) &&
    matchesMovieStatus(movie, selectedStatus)
  )
}

function buildGenreOptions(movies) {
  const genreMap = new Map()

  movies.forEach((movie) => {
    getMovieGenreItems(movie).forEach((item) => {
      const { label, keys } = getGenreOptionParts(item)
      const value = normalizeFilterValue(keys[0] || label)

      if (value && label && !genreMap.has(value)) {
        genreMap.set(value, String(label))
      }
    })
  })

  return Array.from(genreMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'))
}

function getMovieId(movie) {
  return String(movie?._id || movie?.id || movie?.movie_id || '')
}

function getShowtimeMovieId(showtime) {
  const movie = showtime?.movie_id || showtime?.movieId
  if (movie && typeof movie === 'object') return getMovieId(movie)
  return String(movie || '')
}

function getEffectiveShowtimeStatus(showtime, currentTime) {
  const apiStatus = normalizeFilterValue(showtime?.status)
  const storedStatus = normalizeFilterValue(showtime?.stored_status)
  if (apiStatus === 'cancelled' || storedStatus === 'cancelled') return 'cancelled'

  const startDate = getShowtimeStartDate(showtime)
  if (!startDate) return apiStatus

  const endDate = new Date(
    showtime?.end_time || showtime?.endDateTime || showtime?.end_datetime,
  )
  const now = Number(currentTime)

  if (startDate.getTime() > now) return 'scheduled'
  if (!Number.isNaN(endDate.getTime()) && endDate.getTime() > now) {
    return 'now_showing'
  }

  return 'completed'
}

function classifyMoviesByShowtime(movies, showtimes, currentTime) {
  const moviesById = new Map(movies.map((movie) => [getMovieId(movie), movie]))
  const showtimeStates = new Map()

  showtimes.forEach((showtime) => {
    const movieId = getShowtimeMovieId(showtime)
    const status = getEffectiveShowtimeStatus(showtime, currentTime)

    if (!movieId || !['now_showing', 'scheduled'].includes(status)) return

    if (!showtimeStates.has(movieId)) {
      showtimeStates.set(movieId, {
        isNowShowing: false,
        isScheduled: false,
        fallbackMovie: {
          _id: movieId,
          title: showtime.movieTitle || 'Phim đang cập nhật',
          poster: showtime.moviePoster,
          duration: showtime.movieDuration,
          release_date: showtime.movieReleaseDate,
          age_limit: showtime.movieAgeLimit,
        },
      })
    }

    const state = showtimeStates.get(movieId)
    if (status === 'now_showing') state.isNowShowing = true
    if (status === 'scheduled') state.isScheduled = true
  })

  const nowShowing = []
  const comingSoon = []

  showtimeStates.forEach((state, movieId) => {
    const movie = moviesById.get(movieId) || state.fallbackMovie
    if (state.isNowShowing) {
      nowShowing.push({ ...movie, showtimeStatus: 'now_showing' })
    }
    if (state.isScheduled) {
      comingSoon.push({ ...movie, showtimeStatus: 'coming_soon' })
    }
  })

  return { nowShowing, comingSoon }
}

function MovieCard({ movie, onOpenDetail }) {
  const year = getReleaseYear(movie.release_date || movie.releaseDate)

  return (
    <article
      className="group overflow-hidden rounded-[var(--aura-radius-lg)] border border-white/10 bg-white/[0.04] transition duration-200 hover:-translate-y-0.5 hover:border-white/20"
    >
      <button type="button" className="block w-full cursor-pointer overflow-hidden bg-[var(--aura-surface)] text-left" onClick={() => onOpenDetail(movie)} aria-label={`Xem chi tiết phim ${movie.title}`}>
        <span className="block aspect-[2/3] overflow-hidden">
          <img
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            src={movie.poster || fallbackPoster}
            alt={movie.title}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.src = fallbackPoster
            }}
          />
        </span>
      </button>

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
          className="mt-5 h-11 w-full rounded-full bg-[var(--aura-coral)] font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-extrabold text-[var(--aura-coral-ink)] hover:bg-[var(--aura-coral-hover)]"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onOpenDetail(movie)
          }}
        >
          Đặt vé
        </button>
      </div>
    </article>
  )
}

function MovieGroup({ title, movies, emptyText, onOpenDetail }) {
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
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MovieSearchBox({ value, onChange, onClear }) {
  return (
    <div className="relative w-full max-w-md max-sm:max-w-none">
      <HiOutlineSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tìm kiếm phim..."
        aria-label="Tìm kiếm phim"
        className="h-12 w-full rounded-full border border-white/10 bg-white/[0.04] pl-11 pr-11 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-semibold text-white outline-none transition duration-200 placeholder:text-slate-500 hover:border-white/20 focus:border-[#ff6070]/50 focus:bg-white/[0.06]"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-slate-300 transition duration-200 hover:text-white"
          aria-label="Xóa tìm kiếm"
        >
          <HiOutlineX className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

function MovieFilterSelect({ value, onChange, options, ariaLabel }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="h-11 w-full rounded-full border border-white/10 bg-[#151b26] px-4 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-semibold text-white outline-none transition duration-200 hover:border-white/20 focus:border-[#ff6070]/50 focus:bg-[#192131] sm:max-w-xs"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled} className="bg-[#151b26] text-white">
          {option.label}
        </option>
      ))}
    </select>
  )
}

function ClearFiltersButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 rounded-full border border-[#ff6070]/25 bg-[#ff6070]/10 px-5 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-bold text-[#ffb4bb] transition duration-200 hover:border-[#ff6070]/45 hover:bg-[#ff6070]/15 hover:text-white"
    >
      Xóa bộ lọc
    </button>
  )
}

function NowShowingMovies() {
  const navigate = useNavigate()
  const currentTime = useCurrentTime()
  const [movies, setMovies] = useState([])
  const [showtimes, setShowtimes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  useEffect(() => {
    let isMounted = true

    async function loadMovies() {
      try {
        setIsLoading(true)
        const [movieData, showtimeData] = await Promise.all([
          getMovies({ limit: 1000 }),
          getShowtimes(),
        ])

        if (isMounted) {
          setMovies(movieData)
          setShowtimes(showtimeData?.data || [])
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

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedGenre('all')
    setSelectedStatus('all')
  }

  const classifiedMovies = useMemo(
    () => classifyMoviesByShowtime(movies, showtimes, currentTime),
    [currentTime, movies, showtimes],
  )
  const nowShowingMovies = classifiedMovies.nowShowing
  const comingSoonMovies = classifiedMovies.comingSoon
  const filterableMovies = useMemo(
    () => [...nowShowingMovies, ...comingSoonMovies],
    [comingSoonMovies, nowShowingMovies],
  )
  const genreOptions = useMemo(
    () => buildGenreOptions(filterableMovies),
    [filterableMovies],
  )
  const filterState = useMemo(
    () => ({ searchTerm, selectedGenre, selectedStatus }),
    [searchTerm, selectedGenre, selectedStatus],
  )
  const filteredNowShowingMovies = useMemo(
    () => nowShowingMovies.filter((movie) => matchesMovieFilters(movie, filterState)),
    [filterState, nowShowingMovies],
  )
  const filteredComingSoonMovies = useMemo(
    () => comingSoonMovies.filter((movie) => matchesMovieFilters(movie, filterState)),
    [comingSoonMovies, filterState],
  )
  const hasActiveFilters =
    Boolean(searchTerm.trim()) || selectedGenre !== 'all' || selectedStatus !== 'all'
  const hasSearchResults =
    filteredNowShowingMovies.length > 0 || filteredComingSoonMovies.length > 0
  const shouldShowNowShowing = selectedStatus !== 'coming_soon' && filteredNowShowingMovies.length > 0
  const shouldShowComingSoon = selectedStatus !== 'now_showing' && filteredComingSoonMovies.length > 0

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

      <div className="mb-8 grid gap-3">
        <MovieSearchBox
          value={searchTerm}
          onChange={setSearchTerm}
          onClear={() => setSearchTerm('')}
        />
        <div className="flex flex-wrap gap-3 max-sm:grid max-sm:grid-cols-1">
          <MovieFilterSelect
            value={selectedGenre}
            onChange={setSelectedGenre}
            ariaLabel="Lọc theo thể loại"
            options={[
              { value: 'all', label: 'Thể loại' },
              ...genreOptions,
            ]}
          />
          <MovieFilterSelect
            value={selectedStatus}
            onChange={setSelectedStatus}
            ariaLabel="Lọc theo trạng thái"
            options={[
              { value: 'all', label: 'Trạng thái' },
              { value: 'now_showing', label: `Đang chiếu (${nowShowingMovies.length})` },
              {
                value: 'coming_soon',
                label: `Sắp chiếu (${comingSoonMovies.length})`,
                disabled: comingSoonMovies.length === 0,
              },
            ]}
          />
          {hasActiveFilters ? <ClearFiltersButton onClick={clearFilters} /> : null}
        </div>
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
          {!hasSearchResults ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-slate-300">
              <p>Không tìm thấy phim phù hợp với bộ lọc hiện tại.</p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 h-11 rounded-full bg-[var(--aura-coral)] px-6 text-sm font-extrabold text-[var(--aura-coral-ink)] hover:bg-[var(--aura-coral-hover)]"
                >
                  Xem tất cả phim
                </button>
              ) : null}
            </div>
          ) : (
            <>
              {shouldShowNowShowing ? (
                <MovieGroup
                  title="Phim đang chiếu"
                  movies={hasActiveFilters ? filteredNowShowingMovies : filteredNowShowingMovies.slice(0, 4)}
                  emptyText="Chưa có phim đang chiếu."
                  onOpenDetail={(movie) => navigate(`/phim/${getMovieId(movie)}`)}
                />
              ) : null}
              {shouldShowComingSoon ? (
                <MovieGroup
                  title="Phim sắp chiếu"
                  movies={filteredComingSoonMovies}
                  emptyText="Chưa có phim sắp chiếu."
                  onOpenDetail={(movie) => navigate(`/phim/${getMovieId(movie)}`)}
                />
              ) : null}
            </>
          )}
        </>
      )}
    </section>
  )
}

export default NowShowingMovies
