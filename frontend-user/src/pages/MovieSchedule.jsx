import { useEffect, useMemo, useState } from 'react'
import { getShowtimes } from '../api/showtimeApi'
import BookingModal from '../components/BookingModal'
import MovieDetailModal from '../components/MovieDetailModal'

const fallbackPoster =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80'

const dayFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
})

const weekdayFormatter = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'short',
})

const toDateParam = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buildDays = () => {
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() + index)

    return {
      value: toDateParam(date),
      date: dayFormatter.format(date),
      label: index === 0 ? 'Hôm nay' : weekdayFormatter.format(date),
    }
  })
}

const formatDuration = (duration) => {
  if (!duration) return 'Chưa cập nhật'
  return `${duration} phút`
}

const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') return 'Chưa cập nhật'
  return `${Number(price).toLocaleString('vi-VN')}đ`
}

const groupShowtimesByMovie = (showtimes) => {
  const movieMap = new Map()

  showtimes.forEach((showtime) => {
    const movieId = showtime.movie_id || showtime.movieTitle || 'unknown'

    if (!movieMap.has(movieId)) {
      movieMap.set(movieId, {
        id: movieId,
        _id: movieId,
        title: showtime.movieTitle || 'Phim chưa có tên',
        poster: showtime.moviePoster || fallbackPoster,
        image: showtime.moviePoster || fallbackPoster,
        banner: showtime.moviePoster || fallbackPoster,
        duration: showtime.movieDuration,
        status: showtime.movieStatus || 'now_showing',
        slots: [],
      })
    }

    movieMap.get(movieId).slots.push(showtime)
  })

  return [...movieMap.values()].map((movie) => ({
    ...movie,
    slots: movie.slots.sort((first, second) => {
      return new Date(first.start_time) - new Date(second.start_time)
    }),
  }))
}

function MovieSchedule() {
  const days = useMemo(() => buildDays(), [])
  const [selectedDate, setSelectedDate] = useState(days[0]?.value || '')
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [bookingMovie, setBookingMovie] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadShowtimes = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await getShowtimes({ date: selectedDate })
        const groupedMovies = groupShowtimesByMovie(response.data || [])

        if (isMounted) {
          setMovies(groupedMovies)
        }
      } catch (requestError) {
        if (isMounted) {
          setMovies([])
          setError(
            requestError.response?.data?.message || 'Không thể tải lịch chiếu',
          )
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadShowtimes()

    return () => {
      isMounted = false
    }
  }, [selectedDate])

  const openDetail = (movie) => {
    setSelectedMovie(movie)
  }

  const openBooking = (movie, showtime) => {
    if (!showtime) return

    setSelectedMovie(null)
    setBookingMovie({
      ...movie,
      selectedShowtime: showtime,
      bookingDate: selectedDate,
      bookingDateLabel: days.find((day) => day.value === selectedDate)?.date,
      bookingTime: showtime.startTime,
    })
  }

  const firstBigMovie = movies[0]
  const restSmallMovies = movies.slice(1)

  const renderSlotButton = (movie, slot, compact = false) => (
    <button
      className={`flex flex-col items-center justify-center bg-[#161b22] border border-white/5 hover:border-[#ff6070] ${
        compact ? 'h-[46px] w-[76px] rounded-[10px]' : 'h-[50px] w-[85px] rounded-[12px]'
      }`}
      key={slot.id}
      type="button"
      onClick={() => openBooking(movie, slot)}
    >
      <span className={`${compact ? 'text-xs' : 'text-sm'} font-black text-slate-200`}>
        {slot.startTime}
      </span>
      {slot.roomName && (
        <span className="mt-0.5 max-w-full truncate px-1 text-[10px] font-bold text-slate-500">
          {slot.roomName}
        </span>
      )}
    </button>
  )

  return (
    <>
      <div className="w-full pb-24 pt-8 font-[var(--sans)] text-white">
        <div className="mx-auto w-[min(1760px,calc(100%_-_96px))] max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ff6070]">
              AuraCinema
            </p>
            <h1 className="mt-2 font-[var(--display)] text-3xl font-black text-white">
              Lịch chiếu
            </h1>
          </div>

          <div className="mb-10 flex items-center gap-3 overflow-x-auto border-b border-white/5 pb-4">
            {days.map((day) => {
              const isTarget = selectedDate === day.value

              return (
                <button
                  className={`flex h-[70px] min-w-[85px] flex-col items-center justify-center rounded-[16px] transition-all ${
                    isTarget
                      ? 'scale-105 bg-[#ff5364] text-white shadow-lg'
                      : 'border border-white/5 bg-white/[0.02] text-slate-400 hover:text-white'
                  }`}
                  key={day.value}
                  type="button"
                  onClick={() => setSelectedDate(day.value)}
                >
                  <span className="text-base font-black">{day.date}</span>
                  <span className="text-[10px] font-bold uppercase opacity-70">
                    {day.label}
                  </span>
                </button>
              )
            })}
          </div>

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm font-bold text-slate-300">
              Đang tải lịch chiếu...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-8 text-center text-sm font-bold text-red-100">
              {error}
            </div>
          )}

          {!loading && !error && movies.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm font-bold text-slate-300">
              Chưa có suất chiếu cho ngày này.
            </div>
          )}

          {!loading && !error && movies.length > 0 && (
            <div className="flex flex-col gap-6">
              {firstBigMovie && (
                <div className="relative flex gap-6 rounded-[24px] border border-white/5 bg-white/[0.02] p-6 max-md:flex-col">
                  <button
                    className="aspect-[2/3] w-[180px] flex-shrink-0 overflow-hidden rounded-[16px] text-left max-md:w-full"
                    type="button"
                    aria-label={`Xem chi tiết phim ${firstBigMovie.title}`}
                    onClick={() => openDetail(firstBigMovie)}
                  >
                    <img
                      className="h-full w-full object-cover"
                      src={firstBigMovie.poster}
                      alt={firstBigMovie.title}
                    />
                  </button>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <button className="text-left" type="button" onClick={() => openDetail(firstBigMovie)}>
                        <h2 className="text-xl font-extrabold uppercase text-slate-100 hover:text-[#ff6070]">
                          {firstBigMovie.title}
                        </h2>
                      </button>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
                        <span>{formatDuration(firstBigMovie.duration)}</span>
                        <span>•</span>
                        <span className="font-bold text-[#ff6070]">
                          Giá từ {formatPrice(firstBigMovie.slots[0]?.base_price)}
                        </span>
                        {firstBigMovie.slots[0]?.cinemaName && (
                          <>
                            <span>•</span>
                            <span>{firstBigMovie.slots[0].cinemaName}</span>
                          </>
                        )}
                      </div>
                      <div className="mb-3 mt-5 text-xs font-bold text-slate-500">
                        2D PHỤ ĐỀ
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {firstBigMovie.slots.map((slot) => renderSlotButton(firstBigMovie, slot))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {restSmallMovies.map((movie) => (
                  <div
                    className="relative flex gap-5 rounded-[24px] border border-white/5 bg-white/[0.02] p-5 max-sm:flex-col"
                    key={movie.id}
                  >
                    <button
                      className="aspect-[2/3] w-[140px] flex-shrink-0 overflow-hidden rounded-[16px] text-left max-sm:w-full"
                      type="button"
                      aria-label={`Xem chi tiết phim ${movie.title}`}
                      onClick={() => openDetail(movie)}
                    >
                      <img className="h-full w-full object-cover" src={movie.poster} alt={movie.title} />
                    </button>
                    <div className="flex min-h-[190px] flex-1 flex-col justify-between">
                      <div>
                        <button className="text-left" type="button" onClick={() => openDetail(movie)}>
                          <h3 className="line-clamp-2 text-base font-extrabold uppercase text-slate-100 hover:text-[#ff6070]">
                            {movie.title}
                          </h3>
                        </button>
                        <div className="mt-1.5 text-[11px] text-slate-400">
                          {formatDuration(movie.duration)}
                          {movie.slots[0]?.cinemaName ? ` • ${movie.slots[0].cinemaName}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {movie.slots.slice(0, 6).map((slot) => renderSlotButton(movie, slot, true))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <MovieDetailModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onBook={(movie) => openBooking(movie, movie.slots?.[0])}
      />
      <BookingModal movie={bookingMovie} onClose={() => setBookingMovie(null)} />
    </>
  )
}

export default MovieSchedule
