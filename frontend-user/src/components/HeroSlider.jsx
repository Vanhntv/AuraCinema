import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { slides } from "../data/homeData";

function HeroSlider() {
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timerRef.current);
  }, []);

  const slide = slides[activeSlide];

  return (
    <section className="relative mx-auto mt-3 min-h-[480px] w-[min(1280px,calc(100%_-_40px))] overflow-hidden rounded-[32px] border border-white/10 bg-[#121923] max-md:min-h-[420px] max-sm:w-[calc(100%_-_28px)]">
      <img className="absolute inset-0 h-full w-full object-cover" src={slide.imageUrl} alt={slide.title} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,12,18,0.96)_0%,rgba(8,12,18,0.72)_42%,rgba(8,12,18,0.1)_75%),linear-gradient(0deg,rgba(8,12,18,0.75),transparent_50%)]" />
      <div className="relative z-10 flex min-h-[480px] max-w-xl flex-col justify-center px-12 py-12 max-md:min-h-[420px] max-md:px-7">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff6070]">Phim nổi bật tuần này</p>
        <h1 className="mt-4 text-5xl font-black uppercase leading-tight text-white max-md:text-4xl">{slide.title}</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">Đặt vé nhanh, chọn ghế trực quan và tận hưởng những bộ phim mới nhất tại Aura Cinema.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/lich-chieu" className="rounded-full bg-[#ff5364] px-6 py-3 text-sm font-extrabold text-white no-underline shadow-[0_14px_35px_rgba(255,83,100,0.3)]">Xem lịch chiếu</Link>
          <Link to="/gia-ve" className="rounded-full border border-white/15 bg-black/20 px-6 py-3 text-sm font-bold text-white no-underline backdrop-blur">Bảng giá vé</Link>
        </div>
      </div>
      <div className="absolute bottom-6 right-7 z-20 flex gap-2">
        {slides.map((item, index) => <button key={item.id} type="button" aria-label={`Chuyển đến slide ${index + 1}`} onClick={() => setActiveSlide(index)} className={`h-2 rounded-full transition-all ${index === activeSlide ? "w-8 bg-[#ff5364]" : "w-2 bg-white/40"}`} />)}
      </div>
    </section>
  );
}

export default HeroSlider;
