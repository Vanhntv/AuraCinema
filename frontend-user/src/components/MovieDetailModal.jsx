import { useEffect, useMemo, useState } from 'react'
import { getTrailersByMovie } from '../services/trailerService'

const fallbackBackdrop =
  'linear-gradient(135deg, rgba(255,96,112,0.22), rgba(30,41,59,0.9))'

function formatDate(dateValue) {
  if (!dateValue) return 'Đang cập nhật'
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return 'Đang cập nhật'
  return date.toLocaleDateString('vi-VN')
}

function getStatusLabel(status) {
  const labels = {
    now_showing: 'Đang chiếu',
    coming_soon: 'Sắp chiếu',
    ended: 'Đã kết thúc',
  }

  return labels[status] || 'Đang cập nhật'
}

function getYoutubeEmbedUrl(url) {
  if (!url) return ''

  try {
    const parsed = new URL(url)

    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : ''
    }

    if (parsed.pathname.includes('/embed/')) {
      const id = parsed.pathname.split('/embed/')[1]?.split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : ''
    }

    if (parsed.pathname.includes('/shorts/')) {
      const id = parsed.pathname.split('/shorts/')[1]?.split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : ''
    }

    const id = parsed.searchParams.get('v')
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : ''
  } catch {
    return ''
  }
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="font-[var(--sans)] text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-[var(--sans)] text-sm font-semibold text-slate-100">
        {value || 'Đang cập nhật'}
      </p>
    </div>
  )
}

function TrailerModal({ trailer, onClose }) {
  const embedUrl = useMemo(
    () => getYoutubeEmbedUrl(trailer?.youtube_url),
    [trailer?.youtube_url],
  )

  if (!trailer) return null

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/80 px-5 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer ${trailer.title}`}
    >
      <div
        className="relative w-[min(920px,100%)] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1018] shadow-[0_30px_90px_rgba(0,0,0,0.65)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <h3 className="font-[var(--display)] text-lg font-black text-white">
            {trailer.title || 'Trailer'}
          </h3>
          <button
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 font-[var(--sans)] text-xl font-black text-white transition-colors hover:bg-[#ff6070]"
            type="button"
            aria-label="Đóng trailer"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="aspect-video bg-black">
          {embedUrl ? (
            <iframe
              className="h-full w-full"
              src={embedUrl}
              title={trailer.title || 'Trailer'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="grid h-full place-items-center px-6 text-center font-[var(--sans)] text-sm text-slate-300">
              Trailer không hợp lệ
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MovieTrailerButton({ movie }) {
  const [trailer, setTrailer] = useState(() =>
    movie?.trailer_url
      ? {
          title: `${movie.title} - Trailer`,
          youtube_url: movie.trailer_url,
        }
      : null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadTrailer() {
      if (movie?.trailer_url) {
        setTrailer({
          title: `${movie.title} - Trailer`,
          youtube_url: movie.trailer_url,
        })
        setError('')
        return
      }

      const movieId = movie?._id
      if (!movieId) return

      try {
        setIsLoading(true)
        const trailers = await getTrailersByMovie(movieId)

        if (isMounted) {
          setTrailer(trailers[0] || null)
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setTrailer(null)
          setError(err.message || 'Không thể tải trailer')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTrailer()

    return () => {
      isMounted = false
    }
  }, [movie])

  return (
    <div className="mt-7">
      <h3 className="font-[var(--display)] text-lg font-black text-white">
        Trailer
      </h3>

      <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-5">
        {isLoading && (
          <p className="font-[var(--sans)] text-sm text-slate-400">
            Đang tải trailer...
          </p>
        )}

        {!isLoading && error && (
          <p className="font-[var(--sans)] text-sm text-red-100">
            {error}
          </p>
        )}

        {!isLoading && !error && !trailer?.youtube_url && (
          <p className="font-[var(--sans)] text-sm text-slate-400">
            Phim này chưa có trailer.
          </p>
        )}

        {!isLoading && !error && trailer?.youtube_url && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-[var(--sans)] text-sm font-semibold text-slate-200">
                {trailer.title}
              </p>
              <p className="mt-1 break-all font-[var(--sans)] text-xs text-slate-500">
                {trailer.youtube_url}
              </p>
            </div>
            <button
              className="inline-flex rounded-full bg-white/10 px-5 py-3 font-[var(--sans)] text-sm font-extrabold text-white transition-colors hover:bg-[#ff6070]"
              type="button"
              onClick={() => setIsPlayerOpen(true)}
            >
              Xem trailer
            </button>
          </div>
        )}
      </div>

      <TrailerModal
        trailer={isPlayerOpen ? trailer : null}
        onClose={() => setIsPlayerOpen(false)}
      />
    </div>
  )
}

function MovieDetailModal({ movie, onClose, onBook }) {
  if (!movie) return null

  const releaseDate = movie.release_date || movie.releaseDate
  const ageLimit = movie.age_limit || movie.ageLimit

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-5 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết phim ${movie.title}`}
    >
      <div
        className="relative max-h-[90vh] w-[min(980px,100%)] overflow-y-auto rounded-3xl border border-white/10 bg-[#101722] shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/45 font-[var(--sans)] text-xl font-black text-white transition-colors hover:bg-[#ff6070]"
          type="button"
          aria-label="Đóng chi tiết phim"
          onClick={onClose}
        >
          ×
        </button>

        <div
          className="min-h-48 bg-cover bg-center"
          style={{
            backgroundImage: movie.banner
              ? `linear-gradient(180deg,rgba(16,23,34,0.2),#101722),url(${movie.banner})`
              : fallbackBackdrop,
          }}
        ></div>

        <div className="grid gap-8 p-7 md:grid-cols-[260px_minmax(0,1fr)] md:p-8">
          <div className="-mt-28 md:-mt-36">
            <div className="aspect-[2/3] overflow-hidden rounded-2xl bg-[#151b26] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
              {movie.poster && (
                <img
                  className="h-full w-full object-cover"
                  src={movie.poster}
                  alt={movie.title}
                />
              )}
            </div>
          </div>

          <div>
            <span className="inline-flex rounded-full bg-[#ff6070]/20 px-4 py-2 font-[var(--sans)] text-xs font-black uppercase tracking-[0.14em] text-[#ff9aa5]">
              {getStatusLabel(movie.status)}
            </span>
            <h2 className="mt-4 font-[var(--display)] text-3xl font-black leading-tight text-white max-sm:text-2xl">
              {movie.title}
            </h2>

            <p className="mt-4 font-[var(--sans)] text-sm leading-7 text-slate-300">
              {movie.description || 'Phim chưa có mô tả.'}
            </p>

            <MovieTrailerButton movie={movie} />

            <div className="mt-7 grid grid-cols-2 gap-5 max-sm:grid-cols-1">
              <InfoItem label="Thời lượng" value={movie.duration ? `${movie.duration} phút` : ''} />
              <InfoItem label="Khởi chiếu" value={formatDate(releaseDate)} />
              <InfoItem label="Đạo diễn" value={movie.director} />
              <InfoItem label="Quốc gia" value={movie.country} />
              <InfoItem label="Ngôn ngữ" value={movie.language} />
              <InfoItem label="Độ tuổi" value={ageLimit ? `${ageLimit}+` : ''} />
            </div>

            {movie.actors && (
              <div className="mt-6">
                <InfoItem label="Diễn viên" value={movie.actors} />
              </div>
            )}

            <div className="mt-8 flex gap-3 max-sm:flex-col">
              <button
                className="h-12 rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-8 font-[var(--sans)] text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(255,83,100,0.24)]"
                type="button"
                onClick={() => onBook(movie)}
              >
                Đặt vé
              </button>
              <button
                className="h-12 rounded-full border border-white/10 bg-white/[0.04] px-8 font-[var(--sans)] text-sm font-extrabold text-white"
                type="button"
                onClick={onClose}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MovieDetailModal
