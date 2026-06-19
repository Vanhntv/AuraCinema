import { useEffect, useState } from 'react'
import { slides } from '../data/homeData'
import MovieSchedule from '../pages/MovieSchedule'
import PosterStack from './PosterStack'

function HeroSlider() {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length)
    }, 4000)

    return () => window.clearInterval(timer)
  }, [])

  const goToPrevious = () => {
    setActiveSlide((current) => (current - 1 + slides.length) % slides.length)
  }

  const goToNext = () => {
    setActiveSlide((current) => (current + 1) % slides.length)
  }

  return (
    <section
      className="relative mx-auto mt-2.5 w-[min(1760px,calc(100%_-_120px))] overflow-hidden max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]"
      aria-label="Banner phim"
    >
      <button
        className="absolute left-4 top-1/2 z-30 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[#121821]/85 text-[38px] leading-none text-white max-lg:hidden"
        type="button"
        aria-label="Ảnh trước"
        onClick={goToPrevious}
      >
        {'<'}
      </button>

      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <article
            className={`relative grid min-h-[748px] w-full shrink-0 grid-rows-[auto_1fr_auto] overflow-hidden px-28 pb-5 pt-11 shadow-[0_20px_50px_rgba(0,0,0,0.35)] max-xl:min-h-[640px] max-xl:px-14 max-xl:py-9 max-lg:px-6 max-lg:py-8 max-sm:min-h-0 ${slide.background}`}
            key={slide.title}
          >
            <div className="absolute inset-x-0 bottom-0 h-52 bg-[radial-gradient(circle_at_9%_78%,#ff8cc3_0_40px,transparent_42px),radial-gradient(circle_at_16%_88%,#ffbdd9_0_62px,transparent_64px),radial-gradient(circle_at_88%_78%,#ff8cc3_0_44px,transparent_46px),radial-gradient(circle_at_95%_88%,#ffc0de_0_66px,transparent_68px)] opacity-80"></div>

            <div className="relative z-10 text-center">
              <p className="mx-auto mb-3.5 w-max max-w-full rounded-full border-2 border-[#347ee8] bg-white/80 px-9 py-2 font-[Montserrat,Arial,sans-serif] text-[19px] font-black uppercase text-[#1263d8] max-lg:text-[15px]">
                {slide.eyebrow}
              </p>
              <h1 className="m-0 font-[Impact,Haettenschweiler,'Arial_Black',Montserrat,sans-serif] text-[clamp(34px,4vw,64px)] uppercase leading-none tracking-[1px] text-[#ff2e75] [text-shadow:0_4px_0_#fff,0_8px_0_rgba(39,117,232,0.7),0_12px_28px_rgba(25,70,160,0.35)]">
                {slide.title}
              </h1>
              <p className="mt-4 font-[Montserrat,Arial,sans-serif] text-[23px] font-black uppercase text-[#1256d5] max-lg:text-[17px]">
                {slide.date}
              </p>
            </div>

            <div className="relative z-10 mt-8 grid grid-cols-[minmax(230px,300px)_minmax(560px,1fr)_minmax(230px,300px)] items-end gap-8 max-xl:grid-cols-[205px_minmax(430px,1fr)_205px] max-xl:gap-5 max-lg:grid-cols-1 max-lg:gap-5">
              <PosterStack side="left" />
              <MovieSchedule slideTitle={slide.title} />
              <PosterStack side="right" />
            </div>

            <div className="relative z-10 mx-auto mt-4 w-max max-w-full rounded-full bg-white/70 px-[76px] py-3 font-[Montserrat,Arial,sans-serif] text-[19px] font-black text-[#1d5fbf] max-sm:px-5 max-sm:text-[13px]">
              <span>{slide.footer}</span>
            </div>
          </article>
        ))}
      </div>

      <button
        className="absolute right-4 top-1/2 z-30 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[#121821]/85 text-[38px] leading-none text-white max-lg:hidden"
        type="button"
        aria-label="Ảnh tiếp"
        onClick={goToNext}
      >
        {'>'}
      </button>

      <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 gap-2">
        {slides.map((slide, index) => (
          <button
            className={`h-2.5 rounded-full transition-all ${
              index === activeSlide ? 'w-8 bg-white' : 'w-2.5 bg-white/50'
            }`}
            key={slide.title}
            type="button"
            aria-label={`Chuyển tới banner ${index + 1}`}
            onClick={() => setActiveSlide(index)}
          ></button>
        ))}
      </div>
    </section>
  )
}

export default HeroSlider
