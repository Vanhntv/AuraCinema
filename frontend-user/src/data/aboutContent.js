export const aboutContent = {
  page: {
    eyebrow: 'Giới thiệu trung tâm',
    title: 'Trung tâm Chiếu phim Quốc gia',
    description:
      'Giao diện tab một trang cho phần giới thiệu, dịch vụ và phòng chiếu - được tách dữ liệu riêng để dễ bảo trì và mở rộng.',
  },
  sections: {
    introOverview: 'Tổng quan',
    orgChart: 'Sơ đồ tổ chức',
    introImages: 'Hình ảnh minh họa',
    serviceImagesHint: 'Lưới ảnh tự co giãn từ 2 đến 3 cột trên desktop và 1 cột trên mobile.',
    theaterSpace: 'Không gian phòng chiếu',
  },
  tabs: [
    { id: 'intro', label: 'Giới thiệu' },
    { id: 'services', label: 'Dịch vụ' },
    { id: 'theaters', label: 'Phòng chiếu' },
  ],
  intro: {
    legal: {
      title: 'Thông tin pháp lý',
      foundedLabel: 'Ngày thành lập',
      foundedValue: '01/05/2026',
      headquartersLabel: 'Trụ sở',
      headquartersValue: '87 Láng Hạ, quận Ba Đình, Hà Nội',
      contactLabel: 'Liên hệ',
      contactValue: '1900 1234 · support@auracinema.vn',
    },
    summary:
      'Trung tâm Chiếu phim Quốc gia (NCC) là điểm đến điện ảnh phục vụ cả hoạt động chiếu phim thương mại lẫn các chương trình chuyên đề, sự kiện văn hóa và giao lưu điện ảnh.',
    chartNote:
      'Sơ đồ tổ chức dưới đây được dựng bằng HTML/CSS để hiển thị sắc nét khi phóng to và phù hợp với nhiều kích thước màn hình.',
    organizationChart: [
      {
        title: 'Bộ Văn hóa, Thể thao và Du lịch',
        subtitle: 'Cơ quan quản lý trực tiếp',
        children: [
          {
            title: 'Trung tâm Chiếu phim Quốc gia',
            subtitle: 'Đơn vị vận hành NCC',
            children: [
              { title: 'Khối quản lý', subtitle: 'Kế hoạch, nhân sự, tài chính' },
              { title: 'Khối vận hành', subtitle: 'Phòng chiếu, dịch vụ, kỹ thuật' },
              { title: 'Khối truyền thông', subtitle: 'Sự kiện, đối ngoại, nội dung' },
            ],
          },
        ],
      },
    ],
    imageGrid: [
      {
        src: 'https://lh7-us.googleusercontent.com/Mz5kIXCYkEiG0zYnJs0L5mv74idxK6zV3ysyiEXhOVr2h4R1d0cbUlBYPlZkroKsogM-Tt3YXrvI5HfjfjBj7c3pGoV08dHaBRnr7TJuQBif-M-V0m0baLB9u6tYHFcuD9TaHgnJcyLu1mjxE_96tE4',
        alt: 'Khu vực sảnh chiếu phim',
      },
      {
        src: 'https://kenh14cdn.com/203336854389633024/2026/7/2/photo-1-17829859402131407619815-1782987410276-17829874106091613598637.jpg',
        alt: 'Không gian tiếp đón khách',
      },
      {
        src: 'https://kenh14cdn.com/203336854389633024/2026/7/2/photo-3-17829859413411364790921-1782987412212-17829874125202037857554.jpg',
        alt: 'Khán phòng hiện đại',
      },
    ],
  },
  services: {
    groups: [
      {
        title: 'Hoạt động điện ảnh',
        description:
          'Chiếu phim chính trị, liên hoan phim, chiếu phim thương mại và các suất phim chuyên đề theo chiến dịch.',
        images: [
          {
            src: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=900&auto=format&fit=crop&q=80',
            alt: 'Suất chiếu phim chuyên đề',
          },
          {
            src: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=900&auto=format&fit=crop&q=80',
            alt: 'Phim ảnh và ghế ngồi',
          },
        ],
      },
      {
        title: 'Biểu diễn nghệ thuật',
        description:
          'Tổ chức chương trình sân khấu, biểu diễn giao lưu, ra mắt tác phẩm và sự kiện nghệ thuật quy mô vừa và lớn.',
        images: [
          {
            src: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&auto=format&fit=crop&q=80',
            alt: 'Biểu diễn sân khấu',
          },
          {
            src: 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=900&auto=format&fit=crop&q=80',
            alt: 'Ánh sáng biểu diễn',
          },
        ],
      },
      {
        title: 'Dịch vụ khác',
        description:
          'Tổ chức sự kiện, ẩm thực, quảng cáo, tài trợ và các dịch vụ đồng hành phục vụ trải nghiệm khách hàng.',
        images: [
          {
            src: 'https://cdn2.tuoitre.vn/thumb_w/730/471584752817336320/2025/2/24/47467145310740181014316265098115959557848393n-1740414827578724216679.jpeg',
            alt: 'Dịch vụ ẩm thực',
          },
          {
            src: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=900&auto=format&fit=crop&q=80',
            alt: 'Không gian sự kiện',
          },
        ],
      },
    ],
  },
  theaters: {
    metrics: [
      { label: 'Phòng chiếu', value: '14', note: '2D và 3D' },
      { label: 'Chỗ ngồi', value: '2.365', note: 'Tổng sức chứa' },
      { label: 'Suất chiếu / ngày', value: '60+', note: 'Công suất vận hành' },
    ],
    building: {
      title: 'Khối nhà 5 tầng dành cho sự kiện',
      description:
        'Khu vực này phục vụ hội nghị, sự kiện và chương trình sân khấu quy mô lớn, tích hợp sảnh chờ và không gian tổ chức linh hoạt.',
      starHall: {
        title: 'Nhà hát Ngôi Sao',
        upgradeDate: '20/05/2025',
        capacity: 'Hơn 300 chỗ',
        note: 'Không gian biểu diễn được nâng cấp đồng bộ về âm thanh, ánh sáng và trải nghiệm khán giả.',
      },
    },
    spaceNote:
      'Hệ thống phòng chiếu được bố trí theo nhiều nhóm công năng để phục vụ suất chiếu thường xuyên, sự kiện và hoạt động đặc biệt.',
    imageGrid: [
      {
        src: 'https://images.unsplash.com/photo-1513279922550-250c2129b13a?w=900&auto=format&fit=crop&q=80',
        alt: 'Mặt tiền phòng chiếu',
      },
      {
        src: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=902&auto=format&fit=crop&q=80',
        alt: 'Sảnh chờ trung tâm',
      },
      {
        src: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900&auto=format&fit=crop&q=80',
        alt: 'Khán phòng lớn',
      },
    ],
  },
};
