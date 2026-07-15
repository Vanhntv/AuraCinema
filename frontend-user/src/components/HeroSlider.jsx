import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { slides } from '../data/homeData'

function HeroSlider() {
  const [activeSlide, setActiveSlide] = useState(0)
  const timerRef = useRef(null)

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
  }

  useEffect(() => {
    resetTimer()
    return () => clearInterval(timerRef.current)
  }, [])

  const handleNavigation = (index) => {
    setActiveSlide(index)
    resetTimer()
  }

  const currentSlide = slides[activeSlide]

  return (
    <section className="relative mx-auto w-full overflow-hidden bg-[#0f141c]">
      <div
        className="flex h-[min(680px,calc(100svh_-_118px))] min-h-[460px] w-full will-change-transform transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] max-xl:h-[560px] max-sm:h-[520px] max-sm:min-h-[520px]"
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div className="relative h-full w-full flex-shrink-0" key={slide.id}>
            <img
              className="pointer-events-none h-full w-full object-cover"
              src={slide.imageUrl}
              alt={slide.title}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,20,28,0.92)_0%,rgba(15,20,28,0.58)_38%,rgba(15,20,28,0.16)_70%),linear-gradient(180deg,rgba(15,20,28,0.1)_0%,rgba(15,20,28,0.92)_100%)]"></div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center">
        <div className="mx-auto w-[min(1760px,calc(100%_-_96px))] max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
          <div className="max-w-[680px]">
            <p className="font-[var(--sans)] text-sm font-extrabold uppercase tracking-[0.28em] text-[#ff6070]">
              Đang chiếu tại AuraCinema
            </p>
            <h1 className="mt-4 font-[var(--display)] text-6xl font-black uppercase leading-[0.98] text-white max-xl:text-5xl max-sm:text-4xl">
              {currentSlide?.title}
            </h1>
            <p className="mt-5 max-w-xl font-[var(--sans)] text-base font-medium leading-7 text-slate-300 max-sm:text-sm max-sm:leading-6">
              Chọn phim, xem suất chiếu và đặt ghế trong vài bước với giao diện
              rõ ràng, nhanh và dễ dùng.
            </p>
            <div className="pointer-events-auto mt-8 flex flex-wrap gap-3">
              <Link
                className="flex h-12 items-center justify-center rounded-full bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] px-7 font-[var(--sans)] text-sm font-extrabold text-white no-underline shadow-[0_16px_36px_rgba(255,83,100,0.34)]"
                to="/lich-chieu"
              >
                Xem suất chiếu
              </Link>
              <a
                className="flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] px-7 font-[var(--sans)] text-sm font-extrabold text-white no-underline backdrop-blur-md transition-colors hover:border-[#ff6070]"
                href="#phim"
              >
                Khám phá phim
              </a>
            </div>
          </div>
        </div>
      </div>

      <button
        className="absolute left-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-2xl text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-[#ff2e75] active:scale-95 max-sm:left-3"
        aria-label="Slide trước"
        type="button"
        onClick={() => handleNavigation((activeSlide - 1 + slides.length) % slides.length)}
      >
        ‹
      </button>

      <button
        className="absolute right-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/30 text-2xl text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-[#ff2e75] active:scale-95 max-sm:right-3"
        aria-label="Slide tiếp theo"
        type="button"
        onClick={() => handleNavigation((activeSlide + 1) % slides.length)}
      >
        ›
      </button>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <button
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === activeSlide ? 'w-8 bg-[#ff2e75]' : 'w-2 bg-white/30'
            }`}
            aria-label={`Chuyển đến slide ${index + 1}`}
            key={index}
            type="button"
            onClick={() => handleNavigation(index)}
          />
        ))}
      </div>
    </section>
  )
}

export default HeroSlider
