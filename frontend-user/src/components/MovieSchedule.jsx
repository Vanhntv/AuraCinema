import { schedule } from '../data/homeData'

function MovieSchedule({ slideTitle }) {
  return (
    <div className="overflow-hidden rounded-[26px] bg-white/80 shadow-[0_20px_50px_rgba(47,83,137,0.22)] max-lg:order-first max-sm:rounded-2xl">
      <div className="grid min-h-14 grid-cols-[22%_58%_20%] items-center bg-gradient-to-b from-[#fa75a7] to-[#f1649a] text-center font-[Montserrat,Arial,sans-serif] text-[17px] font-black uppercase text-white max-sm:text-[13px]">
        <span>Ngày</span>
        <span>Tên phim</span>
        <span>Giá vé</span>
      </div>

      {schedule.map(([day, title, price]) => (
        <div
          className="grid min-h-13 grid-cols-[22%_58%_20%] items-center border-t border-[#2c5ca0]/10 text-center font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif] text-base font-extrabold text-[#235fd0] max-lg:grid-cols-[22%_54%_24%] max-lg:text-[13px] max-sm:min-h-14 max-sm:text-[11px]"
          key={`${slideTitle}-${day}-${title}`}
        >
          <strong>{day}</strong>
          <span className="uppercase text-[#2264c7]">{title}</span>
          <strong className="text-[#e12d68]">{price}</strong>
        </div>
      ))}
    </div>
  )
}

export default MovieSchedule
