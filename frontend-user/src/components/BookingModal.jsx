import { useMemo, useState } from 'react'

const showDates = [
  'Hôm nay',
  'Ngày mai',
  'Thứ 6',
  'Thứ 7',
]

const showtimes = ['09:30', '13:15', '16:45', '19:30', '21:45']

const seats = Array.from({ length: 36 }, (_, index) => {
  const row = String.fromCharCode(65 + Math.floor(index / 6))
  const number = (index % 6) + 1
  return `${row}${number}`
})

function BookingModal({ movie, onClose }) {
  const [selectedDate, setSelectedDate] = useState(showDates[0])
  const [selectedTime, setSelectedTime] = useState(showtimes[0])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const totalPrice = useMemo(() => selectedSeats.length * 45000, [selectedSeats])

  if (!movie) return null

  const toggleSeat = (seat) => {
    setSelectedSeats((current) =>
      current.includes(seat)
        ? current.filter((item) => item !== seat)
        : [...current, seat],
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/75 px-5 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Đặt vé phim ${movie.title}`}
    >
      <div
        className="max-h-[90vh] w-[min(920px,100%)] overflow-y-auto rounded-3xl border border-white/10 bg-[#101722] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.55)] md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-bold uppercase tracking-[0.2em] text-[#ff6070]">
              Đặt vé
            </p>
            <h2 className="mt-2 font-[Montserrat,Arial,sans-serif] text-3xl font-black text-white max-sm:text-2xl">
              {movie.title}
            </h2>
          </div>
          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-xl font-black text-white transition-colors hover:bg-[#ff6070]"
            type="button"
            aria-label="Đóng đặt vé"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-7">
            <div>
              <h3 className="font-[Montserrat,Arial,sans-serif] text-lg font-black text-white">
                Chọn ngày
              </h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {showDates.map((date) => (
                  <button
                    className={`rounded-full px-5 py-3 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-extrabold transition-colors ${
                      selectedDate === date
                        ? 'bg-[#ff6070] text-white'
                        : 'bg-white/10 text-slate-200 hover:bg-white/15'
                    }`}
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-[Montserrat,Arial,sans-serif] text-lg font-black text-white">
                Chọn suất chiếu
              </h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {showtimes.map((time) => (
                  <button
                    className={`rounded-full px-5 py-3 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-extrabold transition-colors ${
                      selectedTime === time
                        ? 'bg-[#ff6070] text-white'
                        : 'bg-white/10 text-slate-200 hover:bg-white/15'
                    }`}
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-[Montserrat,Arial,sans-serif] text-lg font-black text-white">
                Chọn ghế
              </h3>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mx-auto mb-5 h-2 w-2/3 rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
                <div className="grid grid-cols-6 gap-3">
                  {seats.map((seat) => (
                    <button
                      className={`h-10 rounded-lg font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-xs font-black transition-colors ${
                        selectedSeats.includes(seat)
                          ? 'bg-[#ff6070] text-white'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                      key={seat}
                      type="button"
                      onClick={() => toggleSeat(seat)}
                    >
                      {seat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h3 className="font-[Montserrat,Arial,sans-serif] text-lg font-black text-white">
              Thông tin vé
            </h3>
            <div className="mt-5 grid gap-4 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm text-slate-300">
              <p>
                <span className="text-slate-500">Ngày:</span> {selectedDate}
              </p>
              <p>
                <span className="text-slate-500">Suất:</span> {selectedTime}
              </p>
              <p>
                <span className="text-slate-500">Ghế:</span>{' '}
                {selectedSeats.length ? selectedSeats.join(', ') : 'Chưa chọn'}
              </p>
              <p>
                <span className="text-slate-500">Tổng:</span>{' '}
                <strong className="text-[#ff9aa5]">
                  {totalPrice.toLocaleString('vi-VN')}đ
                </strong>
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <input
                className="h-11 rounded-xl border border-white/10 bg-black/20 px-4 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ff6070]"
                placeholder="Họ tên"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
              <input
                className="h-11 rounded-xl border border-white/10 bg-black/20 px-4 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ff6070]"
                placeholder="Số điện thoại"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </div>

            <button
              className="mt-6 h-12 w-full rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!selectedSeats.length || !customerName || !customerPhone}
            >
              Xác nhận đặt vé
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default BookingModal
