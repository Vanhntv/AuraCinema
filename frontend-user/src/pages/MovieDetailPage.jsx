import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HiOutlineCalendarDays, HiOutlineClock, HiOutlinePlay } from 'react-icons/hi2'
import { getMovieById } from '../services/movieService'
import { getShowtimesByMovie } from '../services/showtimeService'
import { getTrailersByMovie } from '../services/trailerService'
import BookingModal from '../components/BookingModal'
import {
  formatDayOfMonth,
  formatDisplayDate,
  formatMonthNumber,
  formatShowtimeTime,
  formatWeekdayShort,
  getDateKey,
} from '../utils/dateTime'

const fallbackPoster =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22%3E%3Crect width=%22300%22 height=%22450%22 fill=%22%23151b26%22/%3E%3Ctext x=%22150%22 y=%22230%22 fill=%22white%22 font-family=%22Arial%22 font-size=%2220%22 text-anchor=%22middle%22%3EAura Cinema%3C/text%3E%3C/svg%3E'

function youtubeEmbed(url) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    const id = parsed.hostname.includes('youtu.be')
      ? parsed.pathname.split('/').filter(Boolean)[0]
      : parsed.searchParams.get('v') || parsed.pathname.split('/embed/')[1]?.split('/')[0]
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : ''
  } catch {
    return ''
  }
}

export default function MovieDetailPage() {
  const { movieId } = useParams()
  const [movie, setMovie] = useState(null)
  const [showtimes, setShowtimes] = useState([])
  const [trailer, setTrailer] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [selectedShowtime, setSelectedShowtime] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      getMovieById(movieId),
      getShowtimesByMovie(movieId).catch(() => ({ data: [] })),
      getTrailersByMovie(movieId).catch(() => []),
    ])
      .then(([movieData, showtimeData, trailers]) => {
        if (!active) return
        setMovie(movieData)
        setShowtimes(showtimeData?.data || showtimeData || [])
        setTrailer(
          movieData?.trailer_url
            ? { title: `${movieData.title} - Trailer`, youtube_url: movieData.trailer_url }
            : trailers[0] || null,
        )
        setError('')
      })
      .catch((err) => active && setError(err.message || 'Không tìm thấy phim'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [movieId])

  const dates = useMemo(() => {
    const unique = new Map()
    showtimes.forEach((item) => {
      const key = getDateKey(item.start_time)
      if (key && !unique.has(key)) unique.set(key, item.start_time)
    })
    return [...unique.entries()].sort((a, b) => new Date(a[1]) - new Date(b[1]))
  }, [showtimes])

  const activeDate = selectedDate || dates[0]?.[0] || ''
  const visibleShowtimes = showtimes.filter((item) => getDateKey(item.start_time) === activeDate)
  const backdrop = movie?.banner || movie?.banners?.[0] || movie?.poster
  const embedUrl = youtubeEmbed(trailer?.youtube_url)

  if (loading) return <div className="mx-auto min-h-[65vh] w-[min(1180px,calc(100%_-_40px))] animate-pulse py-16"><div className="h-[520px] rounded-3xl bg-white/[0.05]" /></div>
  if (error || !movie) return <div className="mx-auto min-h-[60vh] w-[min(1180px,calc(100%_-_40px))] py-20 text-center"><h1 className="text-2xl font-black">Không thể tải chi tiết phim</h1><p className="mt-3 text-slate-400">{error}</p></div>

  return (
    <div className="bg-[var(--aura-midnight)]">
      <section className="relative overflow-hidden border-y border-white/5">
        <div className="absolute inset-0 scale-[1.02] bg-cover bg-center opacity-30" style={{ backgroundImage: `url("${backdrop}")` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--aura-midnight)] via-[#0a0e1a]/90 to-[#0a0e1a]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--aura-midnight)] via-transparent to-[#0a0e1a]/55" />
        <div className="relative mx-auto grid min-h-[610px] w-[min(1240px,calc(100%_-_40px))] grid-cols-[300px_minmax(0,1fr)] items-center gap-12 py-14 max-md:grid-cols-1 max-md:gap-7 max-md:py-9">
          <div className="relative max-md:mx-auto max-md:w-[230px]">
            <img className="relative aspect-[2/3] w-full rounded-[var(--aura-radius-lg)] border border-white/15 object-cover shadow-[var(--aura-shadow-elevated)]" src={movie.poster || fallbackPoster} alt={movie.title} fetchPriority="high" onError={(e) => { e.currentTarget.src = fallbackPoster }} />
          </div>
          <div className="rounded-[var(--aura-radius-lg)] border border-white/10 bg-[#0f141c]/90 p-8 shadow-[var(--aura-shadow-elevated)] max-sm:p-5">
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-white/15 bg-white/[0.07] px-4 py-1.5 text-xs font-black uppercase tracking-wider text-slate-100">{movie.format || '2D'}</span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-xs font-bold text-emerald-300">Đang chiếu</span>
              {(movie.age_limit || movie.ageLimit) && <span className="rounded-full bg-[var(--aura-coral)] px-4 py-1.5 text-xs font-black text-[var(--aura-coral-ink)]">T{movie.age_limit || movie.ageLimit}</span>}
            </div>
            <div className="flex items-stretch gap-4">
              <span className="w-1 shrink-0 rounded-full bg-[var(--aura-coral)]" aria-hidden="true" />
              <h1 className="max-w-4xl font-[Montserrat,'Be_Vietnam_Pro',sans-serif] text-[42px] font-extrabold leading-[1.22] tracking-[-.035em] text-[var(--aura-projector-white)] max-lg:text-[34px] max-sm:text-[27px] max-sm:leading-[1.3]">
                {movie.title}
              </h1>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-4 py-2"><HiOutlineClock className="text-lg text-[#ff7180]" /> {movie.duration ? `${movie.duration} phút` : 'Đang cập nhật'}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-4 py-2"><HiOutlineCalendarDays className="text-lg text-[#ff7180]" /> {formatDisplayDate(movie.release_date || movie.releaseDate)}</span>
            </div>
            <div className="mt-6 grid gap-3 border-y border-white/10 py-5 text-sm leading-6 text-slate-300">
              <p><strong className="mr-2 text-slate-100">Đạo diễn</strong>{movie.director || 'Đang cập nhật'}</p>
              {movie.actors && <p><strong className="mr-2 text-slate-100">Diễn viên</strong>{movie.actors}</p>}
              {movie.country && <p><strong className="mr-2 text-slate-100">Quốc gia</strong>{movie.country}</p>}
            </div>
            <h2 className="mt-6 text-sm font-black uppercase tracking-[.18em] text-[#ff7180]">Nội dung phim</h2>
            <p className="mt-3 max-w-4xl text-[15px] leading-7 text-slate-300">{movie.description || 'Nội dung phim đang được cập nhật.'}</p>
            {(movie.age_limit || movie.ageLimit) && <p className="mt-4 rounded-xl border border-[#ff6070]/20 bg-[#ff5364]/10 px-4 py-3 text-sm font-semibold text-[#ff9aa5]">Khuyến cáo: Phim dành cho khán giả từ đủ {movie.age_limit || movie.ageLimit} tuổi trở lên.</p>}
            {trailer?.youtube_url && <button type="button" onClick={() => setTrailerOpen(true)} className="mt-6 inline-flex h-12 items-center gap-3 rounded-full bg-[var(--aura-coral)] px-7 font-extrabold text-[var(--aura-coral-ink)] transition hover:-translate-y-0.5 hover:bg-[var(--aura-coral-hover)]"><span className="grid h-7 w-7 place-items-center rounded-full bg-black/10"><HiOutlinePlay className="text-lg" /></span> Xem trailer</button>}
          </div>
        </div>
      </section>

      <section className="mx-auto min-h-[360px] w-[min(1240px,calc(100%_-_40px))] py-14">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-[#ff6070]">Chọn suất chiếu</p>
          <h2 className="mt-2 text-3xl font-black">Lịch chiếu phim</h2>
          <p className="mt-2 text-sm text-slate-400">Chọn ngày và giờ phù hợp để tiếp tục đặt ghế.</p>
        </div>
        {dates.length ? (
          <>
            <div className="mt-7 flex gap-3 overflow-x-auto border-b border-white/10 pb-5">
              {dates.map(([key, date]) => (
                <button key={key} type="button" aria-pressed={activeDate === key} onClick={() => { setSelectedDate(key); setSelectedShowtime(null) }} className={`min-w-[104px] rounded-2xl border px-4 py-3.5 text-center transition ${activeDate === key ? 'border-[var(--aura-coral)] bg-[var(--aura-coral)] text-[var(--aura-coral-ink)]' : 'border-white/10 bg-white/[0.035] text-slate-300 hover:border-[#ff6070]/60 hover:bg-white/[0.06]'}`}>
                  <span className="block text-[11px] font-bold uppercase">{formatWeekdayShort(date)}</span>
                  <strong className="my-0.5 block text-2xl">{formatDayOfMonth(date)}</strong>
                  <span className="text-[11px]">Tháng {formatMonthNumber(date)}</span>
                </button>
              ))}
            </div>
            <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.025] p-6 max-sm:p-4">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div><h3 className="font-black text-white">Các suất chiếu</h3><p className="mt-1 text-xs text-slate-500">{visibleShowtimes.length} khung giờ khả dụng</p></div>
                <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-slate-400">2D Phụ đề</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {visibleShowtimes.map((showtime) => (
                  <button key={showtime.id || showtime._id} type="button" aria-pressed={String(selectedShowtime?.id || selectedShowtime?._id) === String(showtime.id || showtime._id)} onClick={() => setSelectedShowtime(showtime)} className={`group min-w-[145px] rounded-xl border px-6 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#ff6070] hover:bg-[#ff5364]/10 ${String(selectedShowtime?.id || selectedShowtime?._id) === String(showtime.id || showtime._id) ? 'border-[#ff6070] bg-[#ff5364]/10' : 'border-white/10 bg-[#121a25]'}`}>
                    <strong className="block text-lg text-white group-hover:text-[#ff7180]">{showtime.startTime || formatShowtimeTime(showtime.start_time)}</strong>
                    <span className="mt-0.5 block text-[11px] font-medium text-slate-500">{showtime.roomName || 'Phòng chiếu'} · Chọn ghế</span>
                  </button>
                ))}
              </div>
            </div>
            {selectedShowtime && (
              <BookingModal
                key={selectedShowtime.id || selectedShowtime._id}
                movie={movie}
                initialShowtime={selectedShowtime}
                variant="inline"
                onClose={() => setSelectedShowtime(null)}
              />
            )}
          </>
        ) : <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-slate-400">Phim chưa có lịch chiếu.</p>}
      </section>

      {trailerOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/90 p-5" role="dialog" aria-modal="true" aria-labelledby="trailer-title" onClick={() => setTrailerOpen(false)}>
          <div className="w-[min(960px,100%)] overflow-hidden rounded-[var(--aura-radius-lg)] border border-white/10 bg-black shadow-[var(--aura-shadow-floating)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4"><strong id="trailer-title">{trailer.title || 'Trailer'}</strong><button type="button" aria-label="Đóng trailer" className="h-11 w-11 rounded-full bg-white/10 text-xl" onClick={() => setTrailerOpen(false)}>×</button></div>
            <div className="aspect-video">{embedUrl ? <iframe className="h-full w-full" src={embedUrl} title={trailer.title || 'Trailer'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : <div className="grid h-full place-items-center text-slate-400">Trailer không hợp lệ</div>}</div>
          </div>
        </div>
      )}
    </div>
  )
}
