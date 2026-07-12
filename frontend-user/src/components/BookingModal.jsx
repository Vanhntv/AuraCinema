import { useEffect, useMemo, useState } from 'react'
import { bookTickets, getAvailability, getMovieShowtimes } from '../services/bookingService'

const dateKey = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
const dateLabel = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
const timeLabel = (value) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' })
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`

function BookingContent({ movie, onClose }) {
  const [showtimes, setShowtimes] = useState([]), [selectedDate, setSelectedDate] = useState(''), [showtime, setShowtime] = useState(null)
  const [seats, setSeats] = useState([]), [booked, setBooked] = useState([]), [selected, setSelected] = useState([])
  const [name, setName] = useState(''), [phone, setPhone] = useState(''), [loading, setLoading] = useState(true), [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(''), [booking, setBooking] = useState(null)

  useEffect(() => {
    let active = true
    getMovieShowtimes(movie._id).then((items) => {
      if (!active) return
      const upcoming = items.filter((item) => new Date(item.start_time) > new Date())
      setShowtimes(upcoming)
      if (upcoming[0]) setSelectedDate(dateKey(upcoming[0].start_time))
    }).catch((err) => active && setError(err.message)).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [movie._id])

  useEffect(() => {
    if (!showtime) return
    let active = true
    getAvailability(showtime.id).then((data) => { if (active) { setSeats(data.seats); setBooked(data.bookedSeatIds); setError('') } }).catch((err) => active && setError(err.message)).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [showtime])

  const dates = useMemo(() => [...new Set(showtimes.map((item) => dateKey(item.start_time)))], [showtimes])
  const chosenSeats = seats.filter((seat) => selected.includes(seat._id))
  const total = chosenSeats.reduce((sum, seat) => sum + Math.round(Number(showtime?.base_price || 0) * Number(seat.seat_type_id?.price_multiplier || 1)), 0)

  const chooseShowtime = (item) => { setLoading(true); setShowtime(item); setSelected([]); setSeats([]) }
  const submit = async () => {
    try {
      setSubmitting(true); setError('')
      setBooking(await bookTickets({ showtime_id: showtime.id, seat_ids: selected, customer_name: name, customer_phone: phone }))
    } catch (err) {
      setError(err.message)
      if (err.message.includes('người khác')) { const data = await getAvailability(showtime.id); setBooked(data.bookedSeatIds); setSelected((ids) => ids.filter((id) => !data.bookedSeatIds.includes(id))) }
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 px-5 py-8 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-[min(960px,100%)] overflow-y-auto rounded-3xl border border-white/10 bg-[#101722] p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-[#ff6070]">Đặt vé</p><h2 className="mt-2 text-3xl font-black">{movie.title}</h2></div><button className="h-10 w-10 rounded-full bg-white/10 text-xl hover:bg-[#ff6070]" onClick={onClose}>×</button></div>
        {booking ? <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-9 text-center"><div className="text-5xl">✓</div><h3 className="mt-3 text-2xl font-black">Đặt vé thành công</h3><p className="mt-3 text-slate-300">Mã vé</p><p className="mt-2 text-2xl font-black text-emerald-300">{booking.booking_code}</p><p className="mt-4 text-slate-300">Ghế {booking.seats.map((seat) => seat.label).join(', ')} · {money(booking.total_price)}</p><button className="mt-6 rounded-full bg-[#ff6070] px-7 py-3 font-bold" onClick={onClose}>Hoàn tất</button></div> :
        <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_320px]">
          <div className="grid content-start gap-7">
            <section><h3 className="text-lg font-black">Chọn ngày</h3><div className="mt-3 flex flex-wrap gap-2">{dates.map((date) => <button className={`rounded-full px-4 py-2 text-sm font-bold ${selectedDate === date ? 'bg-[#ff6070]' : 'bg-white/10'}`} key={date} onClick={() => { setSelectedDate(date); setShowtime(null); setSeats([]) }}>{dateLabel(date)}</button>)}</div></section>
            <section><h3 className="text-lg font-black">Chọn suất chiếu</h3><div className="mt-3 flex flex-wrap gap-2">{showtimes.filter((item) => dateKey(item.start_time) === selectedDate).map((item) => <button className={`rounded-xl px-4 py-3 text-sm font-bold ${showtime?.id === item.id ? 'bg-[#ff6070]' : 'bg-white/10'}`} key={item.id} onClick={() => chooseShowtime(item)}>{timeLabel(item.start_time)} · {item.cinemaName} / {item.roomName}</button>)}</div></section>
            <section><h3 className="text-lg font-black">Chọn ghế</h3><div className="mt-3 rounded-2xl border border-white/10 p-5"><div className="mx-auto mb-2 h-2 w-2/3 rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent"/><p className="mb-5 text-center text-[10px] uppercase tracking-widest text-slate-500">Màn hình</p><div className="grid grid-cols-10 gap-2 max-sm:grid-cols-6">{seats.map((seat) => { const sold = booked.includes(seat._id), active = selected.includes(seat._id); return <button disabled={sold} key={seat._id} className={`h-9 rounded text-xs font-black ${sold ? 'cursor-not-allowed bg-slate-800 text-slate-600' : active ? 'bg-[#ff6070]' : 'bg-white/10 hover:bg-white/20'}`} onClick={() => setSelected((ids) => ids.includes(seat._id) ? ids.filter((id) => id !== seat._id) : [...ids, seat._id])}>{seat.seat_row}{seat.seat_number}</button> })}</div>{!showtime && <p className="py-8 text-center text-sm text-slate-400">Chọn suất chiếu để xem ghế.</p>}</div></section>
          </div>
          <aside className="h-fit rounded-2xl border border-white/10 bg-white/[.04] p-5"><h3 className="text-lg font-black">Thông tin vé</h3><div className="mt-5 grid gap-3 text-sm text-slate-300"><p>Suất: {showtime ? `${dateLabel(selectedDate)} · ${timeLabel(showtime.start_time)}` : 'Chưa chọn'}</p><p>Ghế: {chosenSeats.length ? chosenSeats.map((seat) => `${seat.seat_row}${seat.seat_number}`).join(', ') : 'Chưa chọn'}</p><p>Tổng: <strong className="text-[#ff9aa5]">{money(total)}</strong></p></div><div className="mt-5 grid gap-3"><input className="h-11 rounded-xl border border-white/10 bg-black/20 px-4 outline-none focus:border-[#ff6070]" placeholder="Họ tên" value={name} onChange={(e) => setName(e.target.value)}/><input className="h-11 rounded-xl border border-white/10 bg-black/20 px-4 outline-none focus:border-[#ff6070]" placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)}/></div>{loading && <p className="mt-4 text-sm text-slate-400">Đang tải...</p>}{error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{!loading && !showtimes.length && !error && <p className="mt-4 text-sm text-amber-300">Phim chưa có suất chiếu sắp tới.</p>}<button disabled={submitting || !showtime || !selected.length || !name.trim() || !phone.trim()} className="mt-6 h-12 w-full rounded-full bg-[#ff6070] font-extrabold disabled:opacity-50" onClick={submit}>{submitting ? 'Đang đặt...' : 'Xác nhận đặt vé'}</button></aside>
        </div>}
      </div>
    </div>
  )
}

function BookingModal({ movie, onClose }) {
  if (!movie) return null
  return <BookingContent key={movie._id} movie={movie} onClose={onClose} />
}
export default BookingModal
