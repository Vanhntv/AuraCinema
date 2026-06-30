import { useEffect, useMemo, useState } from 'react'
import BookingModal from '../components/BookingModal'
import MovieDetailModal from '../components/MovieDetailModal'
import { getShowtimesByDate } from '../services/showtimeService'

const fallbackPoster =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22%3E%3Crect width=%22300%22 height=%22450%22 fill=%22%23151b26%22/%3E%3Ctext x=%22150%22 y=%22225%22 fill=%22%2394a3b8%22 font-family=%22Arial%22 font-size=%2220%22 text-anchor=%22middle%22%3EAura Cinema%3C/text%3E%3C/svg%3E'

const toDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const createDays = () => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + index)
  return {
    value: toDateKey(date),
    date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    label: index === 0 ? 'Hôm nay' : date.toLocaleDateString('vi-VN', { weekday: 'short' }),
  }
})

const formatTime = (value) => new Date(value).toLocaleTimeString('vi-VN', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok',
})

const formatPrice = (value) => value == null
  ? 'Đang cập nhật'
  : `${Number(value).toLocaleString('vi-VN')}đ`

function groupShowtimes(items) {
  const movies = new Map()

  items.forEach((showtime) => {
    const movieId = String(showtime.movie_id || '')
    if (!movies.has(movieId)) {
      movies.set(movieId, {
        _id: movieId,
        title: showtime.movieTitle,
        poster: showtime.moviePoster,
        status: 'now_showing',
        showtimes: [],
      })
    }
    movies.get(movieId).showtimes.push(showtime)
  })

  return [...movies.values()]
}

function groupByLocation(showtimes) {
  return showtimes.reduce((groups, item) => {
    const key = `${item.cinemaName || 'Rạp'}|${item.roomName || 'Phòng'}`
    groups[key] = [...(groups[key] || []), item]
    return groups
  }, {})
}

function MovieSchedule() {
  const [days] = useState(createDays)
  const [selectedDate, setSelectedDate] = useState(() => createDays()[0].value)
  const [showtimes, setShowtimes] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [bookingMovie, setBookingMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getShowtimesByDate(selectedDate)
      .then((data) => {
        if (!active) return
        setShowtimes(data)
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setShowtimes([])
        setError(err.message || 'Không thể tải lịch chiếu')
      })
      .finally(() => active && setLoading(false))

    return () => { active = false }
  }, [selectedDate])

  const movies = useMemo(() => groupShowtimes(showtimes), [showtimes])

  const changeDate = (date) => {
    setLoading(true)
    setSelectedDate(date)
  }

  const openBooking = (movie) => {
    setSelectedMovie(null)
    setBookingMovie(movie)
  }

  return (
    <main className="w-full pb-24 pt-8 text-white">
      <div className="mx-auto w-[min(1760px,calc(100%_-_96px))] max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#ff6070]">Aura Cinema</p>
          <h1 className="mt-2 text-3xl font-black uppercase">Lịch chiếu phim</h1>
        </div>

        <div className="mb-10 flex items-center gap-3 overflow-x-auto border-b border-white/5 pb-5">
          {days.map((day) => (
            <button
              key={day.value}
              onClick={() => changeDate(day.value)}
              className={`flex h-[74px] min-w-[92px] flex-col items-center justify-center rounded-2xl transition-all ${
                selectedDate === day.value
                  ? 'scale-105 bg-[#ff5364] text-white shadow-lg'
                  : 'border border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-white'
              }`}
              type="button"
            >
              <span className="text-base font-black">{day.date}</span>
              <span className="mt-1 text-[10px] font-bold uppercase">{day.label}</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => <div className="h-64 animate-pulse rounded-3xl bg-white/[0.05]" key={index} />)}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-8 text-center text-red-100">{error}</div>
        )}

        {!loading && !error && movies.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center">
            <p className="text-xl font-black">Chưa có suất chiếu</p>
            <p className="mt-2 text-sm text-slate-400">Vui lòng chọn ngày khác để xem lịch phim.</p>
          </div>
        )}

        {!loading && !error && movies.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {movies.map((movie) => (
              <article className="flex gap-5 rounded-3xl border border-white/5 bg-white/[0.025] p-5 max-sm:flex-col" key={movie._id}>
                <button className="aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-2xl max-sm:w-full" type="button" onClick={() => setSelectedMovie(movie)}>
                  <img className="h-full w-full object-cover" src={movie.poster || fallbackPoster} alt={movie.title} onError={(event) => { event.currentTarget.src = fallbackPoster }} />
                </button>
                <div className="min-w-0 flex-1">
                  <button className="text-left" type="button" onClick={() => setSelectedMovie(movie)}>
                    <h2 className="line-clamp-2 text-lg font-extrabold uppercase text-slate-100 hover:text-[#ff6070]">{movie.title}</h2>
                  </button>
                  <div className="mt-4 grid gap-4">
                    {Object.entries(groupByLocation(movie.showtimes)).map(([location, slots]) => {
                      const [cinema, room] = location.split('|')
                      return (
                        <div key={location}>
                          <p className="text-xs font-bold text-slate-400">{cinema} · {room}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {slots.map((slot) => (
                              <button className="rounded-xl border border-white/10 bg-[#161b22] px-3 py-2 hover:border-[#ff6070]" key={slot.id} type="button" onClick={() => openBooking(movie)}>
                                <span className="block text-sm font-black">{formatTime(slot.start_time)}</span>
                                <span className="mt-0.5 block text-[10px] text-slate-500">{formatPrice(slot.base_price)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <MovieDetailModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} onBook={openBooking} />
      <BookingModal movie={bookingMovie} onClose={() => setBookingMovie(null)} />
    </main>
  )
}

export default MovieSchedule
