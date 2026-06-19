import React, { useState } from 'react';

function MovieSchedule() {
  const days = [
    { date: '19/06', label: 'T6' },
    { date: '20/06', label: 'T7' },
    { date: '21/06', label: 'CN' },
    { date: '22/06', label: 'T2' },
    { date: '23/06', label: 'T3' },
    { date: '24/06', label: 'T4' },
    { date: '25/06', label: 'T5' },
  ];

  const [selectedDate, setSelectedDate] = useState('19/06');

  const moviesData = [
    {
      id: 1,
      title: 'MA XÓ',
      tags: 'Kinh dị',
      duration: '1 giờ 42 phút',
      origin: 'Việt Nam',
      price: '50.000đ',
      image: 'https://cdn.galaxycine.vn/media/2026/5/29/ma-xo-2_1780061164303.jpg',
      slots: ['08:45', '12:40', '14:00', '16:40', '18:00', '20:45', '23:15']
    },
    {
      id: 2,
      title: 'TOY STORY 5',
      tags: 'Hoạt hình / Hài hước',
      duration: '1 giờ 42 phút',
      origin: 'Mỹ',
      price: '45.000đ',
      image: 'https://iguov8nhvyobj.vcdn.cloud/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/p/o/poster_cau_chuyen_do_choi_5_.jpg',
      slots: ['09:30', '11:15', '13:45', '16:00', '19:15', '21:30']
    },
    {
      id: 3,
      title: 'LẦU CHÚ HỎA',
      tags: 'Kinh dị',
      duration: '1 giờ 43 phút',
      origin: 'Việt Nam',
      price: '45.000đ',
      image: 'https://iguov8nhvyobj.vcdn.cloud/media/catalog/product/cache/1/image/c5f0a1eff4c394a251036189ccddaacd/4/7/470wx700h-lch.jpg',
      slots: ['10:00', '14:30', '17:45', '20:00', '22:15']
    },
    {
      id: 4,
      title: 'MUMBO GIẢI CỨU BÉ BỰ',
      tags: 'Hoạt hình / Viễn tưởng',
      duration: '88 phút',
      origin: 'Mỹ',
      price: '35.000đ',
      image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80',
      slots: ['09:00', '13:15', '15:30', '18:45']
    },
    {
      id: 5,
      title: 'THỎ ƠI',
      tags: 'Tâm lý / Tình cảm',
      duration: '127 phút',
      origin: 'Việt Nam',
      price: '45.000đ',
      image: 'https://cdn2.tuoitre.vn/thumb_w/640/471584752817336320/2026/2/21/base64-17716817771081137588961.jpeg',
      slots: ['10:30', '14:00', '17:15', '20:30']
    },
    {
      id: 6,
      title: 'MESDAMES THANH SẮC',
      tags: 'Tâm lý / Tình cảm',
      duration: '125 phút',
      origin: 'Việt Nam',
      price: '50.000đ',
      image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80',
      slots: ['18:45', '21:00', '22:20', '23:15']
    },
    {
      id: 7,
      title: 'ÁM ẢNH KINH HOÀNG',
      tags: 'Kinh dị / Giật gân',
      duration: '109 phút',
      origin: 'Mỹ',
      price: '45.000đ',
      image: 'https://images.unsplash.com/photo-1505635552518-3448ff116af3?w=600&auto=format&fit=crop&q=80',
      slots: ['15:00', '17:00', '18:50', '22:40', '23:10']
    },
    {
      id: 8,
      title: 'BẠCH XÀ: MỘT KIẾP NHÂN GIAN',
      tags: 'Hoạt hình / Cổ trang',
      duration: '133 phút',
      origin: 'Trung Quốc',
      price: '45.000đ',
      image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
      slots: ['18:05', '19:30']
    },
    {
      id: 9,
      title: 'MA LU: MA LÀM ĂN THỊT NGƯỜI',
      tags: 'Kinh dị / Huyền bí',
      duration: '98 phút',
      origin: 'Indonesia',
      price: '45.000đ',
      image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=600&auto=format&fit=crop&q=80',
      slots: ['19:05', '22:55']
    }
  ];

  const firstBigMovie = moviesData[0];
  const restSmallMovies = moviesData.slice(1);

  return (
    <div className="w-full text-white pt-8 pb-24 font-['Be_Vietnam_Pro']">
      <div className="w-[min(1760px,calc(100%_-_96px))] mx-auto max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        
        <div className="flex items-center gap-3 overflow-x-auto pb-4 mb-10 scrollbar-none border-b border-white/5">
          {days.map((day) => {
            const isTarget = selectedDate === day.date;
            return (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`flex flex-col items-center justify-center min-w-[85px] h-[70px] rounded-[16px] transition-all ${
                  isTarget ? 'bg-[#ff5364] text-white scale-105 shadow-lg' : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:text-white'
                }`}
                type="button"
              >
                <span className="text-base font-black">{day.date}</span>
                <span className="text-[10px] font-bold opacity-70 uppercase">{day.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-6">
          {firstBigMovie && (
            <div className="flex max-md:flex-col gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-[24px] relative">
              <div className="w-[180px] max-md:w-full aspect-[2/3] rounded-[16px] overflow-hidden flex-shrink-0">
                <img src={firstBigMovie.image} alt={firstBigMovie.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-100 uppercase">{firstBigMovie.title}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-400 mt-2">
                    <span>{firstBigMovie.tags}</span><span>•</span><span>{firstBigMovie.duration}</span><span>•</span><span className="text-[#ff6070] font-bold">Giá: {firstBigMovie.price}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-5 mb-3">2D PHỤ ĐỀ</div>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {firstBigMovie.slots.map((slot, idx) => (
                    <button key={idx} className="flex flex-col items-center justify-center w-[85px] h-[50px] bg-[#161b22] border border-white/5 rounded-[12px] hover:border-[#ff6070]" type="button">
                      <span className="text-sm font-black text-slate-200">{slot}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {restSmallMovies.map((movie) => (
              <div key={movie.id} className="flex max-sm:flex-col gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-[24px] relative">
                <div className="w-[140px] max-sm:w-full aspect-[2/3] rounded-[16px] overflow-hidden flex-shrink-0">
                  <img src={movie.image} alt={movie.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between min-h-[190px]">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-100 uppercase line-clamp-2">{movie.title}</h3>
                    <div className="text-[11px] text-slate-400 mt-1.5">{movie.tags} • {movie.duration}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {movie.slots.slice(0, 4).map((slot, idx) => (
                      <button key={idx} className="flex flex-col items-center justify-center w-[76px] h-[46px] bg-[#161b22] border border-white/5 rounded-[10px] hover:border-[#ff6070]" type="button">
                        <span className="text-xs font-black text-slate-200">{slot}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default MovieSchedule;