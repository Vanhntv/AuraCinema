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

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-semibold text-slate-100">
        {value || 'Đang cập nhật'}
      </p>
    </div>
  )
}

function MovieDetailModal({ movie, onClose }) {
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
        className="relative max-h-[90vh] w-[min(980px,100%)] overflow-hidden rounded-3xl border border-white/10 bg-[#101722] shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/45 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-xl font-black text-white transition-colors hover:bg-[#ff6070]"
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
              <img
                className="h-full w-full object-cover"
                src={movie.poster}
                alt={movie.title}
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </div>
          </div>

          <div>
            <span className="inline-flex rounded-full bg-[#ff6070]/20 px-4 py-2 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-xs font-black uppercase tracking-[0.14em] text-[#ff9aa5]">
              {getStatusLabel(movie.status)}
            </span>
            <h2 className="mt-4 font-[Montserrat,Arial,sans-serif] text-3xl font-black leading-tight text-white max-sm:text-2xl">
              {movie.title}
            </h2>

            <p className="mt-4 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm leading-7 text-slate-300">
              {movie.description || 'Phim chưa có mô tả.'}
            </p>

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
                className="h-12 rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-8 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(255,83,100,0.24)]"
                type="button"
              >
                Đặt vé
              </button>
              <button
                className="h-12 rounded-full border border-white/10 bg-white/[0.04] px-8 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-extrabold text-white"
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
