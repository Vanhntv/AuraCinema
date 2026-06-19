import React from 'react';

function NewsPage() {
  // Bộ dữ liệu mới đã được sửa link ảnh số 7 để hiển thị chuẩn xác
  const newsArticles = [
    {
      id: 1,
      date: '19/06/2026',
      title: 'ĐÊM HỘI CÔNG CHIẾU BOM TẤN: NHẬN NGAY COMBO BẮP NƯỚC GIỚI HẠN KHI ĐẶT VÉ TRƯỚC',
      image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 2,
      date: '17/06/2026',
      title: 'XU HƯỚNG ĐIỆN ẢNH 2026: KỶ XẢO VFX LÊN NGÔI VÀ SỰ TRỞ LẠI CỦA CÁC ĐẠO DIỄN HUYỀN THOẠI',
      image: 'https://maac.edu.vn/wp-content/uploads/2023/09/Post_GlobalVFX_1400x527.jpg'
    },
    {
      id: 3,
      date: '15/06/2026',
      title: 'CHƯƠNG TRÌNH THÀNH VIÊN: ĐỔI ĐIỂM TÍCH LŨY LẤY VÉ XEM PHIM MIỄN PHÍ MỖI THỨ TƯ HÀNG TUẦN',
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyPkCoh0z5Qw1VxlJyP4Qtz5dNrAb78eaUQd13Hf15YXWQtaki_xgoOFys&s=10'
    },
    {
      id: 4,
      date: '12/06/2026',
      title: 'BẬT MÍ HẬU TRƯỜNG KHỦNG CỦA SIÊU PHẨM HOẠT HÌNH ĐÌNH ĐÁM VỪA CÁN MỐC TRĂM TỶ',
      image: 'https://baoxaydung.mediacdn.vn/603483875699699712/2025/11/12/viet-huong-va-khuong-ngoc-o-hau-truong-phim-1762938616254714053838.png'
    },
    {
      id: 5,
      date: '08/06/2026',
      title: 'ƯU ĐÃI ĐỒNG GIÁ VÉ 45K CHO HỌC SINH SINH VIÊN KHI TRẢI NGHIỆM PHÒNG CHIẾU IMAX MỚI',
      image: 'https://api-website.cinestar.com.vn/media/wysiwyg/CMSPage/Promotions/MONDAY.jpg'
    },
    {
      id: 6,
      date: '05/06/2026',
      title: 'TOP 5 BỘ PHIM KINH DỊ ĐÁNG MONG CHỜ NHẤT DÀNH CHO CÁC MỌT PHIM TRONG DỊP HÈ NÀY',
      image: 'https://cdn.tgdd.vn/Files/2022/05/13/1432302/21-phim-kinh-di-my-rung-ron-hay-va-moi-nhat-nhat-dinh-phai-xem-202205140749559694.jpg'
    },
    {
      id: 7,
      date: '02/06/2026',
      title: 'LỄ HỘI PHIM LIÊN HOAN QUỐC TẾ CHÍNH THỨC KHAI MẠC TẠI HỆ THỐNG RẠP CỦA CHÚNG TÔI',
      image: 'https://file3.qdnd.vn/data/images/0/2024/11/07/upload_2049/phim-05.jpg'
    },
    {
      id: 8,
      date: '29/05/2026',
      title: 'GÓC ĐIỆN ẢNH: PHÂN TÍCH NHỮNG CHI TIẾT ẨN DỤ ĐẮT GIÁ TRONG PHIM TÂM LÝ HOT NHẤT TUẦN QUA',
      image: 'https://img-evg4.tv360.vn/2025/11/phan-tich-noi-dung-phim-mua-do-7.png'
    }
  ];

  return (
    <div className="w-full text-white pb-24 pt-6 font-['Be_Vietnam_Pro',Montserrat,Arial,sans-serif]">
      <div className="w-[min(1760px,calc(100%_-_96px))] mx-auto max-xl:w-[min(1120px,calc(100%_-_56px))] max-sm:w-[calc(100%_-_28px)]">
        
        <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-10">
          <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Bảng Tin Điện Ảnh
          </h1>
          <span className="text-sm text-slate-400 max-sm:hidden">Cập nhật xu hướng mới nhất</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {newsArticles.map((article) => (
            <div 
              key={article.id} 
              className="group flex flex-col bg-white/[0.02] border border-white/5 rounded-[20px] overflow-hidden backdrop-blur-sm hover:border-[#ff6070]/30 hover:shadow-[0_20px_50px_rgba(255,96,112,0.08)] transition-all duration-500 cursor-pointer"
            >
              <div className="w-full aspect-video overflow-hidden bg-slate-900 relative">
                <img 
                  src={article.image} 
                  alt={article.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between min-h-[150px]">
                <div>
                  <span className="text-xs text-[#ff6070] font-bold tracking-wider uppercase mb-2.5 block">
                    {article.date}
                  </span>
                  
                  <h3 className="text-[15px] font-bold leading-snug text-slate-100 group-hover:text-[#ff6070] transition-colors duration-300 line-clamp-3">
                    {article.title}
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
          <button className="h-[46px] px-6 rounded-full border border-white/10 bg-white/[0.02] font-bold text-sm text-slate-400 hover:bg-white/[0.08] hover:text-white transition-all duration-300">
            Quay lại
          </button>
          <button className="h-[46px] px-6 rounded-full border border-transparent bg-gradient-to-b from-[#ff6f7b] to-[#ff5364] font-bold text-sm text-white shadow-[0_10px_25px_rgba(255,83,100,0.2)] hover:opacity-90 transition-all duration-300">
            Tiếp theo
          </button>
        </div>

      </div>
    </div>
  );
}

export default NewsPage;