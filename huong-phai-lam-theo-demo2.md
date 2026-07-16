# Huong phai lam theo tieu chi demo2 va ket qua review

Tai lieu nay tong hop cac viec can lam cho AuraCinema dua tren:

- Tieu chi tinh nang trong `demo2.md`.
- Ket qua review va danh gia trong `reviewed.md`.

Muc tieu la bien cac nhan xet review thanh danh sach hanh dong ro rang, co thu tu uu tien va gan voi tung phan he cua website dat ve xem phim.

## 1. Thu tu uu tien tong the

### P0 - Bat buoc lam truoc khi tiep tuc mo rong tinh nang

Day la cac viec anh huong truc tiep den bao mat, dat ve, ghe va doanh thu.

- Bao ve toan bo API admin bang `authMiddleware` va `authorizeRoles("admin")`.
- Sua logic giu ghe thanh atomic de tranh hai user giu cung mot ghe.
- Thiet ke lai booking/payment status, khong tao ve confirmed khi chua thanh toan.
- Khong cho xoa/sua suat chieu da co booking.
- Validate gia ve, voucher, so luong va cac truong tien te.
- Sua cac loi lint dang ton tai o frontend va frontend-user.

### P1 - Lam sau khi P0 on dinh

Day la cac viec giup hoan thien flow dat ve theo demo2.

- Tich hop cong thanh toan: VNPAY, MoMo, ZaloPay hoac the ngan hang.
- Them e-ticket co QR code.
- Gui email xac nhan sau thanh toan thanh cong.
- Tich hop voucher vao transaction booking.
- Them lich su dat ve cho user.
- Them quan ly booking/invoice cho admin.
- Them dashboard doanh thu va ty le lap day phong chieu.

### P2 - Mo rong san pham

Day la cac viec giup san pham day du hon nhung khong nen uu tien truoc P0/P1.

- Them dang nhap Google/Facebook.
- Them danh gia/nhan xet phim.
- Them diem thuong va hang thanh vien.
- Them F&B combo va quan ly kho co ban.
- Them Staff Portal quet QR check-in.
- Them realtime qua WebSocket/SSE cho so do ghe.

## 2. Phan he User

### 2.1. Trang chu

Tieu chi trong demo2:

- Banner slide cac phim hot/sap chieu.
- Bo loc tim kiem nhanh theo ten phim, the loai, rap, ngay chieu.
- Danh sach phim chia tab phim dang chieu va phim sap chieu.

Huong phai lam:

- Chuan hoa API lay danh sach phim co filter:
  - `q`
  - `genre_id`
  - `cinema_id`
  - `date`
  - `status`
- Dam bao backend filter theo `deleted_at: null`.
- Them index cho cac truong hay loc:
  - movie title
  - movie status
  - genre
  - showtime date
  - cinema
- Frontend can co loading, empty state va error state cho tung khu vuc.
- Khong hard-code du lieu phim neu backend da co API.
- Banner nen lay tu phim dang chieu/sap chieu co poster/banner hop le.

Muc uu tien: P1.

### 2.2. Chi tiet phim

Tieu chi trong demo2:

- Thong tin dao dien, dien vien, thoi luong, do tuoi gioi han, tom tat.
- Trailer Youtube.
- Danh gia/nhan xet tu user.

Huong phai lam:

- Kiem tra model `Movie` da co du cac truong:
  - `title`
  - `poster`
  - `banner`
  - `description`
  - `duration`
  - `release_date`
  - `director`
  - `actors`
  - `language`
  - `country`
  - `age_limit`
  - `status`
- Trailer da co module rieng, can chuan hoa validate Youtube URL.
- Them API chi tiet phim tra kem:
  - thong tin phim
  - genres
  - trailers
  - showtimes sap toi
- Neu them review/rating:
  - Tao model `MovieReview`.
  - Chi user da mua ve phim do moi duoc danh gia.
  - Admin co quyen an/xoa review vi pham.

Muc uu tien:

- Thong tin phim/trailer: P1.
- Danh gia/nhan xet: P2.

## 3. Luong dat ve va thanh toan

Day la core flow quan trong nhat cua du an. Theo ket qua review, phan nay phai duoc lam chac truoc khi mo rong UI.

### 3.1. Chon suat chieu

Tieu chi trong demo2:

- Chon rap.
- Chon ngay.
- Chon suat chieu.
- Hien thi khung gio va dinh dang 2D/3D.

Huong phai lam:

- API showtime can support filter:
  - `movie_id`
  - `cinema_id`
  - `room_id`
  - `date`
- Chi tra cac suat chieu chua qua gio cho user.
- Them truong `format` cho showtime neu can ho tro 2D/3D/IMAX.
- Admin tao/sua showtime phai bi chan neu trung gio trong cung phong.
- Khong cho sua/xoa suat chieu da co booking paid/confirmed.
- Validate:
  - `start_time` hop le.
  - `end_time > start_time`.
  - `base_price >= 0`.
  - `seat_prices >= 0`.

Muc uu tien: P0 cho validate/chong trung lich, P1 cho format 2D/3D.

### 3.2. So do chon ghe

Tieu chi trong demo2:

- Hien thi man hinh, loi di.
- Phan biet ghe thuong, VIP, ghe doi.
- Trang thai ghe cap nhat realtime de tranh trung lap.

Huong phai lam:

- Sua hold ghe thanh atomic.
- Trang thai ghe nen thong nhat:
  - `available`
  - `held`
  - `booked`
  - `disabled`
- Khi user hold ghe:
  - Backend set `held_by`.
  - Backend set `hold_expires_at`.
  - Backend tra thoi gian het han.
- Khi hold het han:
  - Co job/cron hoac cleanup endpoint de tra ghe ve `available`.
  - Frontend countdown va bat user chon lai.
- Khi booking/payment thanh cong:
  - Ghe chuyen sang `booked`.
- Khi payment fail/expired:
  - Ghe chuyen ve `available`.
- De dat realtime:
  - Giai doan dau co the polling moi 5-10 giay.
  - Giai doan sau dung WebSocket/SSE de push thay doi ghe.
- UI can hien thi ro:
  - Ghe dang chon.
  - Ghe dang duoc nguoi khac giu.
  - Ghe da ban.
  - Ghe khong kha dung.

Muc uu tien:

- Atomic hold va cleanup het han: P0.
- Realtime WebSocket/SSE: P2.

### 3.3. Chon bap nuoc F&B

Tieu chi trong demo2:

- Cho phep mua kem combo bap nuoc.
- Admin quan ly combo, gia ban va ton kho co ban.

Huong phai lam:

- Tao model `FoodCombo`:
  - `name`
  - `description`
  - `image`
  - `price`
  - `stock_quantity`
  - `status`
  - `deleted_at`
- Tao model `BookingFoodItem` hoac luu items trong booking:
  - `combo_id`
  - `name_snapshot`
  - `price_snapshot`
  - `quantity`
  - `subtotal`
- Backend phai tinh tien F&B, khong tin tong tien tu frontend.
- Khi payment thanh cong moi tru ton kho.
- Neu payment fail/expired thi khong tru ton kho.
- Admin API F&B phai co role admin.

Muc uu tien: P2, sau khi booking/payment ghe da on dinh.

### 3.4. Thanh toan tich hop

Tieu chi trong demo2:

- Trang tom tat thong tin ve.
- Tong tien.
- Thoi gian giu ghe 5-10 phut.
- Tich hop VNPAY, MoMo, ZaloPay hoac the ngan hang.

Huong phai lam:

- Tach flow thanh 3 buoc:
  1. Hold ghe.
  2. Tao booking `pending`.
  3. Thanh toan va verify webhook.
- Booking nen co cac truong:

```js
booking_code
user_id
showtime_id
showtime_seat_ids
food_items
subtotal
discount_amount
total_price
status
payment_status
payment_provider
payment_transaction_id
paid_at
expired_at
```

- Backend phai tinh:
  - tien ghe
  - tien F&B
  - voucher discount
  - tong thanh toan
- Payment callback/webhook phai verify chu ky cua nha cung cap.
- Can idempotency:
  - Mot callback gui nhieu lan khong tao nhieu ve.
  - Mot booking da paid khong duoc paid lai.
- Neu qua han thanh toan:
  - booking `expired`
  - ghe tra ve `available`
  - voucher khong bi tru hoac duoc hoan neu da tru tam.

Muc uu tien: P0/P1.

### 3.5. Nhan ve dien tu E-ticket

Tieu chi trong demo2:

- Hien thi ma ve kem QR.
- Gui email xac nhan.

Huong phai lam:

- Chi tao e-ticket khi payment `paid`.
- Tao `ticket_code` duy nhat.
- Tao QR code chua:
  - `ticket_code`
  - booking id
  - checksum/signature de chong gia mao
- Trang ve dien tu hien:
  - phim
  - rap
  - phong
  - ghe
  - gio chieu
  - combo F&B neu co
  - tong tien
  - QR code
- Gui email xac nhan sau khi payment paid.
- Staff Portal quet QR se verify ticket tu backend, khong chi doc QR o client.

Muc uu tien: P1.

## 4. Tai khoan va ca nhan hoa

### 4.1. Dang nhap/Dang ky

Tieu chi trong demo2:

- Dang ky thuong.
- Dang nhap nhanh Google/Facebook.

Huong phai lam:

- Hien tai da co dang ky/dang nhap thuong.
- Can bo sung:
  - refresh token hoac co che het han token ro rang.
  - rate limit login de giam brute force.
  - validate phone/email chat hon.
  - khong expose loi he thong ra client.
- Google/Facebook login nen de P2.
- Neu lam OAuth:
  - Luu `provider`.
  - Luu `provider_user_id`.
  - Cho phep link account neu email trung.

Muc uu tien:

- Bao mat auth co ban: P1.
- Google/Facebook: P2.

### 4.2. Lich su dat ve

Tieu chi trong demo2:

- Xem lai ve da mua.
- Phan biet ve sap xem va ve da xem.

Huong phai lam:

- API `GET /api/bookings/my` da co nen tang.
- Can populate day du:
  - movie
  - cinema
  - room
  - seats
  - payment status
  - ticket code
- Phan loai:
  - `upcoming`: showtime start_time >= now.
  - `past`: showtime end_time < now.
  - `cancelled/refunded`.
- User chi duoc xem booking cua chinh minh.
- Khong xoa du lieu booking khi showtime/seat bi soft delete.

Muc uu tien: P1.

### 4.3. Diem thuong va voucher

Tieu chi trong demo2:

- Xem hang thanh vien.
- Xem diem tich luy.
- Ap dung ma giam gia khi thanh toan.

Huong phai lam:

- Tich hop voucher vao booking transaction truoc.
- Sau payment paid moi cong diem.
- Tao model `LoyaltyAccount` hoac them vao `User`:
  - `points`
  - `tier`
- Tao lich su diem:
  - `earn`
  - `redeem`
  - `adjust`
  - `expired`
- Voucher can co:
  - gioi han so luong.
  - thoi gian ap dung.
  - min order.
  - giam theo percent/fixed.
  - gioi han user neu can.

Muc uu tien:

- Voucher trong booking: P1.
- Diem thuong/hang thanh vien: P2.

## 5. Phan he Admin

### 5.1. Quan ly phim

Tieu chi trong demo2:

- Them/sua/xoa phim.
- Quan ly trang thai phim: sap chieu, dang chieu, ngung chieu.

Huong phai lam:

- Route write cua movie da co admin middleware, tiep tuc giu.
- Can validate:
  - title required.
  - duration > 0.
  - age_limit hop le.
  - status nam trong enum.
  - poster/banner URL hop le neu dung URL.
- Khong hard delete phim da co showtime/booking.
- Nen chuyen sang soft delete hoac status `ended`.

Muc uu tien: P1.

### 5.2. Quan ly rap va phong chieu

Tieu chi trong demo2:

- Quan ly cum rap.
- Quan ly phong chieu.
- Quan ly so luong ghe va cau hinh so do ghe.

Huong phai lam:

- Bao ve API cinema/room/seat bang admin role truoc.
- Validate:
  - room thuoc cinema ton tai.
  - seat khong trung hang/so trong cung phong.
  - capacity khop so ghe thuc te.
- Khong cho xoa room/cinema neu da co showtime/booking.
- Them UI cau hinh so do ghe:
  - tao theo hang/cot.
  - gan loai ghe.
  - vo hieu hoa ghe loi/khong dung.

Muc uu tien:

- Auth admin cho API: P0.
- UI cau hinh ghe nang cao: P1/P2.

### 5.3. Quan ly suat chieu

Tieu chi trong demo2:

- Sap xep lich chieu theo phim/phong.
- Canh bao/ngan chan trung gio trong cung phong.

Huong phai lam:

- Hien tai da co logic check conflict, can giu va test ky.
- Bo sung test cho:
  - tao showtime trung gio.
  - update showtime trung gio.
  - end_time <= start_time.
  - room khong ton tai.
- Bao ve API showtime bang admin role.
- Khong cho sua room/time/gia neu da co booking paid neu thay doi lam sai ve da ban.
- Neu can thay doi, tao chinh sach:
  - cancel showtime.
  - thong bao user.
  - hoan tien.

Muc uu tien: P0/P1.

### 5.4. Quan ly F&B

Tieu chi trong demo2:

- Them/sua combo bap nuoc.
- Quan ly gia ban.
- Quan ly ton kho co ban.

Huong phai lam:

- Them module backend:
  - model
  - router
  - controller
  - service
  - admin middleware
- Them UI admin CRUD combo.
- Tich hop vao booking summary.
- Tru kho sau payment paid.
- Khong cho order neu combo inactive/het hang.

Muc uu tien: P2.

## 6. Quan ly van hanh va giao dich

### 6.1. Quan ly booking/invoice

Tieu chi trong demo2:

- Tim kiem va tra cuu giao dich khach hang.
- Ho tro hoan tien/huy ve neu can.

Huong phai lam:

- Them admin API:
  - list bookings.
  - detail booking.
  - filter theo user, email, phone, booking_code, status, date.
  - cancel booking.
  - refund booking.
- Tat ca API nay phai admin/staff role.
- Booking can luu snapshot thong tin tai thoi diem mua:
  - movie title.
  - cinema name.
  - room name.
  - seats.
  - price.
- Refund phai co rule:
  - chi refund booking paid.
  - khong refund sau gio chieu neu chinh sach khong cho.
  - goi payment provider neu co.

Muc uu tien: P1.

### 6.2. Staff Portal quet ve

Tieu chi trong demo2:

- Giao dien don gian de quet QR check-in tai cua phong chieu.

Huong phai lam:

- Them role `staff`.
- Them API verify ticket:

```txt
POST /api/staff/tickets/verify
POST /api/staff/tickets/check-in
```

- QR code khong nen chi chua booking id thuan. Nen co signed token/checksum.
- Check-in phai idempotent:
  - Quet lan dau: thanh cong.
  - Quet lai: bao ve da check-in luc nao.
- Staff chi duoc check-in ve dung ngay/suat chieu hop le.

Muc uu tien: P2.

### 6.3. Quan ly khuyen mai/voucher

Tieu chi trong demo2:

- Tao chien dich giam gia.
- Giam theo phan tram hoac so tien co dinh.
- Gioi han luot dung.
- Thoi han ap dung.

Huong phai lam:

- Module voucher da co nen tang.
- Can tich hop vao booking.
- Consume voucher phai nam trong transaction voi booking/payment.
- Them rule nang cao neu can:
  - gioi han moi user.
  - gioi han theo phim/rap/ngay.
  - gioi han tong ngan sach chien dich.
- Admin API voucher da co role admin, can tiep tuc test.

Muc uu tien: P1.

## 7. Dashboard va bao cao

Tieu chi trong demo2:

- Bieu do doanh thu theo ngay/tuan/thang.
- Bao cao ty le lap day phong chieu.

Huong phai lam:

- Dashboard API phai yeu cau admin role.
- Doanh thu chi tinh booking/payment `paid`.
- Khong tinh booking pending/failed/expired.
- Can API:
  - revenue by day/week/month.
  - booking count.
  - ticket count.
  - occupancy rate theo showtime/room/movie.
- Cong thuc ty le lap day:

```txt
occupancy_rate = booked_seats / total_available_seats
```

- Can filter:
  - date range.
  - cinema.
  - movie.
  - room.
- Frontend dashboard nen dung `axiosClient` chung thay vi hard-code URL.

Muc uu tien: P1.

## 8. Viec nen lam ve code quality va quy trinh

### 8.1. Sua lint va chuan hoa frontend

Huong phai lam:

- Sua 14 loi lint o frontend admin.
- Sua 3 loi lint o frontend user.
- Khong mutate props/object dau vao.
- Loai bo import khong dung.
- Chuan hoa cach load data trong `useEffect`.
- Tat ca service goi API dung axios client chung.

Muc uu tien: P0.

### 8.2. Chuan hoa cau hinh moi truong

Huong phai lam:

- Backend:

```js
const PORT = process.env.PORT || 5001;
```

- Frontend:

```js
import.meta.env.VITE_API_URL
```

- CORS:

```js
process.env.CORS_ORIGIN
```

- Tao `.env.example` cho backend/frontend/frontend-user.
- Dam bao `.env` khong duoc commit.

Muc uu tien: P1.

### 8.3. Them test cho vung rui ro cao

Huong phai lam:

- Test auth/admin route:
  - khong token -> 401.
  - user role -> 403.
  - admin role -> success.
- Test seat hold:
  - hold ghe available.
  - hai user hold cung ghe.
  - hold het han.
- Test booking:
  - booking ghe cua user dang hold.
  - booking ghe da booked fail.
  - booking tinh tong tien dung.
- Test voucher:
  - het han.
  - het quantity.
  - min order.
  - percent > 100 khong hop le.
- Test showtime:
  - trung gio trong cung phong.
  - end_time <= start_time.

Muc uu tien: P0/P1.

## 9. Lo trinh de xuat

### Sprint 1 - An toan va on dinh nen tang

- Khoa API admin.
- Sua atomic hold ghe.
- Sua lint.
- Validate tien/showtime/voucher.
- Them test auth va hold ghe.

Ket qua mong doi:

- User thuong khong the goi API admin.
- Khong con loi co ban lam sai ghe.
- Frontend lint pass.

### Sprint 2 - Booking va payment dung nghiep vu

- Thiet ke booking/payment status.
- Tao booking pending.
- Xu ly payment success/fail/expired.
- Tich hop voucher vao booking.
- Bao ve showtime da co booking.

Ket qua mong doi:

- Chi thanh toan thanh cong moi co ve.
- Voucher va tong tien do backend quyet dinh.
- Khong mat du lieu ve da ban.

### Sprint 3 - Hoan thien user flow theo demo2

- Lich su dat ve.
- E-ticket QR.
- Email xac nhan.
- Trang tom tat thanh toan.
- Loc phim/suat chieu tot hon.

Ket qua mong doi:

- User co flow dat ve gan day du.
- Sau thanh toan co ve dien tu ro rang.

### Sprint 4 - Admin van hanh va dashboard

- Booking/invoice management.
- Dashboard doanh thu.
- Ty le lap day phong chieu.
- Quan ly F&B neu can.

Ket qua mong doi:

- Admin co the van hanh va theo doi doanh thu.
- Co nen tang cho staff/check-in va bao cao.

### Sprint 5 - Mo rong san pham

- Staff Portal quet QR.
- F&B combo nang cao.
- Diem thuong/hang thanh vien.
- Google/Facebook login.
- Review/rating phim.
- Realtime WebSocket/SSE cho so do ghe.

Ket qua mong doi:

- San pham day du hon theo tieu chi demo2.
- Tang trai nghiem va gia tri van hanh.

## 10. Ket luan

Theo tieu chi trong `demo2.md`, AuraCinema da co nen tang cho cac module chinh nhung phan core flow dat ve va thanh toan chua du chat de dung production. Huong phai lam la uu tien backend va nghiep vu truoc UI mo rong:

1. Khoa quyen admin.
2. Lam chac hold ghe va booking.
3. Thiet ke payment dung chuan.
4. Tich hop voucher/tong tien o backend.
5. Them e-ticket, lich su ve va dashboard.
6. Sau do moi mo rong F&B, diem thuong, staff portal va realtime.

Neu lam dung thu tu nay, team se giam rui ro sai ghe, sai tien, sai ve va co nen tang tot de phat trien cac tinh nang trong demo2.
