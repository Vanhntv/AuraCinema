// src/pages/PromotionPage.jsx
import React from 'react';

const promotions = [
  { id: 1, title: 'BẢNG GIÁ BỎNG NƯỚC MỚI NHẤT 2026', date: '16/01/2026', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6QH43lv690B1hYiay1vOA8e-Zw5r5jlwrBfwvDp-4Xw&s' },
  { id: 2, title: 'TẶNG VOUCHER 30.000Đ KHI ĐẶT VÉ XEM PHIM QUA VÍ MOMO', date: '12/12/2025', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQCgAD5yS5ACODL7FfliwQlVWVa8T7gK9p1KWHnYEC6aG58LjsIxmTvvpE&s=10' },
  { id: 3, title: 'BẢNG GIÁ BỎNG, NƯỚC MỚI NHẤT 2025', date: '08/08/2025', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThZuSEhqJWqN98_KddKxezBjI9k7MfoUFIoQHwxXgjlw&s=10' },
  { id: 4, title: 'ƯU ĐÃI GIÁ VÉ 55.000Đ/VÉ 2D CHO THÀNH VIÊN U22', date: '16/07/2025', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTju8OTiFKLSt34XF-OiThu2zQOWXy49HC828bTKo35ag&s' },
  { id: 5, title: 'GÀ RÁN SIÊU MÊ LY ĐỒNG GIÁ CHỈ 79K CÁC SET GÀ RÁN', date: '31/01/2025', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=80' },
  { id: 6, title: 'TƯNG BỪNG ƯU ĐÃI NĂM 2025 TẠI TRUNG TÂM CHIẾU PHIM QUỐC GIA', date: '31/12/2024', image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=80' },
];

function PromotionPage() {
  return (
    <div className="bg-[#0f141c] min-h-screen py-16 text-white">
      <div className="w-[90%] max-w-[1200px] mx-auto">
        <h1 className="text-3xl font-black uppercase text-center mb-12">Khuyến mãi</h1>
        
        {/* Lưới hiển thị các thẻ khuyến mãi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {promotions.map((promo) => (
            <div key={promo.id} className="bg-[#151b26] rounded-lg overflow-hidden border border-white/5 hover:border-[#ff6070] transition-all group">
              <div className="aspect-[16/10] overflow-hidden">
                <img src={promo.image} alt={promo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-4">
                <p className="text-[11px] text-slate-500 mb-2">{promo.date}</p>
                <h3 className="text-sm font-bold text-slate-200 line-clamp-2 leading-tight">
                  {promo.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PromotionPage;