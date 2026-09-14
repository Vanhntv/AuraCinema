# Hướng dẫn kiểm thử Quà tặng

## Tạo lại dữ liệu

MongoDB phải chạy dưới replica set và backend dùng đúng `.env`.

```bash
cd /Users/khong/AuraCinema/backend
npm run seed:gifts -- --apply
npm run dev
```

Lệnh seed có thể chạy lại. Nó chỉ xóa và tạo lại dữ liệu có tiền tố `TESTGIFT1` cùng bốn tài khoản `.test` bên dưới.

Mật khẩu chung: `AuraGift9!`

| Tài khoản | Điểm | Mục đích |
| --- | ---: | --- |
| `gift.ready@example.test` | 2.000 | Ví có đủ trạng thái, QR, quà điểm và voucher đã chuyển giao |
| `gift.member@example.test` | 250 | Đổi quà hợp lệ và kiểm tra chặn quà VIP |
| `gift.maxed@example.test` | 1.000 | Đã nhận đủ lượt của quà giới hạn |
| `gift.empty@example.test` | 0 | Kiểm tra không đủ điểm |

## 1. Danh mục đổi quà

1. Mở `http://localhost:5173/login` và đăng nhập bằng `gift.member@example.test`.
2. Vào **Thông tin cá nhân → Lịch sử điểm thưởng**.
3. Kiểm tra danh mục có vé, combo, vật phẩm, điểm và voucher.
4. Quà `[TEST GIFT] Vé dành cho VIP/VVIP` phải bị vô hiệu hóa và hiện lý do không đúng hạng.
5. Đổi `[TEST GIFT] Voucher giảm 20.000 đồng` với giá 50 điểm.
6. Xác nhận điểm giảm từ 250 xuống 200 và voucher mới xuất hiện trong **Ví ưu đãi → Voucher**.
7. Đăng nhập `gift.empty@example.test`; tất cả nút có giá điểm phải bị vô hiệu hóa.

Chạy lại seed để đưa điểm và ví về ban đầu sau khi thử đổi.

## 2. Ví ưu đãi và QR

1. Đăng nhập `gift.ready@example.test`.
2. Vào **Thông tin cá nhân → Ví ưu đãi → Quà tặng**.
3. Tab **Có thể sử dụng** có quà khả dụng và một quà đang giữ cho đơn.
4. Tab **Đã sử dụng** có quà đã dùng, quà điểm và quà voucher đã chuyển vào tài khoản.
5. Tab **Đã hết hạn** có một quà hết hạn.
6. Click quà vật phẩm hoặc combo dùng tại quầy; popup phải hiện ảnh, điều kiện, hạn dùng và QR lớn.
7. Click quà vé trực tuyến; popup không hiển thị QR tại quầy.

Số liệu ban đầu của tài khoản này: 10 mục ví, gồm 5 `available`, 1 `reserved`, 1 `used`, 2 `fulfilled` và 1 `expired`.

## 3. Giới hạn nhận và điều kiện

1. Đăng nhập `gift.maxed@example.test`.
2. Quà `[TEST GIFT] Giới hạn một lượt` phải hiện **Đã nhận đủ số lượt** và không thể đổi lại.
3. Trong trang admin, lọc mã bắt đầu bằng `TESTGIFT1` để kiểm tra chương trình đang chạy, tạm dừng, chưa bắt đầu, hết hạn và hết quà.
4. Các chương trình tự động thành viên mới, sinh nhật và đạt hạng được seed ở trạng thái **Tạm dừng**, tránh phát dữ liệu thử cho người dùng thật.

## 4. Admin cấp quà

1. Đăng nhập tài khoản admin và mở `http://localhost:5173/admin/gifts`.
2. Mở **Cấp quà cho thành viên**.
3. Chọn `[TEST GIFT] Quà admin cấp` và nhập `gift.member@example.test`.
4. Chọn **Xem trước**; kết quả phải có đúng 1 người nhận.
5. Xác nhận cấp rồi đăng nhập tài khoản Member để kiểm tra quà trong ví.
6. Thử cấp lại cùng chương trình; backend phải từ chối do giới hạn một lượt mỗi người.

## 5. Sử dụng trong đơn và tại quầy

1. Với `gift.ready@example.test`, chọn phim, suất chiếu và ghế phù hợp.
2. Ở tóm tắt đơn, chọn một quà vé hoặc combo trong **Quà dùng được**.
3. Kiểm tra ô voucher bị khóa vì một đơn không được dùng đồng thời quà và voucher.
4. Quà combo phải tự thêm đúng combo và giảm toàn bộ giá combo cấu hình.
5. Sau khi tạo đơn, quà chuyển sang **Đang giữ cho đơn**; thanh toán thành công chuyển sang **Đã sử dụng**.
6. Với QR vật phẩm/combo, mở trang quét của nhân viên, quét QR, kiểm tra thông tin rồi mới chọn **Xác nhận trao quà**.
7. Quét lại QR đã dùng phải bị từ chối.

## Đưa dữ liệu về trạng thái chuẩn

```bash
cd /Users/khong/AuraCinema/backend
npm run seed:gifts -- --apply
```
