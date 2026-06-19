import React from 'react';

const promotions = [
  { id: 1, date: '16/01/2026', title: 'BẢNG GIÁ BỎNG NƯỚC MỚI NHẤT 2026', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6QH43lv690B1hYiay1vOA8e-Zw5r5jlwrBfwvDp-4Xw&s' },
  { id: 2, date: '12/12/2025', title: 'TẶNG VOUCHER 30.000Đ KHI ĐẶT VÉ XEM PHIM QUA VÍ MOMO', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCgAD5yS5ACODL7FfliwQlVWVa8T7gK9p1KWHnYEC6aG58LjsIxmTvvpE&s=10' },
  { id: 3, date: '08/08/2025', title: 'BẢNG GIÁ BỎNG, NƯỚC MỚI NHẤT 2025', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThZuSEhqJWqN98_KddKxezBjI9k7MfoUFIoQHwxXgjlw&s=10' },
  { id: 4, date: '16/07/2025', title: 'ƯU ĐÃI GIÁ VÉ 55.000Đ/VÉ 2D CHO THÀNH VIÊN U22', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTju8OTiFKLSt34XF-OiThu2zQOWXy49HC828bTKo35ag&s' },
  { id: 5, date: '31/01/2025', title: 'GÀ RÁN SIÊU MÊ LY ĐỒNG GIÁ CHỈ 79K CÁC SET GÀ RÁN', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=80' },
  { id: 6, date: '31/12/2024', title: 'TƯNG BỪNG ƯU ĐÃI NĂM 2025 TẠI TRUNG TÂM CHIẾU PHIM QUỐC GIA', image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=80' },
];

function PromotionPage() {
  return (
    <div className="w-full text-white pb-24 pt-6 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif]">
      <div className="w-[min(1760px,calc(100%_-_96px))] mx-auto max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        
        <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-10">
          <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Khuyến mãi
          </h1>
          <span className="text-sm text-slate-400 max-sm:hidden">Ưu đãi độc quyền mỗi ngày</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {promotions.map((promo) => (
            <div key={promo.id} className="group flex flex-col bg-white/[0.02] border border-white/5 rounded-[20px] overflow-hidden backdrop-blur-sm hover:border-[#ff6070]/30 hover:shadow-[0_20px_50px_rgba(255,96,112,0.08)] transition-all duration-500 cursor-pointer">
              <div className="w-full aspect-video overflow-hidden bg-slate-900 relative">
                <img src={promo.image} alt={promo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between min-h-[150px]">
                <div>
                  <span className="text-xs text-[#ff6070] font-bold tracking-wider uppercase mb-2.5 block">{promo.date}</span>
                  <h3 className="text-[15px] font-bold leading-snug text-slate-100 group-hover:text-[#ff6070] transition-colors duration-300 line-clamp-3">
                    {promo.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-[#ff6070] transition-colors duration-300 mt-4">
                  <span>Xem chi tiết</span>
                  <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-16">
          <button className="h-[46px] px-6 rounded-full border border-white/10 bg-white/[0.02] font-bold text-sm text-slate-400 hover:bg-white/[0.08] hover:text-white transition-all duration-300">Quay lại</button>
          <button className="h-[46px] px-6 rounded-full border border-transparent bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] font-bold text-sm text-white shadow-[0_10px_25px_rgba(255,83,100,0.2)] hover:opacity-90 transition-all duration-300">Tiếp theo</button>
        </div>
      </div>
    </div>
  );
}

export default PromotionPage;