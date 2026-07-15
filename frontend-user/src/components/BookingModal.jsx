import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { formatPhoneInput, isValidVietnamPhone } from '../utils/phone'

const showDates = ['Hôm nay', 'Ngày mai', 'Thứ 6', 'Thứ 7']
const showtimes = ['09:30', '13:15', '16:45', '19:30', '21:45']
const HOLD_SECONDS = 5 * 60

const formatHoldTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

const seatTypes = {
  standard: {
    label: 'Ghế thường',
    price: 45000,
    className: 'bg-white/10 text-slate-300 hover:bg-white/20',
    selectedClassName: 'bg-[#ff6070] text-white',
  },
  vip: {
    label: 'Ghế VIP',
    price: 65000,
    className:
      'bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/20 hover:bg-amber-400/25',
    selectedClassName: 'bg-amber-400 text-[#251503]',
  },
  couple: {
    label: 'Ghế đôi',
    price: 95000,
    className:
      'bg-sky-400/15 text-sky-100 ring-1 ring-sky-300/20 hover:bg-sky-400/25',
    selectedClassName: 'bg-sky-400 text-[#041824]',
  },
}

const resolveSeatType = (row) => {
  if (row === 'F') return 'couple'
  if (row === 'D' || row === 'E') return 'vip'
  return 'standard'
}

const seats = Array.from({ length: 36 }, (_, index) => {
  const row = String.fromCharCode(65 + Math.floor(index / 6))
  const number = (index % 6) + 1
  const type = resolveSeatType(row)

  return {
    id: `${row}${number}`,
    type,
    ...seatTypes[type],
  }
})

function BookingModal({ movie, onClose }) {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(showDates[0])
  const [selectedTime, setSelectedTime] = useState(showtimes[0])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [holdSeconds, setHoldSeconds] = useState(HOLD_SECONDS)
  const [holdExpired, setHoldExpired] = useState(false)

  const phoneIsValid = isValidVietnamPhone(customerPhone)
  const totalPrice = useMemo(
    () => selectedSeats.reduce((total, seat) => total + seat.price, 0),
    [selectedSeats],
  )

  useEffect(() => {
    if (!movie) return

    setSelectedDate(movie.bookingDateLabel || showDates[0])
    setSelectedTime(movie.bookingTime || showtimes[0])
    setSelectedSeats([])
    setHoldSeconds(HOLD_SECONDS)
    setHoldExpired(false)
    setCustomerName(user?.full_name || '')
    setCustomerPhone(formatPhoneInput(user?.phone || ''))
  }, [movie, user])

  useEffect(() => {
    if (!movie || selectedSeats.length === 0) {
      setHoldSeconds(HOLD_SECONDS)
      return undefined
    }

    if (holdSeconds <= 0) {
      setSelectedSeats([])
      setHoldExpired(true)
      return undefined
    }

    const timer = window.setInterval(() => {
      setHoldSeconds((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [holdSeconds, movie, selectedSeats.length])

  if (!movie) return null

  const toggleSeat = (seat) => {
    setHoldExpired(false)
    setSelectedSeats((current) =>
      current.some((item) => item.id === seat.id)
        ? current.filter((item) => item.id !== seat.id)
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
            <p className="font-[var(--sans)] text-sm font-bold uppercase tracking-[0.2em] text-[#ff6070]">
              Đặt vé
            </p>
            <h2 className="mt-2 font-[var(--display)] text-3xl font-black text-white max-sm:text-2xl">
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
              <h3 className="font-[var(--display)] text-lg font-black text-white">
                Chọn ngày
              </h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {showDates.map((date) => (
                  <button
                    className={`rounded-full px-5 py-3 font-[var(--sans)] text-sm font-extrabold transition-colors ${
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
              <h3 className="font-[var(--display)] text-lg font-black text-white">
                Chọn suất chiếu
              </h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {showtimes.map((time) => (
                  <button
                    className={`rounded-full px-5 py-3 font-[var(--sans)] text-sm font-extrabold transition-colors ${
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
              <h3 className="font-[var(--display)] text-lg font-black text-white">
                Chọn ghế
              </h3>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mx-auto mb-5 h-2 w-2/3 rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
                <div className="grid grid-cols-6 gap-3">
                  {seats.map((seat) => (
                    <button
                      className={`h-10 rounded-lg font-[var(--sans)] text-xs font-black transition-colors ${
                        selectedSeats.some((item) => item.id === seat.id)
                          ? seat.selectedClassName
                          : seat.className
                      }`}
                      key={seat.id}
                      title={`${seat.label} - ${seat.price.toLocaleString('vi-VN')}đ`}
                      type="button"
                      onClick={() => toggleSeat(seat)}
                    >
                      {seat.id}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3 font-[var(--sans)] text-xs font-bold text-slate-300">
                  {Object.entries(seatTypes).map(([type, seatType]) => (
                    <span className="inline-flex items-center gap-2" key={type}>
                      <span className={`h-3 w-3 rounded ${seatType.className}`}></span>
                      {seatType.label} - {seatType.price.toLocaleString('vi-VN')}đ
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h3 className="font-[var(--display)] text-lg font-black text-white">
              Thông tin vé
            </h3>
            {selectedSeats.length > 0 && (
              <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-[#ff6070]/25 bg-[#ff6070]/10 px-4 py-3 font-[var(--sans)] text-sm text-slate-100">
                <span className="font-bold">Thời gian giữ ghế</span>
                <span className="rounded-full bg-black/25 px-3 py-1 font-black text-[#ff9aa5]">
                  {formatHoldTime(holdSeconds)}
                </span>
              </div>
            )}
            {holdExpired && (
              <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 font-[var(--sans)] text-sm font-bold text-red-100">
                Đã hết thời gian giữ ghế. Vui lòng chọn lại ghế.
              </p>
            )}
            <div className="mt-5 grid gap-4 font-[var(--sans)] text-sm text-slate-300">
              <p>
                <span className="text-slate-500">Ngày:</span> {selectedDate}
              </p>
              <p>
                <span className="text-slate-500">Suất:</span> {selectedTime}
              </p>
              <p>
                <span className="text-slate-500">Ghế:</span>{' '}
                {selectedSeats.length
                  ? selectedSeats.map((seat) => `${seat.id} (${seat.label})`).join(', ')
                  : 'Chưa chọn'}
              </p>
              <p>
                <span className="text-slate-500">Tổng:</span>{' '}
                <strong className="text-[#ff9aa5]">
                  {totalPrice.toLocaleString('vi-VN')}đ
                </strong>
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <p className="font-[var(--sans)] text-xs font-bold text-slate-400">
                Thông tin người đặt vé lấy từ tài khoản đăng nhập và có thể sửa.
              </p>
              <input
                className="h-11 rounded-xl border border-white/10 bg-black/20 px-4 font-[var(--sans)] text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ff6070]"
                placeholder="Họ tên"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
              <input
                className="h-11 rounded-xl border border-white/10 bg-black/20 px-4 font-[var(--sans)] text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#ff6070]"
                maxLength={10}
                pattern="0[0-9]{9}"
                placeholder="Số điện thoại"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(formatPhoneInput(event.target.value))}
              />
              {customerPhone && !phoneIsValid && (
                <p className="font-[var(--sans)] text-xs font-bold text-red-300">
                  Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.
                </p>
              )}
            </div>

            <button
              className="mt-6 h-12 w-full rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] font-[var(--sans)] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!selectedSeats.length || !customerName || !phoneIsValid}
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
