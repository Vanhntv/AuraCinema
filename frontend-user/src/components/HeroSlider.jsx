import { useEffect, useState, useRef } from 'react'
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

  return (
    <section className="relative mx-auto mt-2 w-full overflow-hidden aspect-[21/9] max-h-[600px] bg-[#0f141c]">
      
      <div
        className="flex h-full w-full will-change-transform transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ transform: `translateX(-${activeSlide * 100}%)` }}
      >
        {slides.map((slide) => (
          <div className="relative h-full w-full flex-shrink-0" key={slide.id}>
            <img 
              src={slide.imageUrl} 
              alt={slide.title} 
              className="h-full w-full object-cover pointer-events-none"
              loading="lazy"
            />
        
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0f141c] via-[#0f141c]/50 to-transparent"></div>
          </div>
        ))}
      </div>

      <button
        className="absolute left-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 border border-white/10 text-white backdrop-blur-md transition-all hover:bg-[#ff2e75] hover:scale-110 active:scale-95"
        onClick={() => handleNavigation((activeSlide - 1 + slides.length) % slides.length)}
      >
        ‹
      </button>

      <button
        className="absolute right-6 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 border border-white/10 text-white backdrop-blur-md transition-all hover:bg-[#ff2e75] hover:scale-110 active:scale-95"
        onClick={() => handleNavigation((activeSlide + 1) % slides.length)}
      >
        ›
      </button>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === activeSlide ? 'w-8 bg-[#ff2e75]' : 'w-2 bg-white/30'
            }`}
            onClick={() => handleNavigation(index)}
          />
        ))}
      </div>
    </section>
  )
}

export default HeroSlider