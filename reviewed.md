# Bao cao review va dinh huong toi uu du an AuraCinema

Tai lieu nay ghi lai ket qua review code dua tren checklist trong `review.md`. Muc tieu la giup team nhin ro hien trang, rui ro chinh va thu tu uu tien can xu ly cho website dat ve xem phim.

## 1. Tong quan danh gia

Du an AuraCinema da co nen tang chinh cho website dat ve xem phim:

- Backend Express/Mongoose.
- Frontend admin React/Vite.
- Frontend user React/Vite.
- Cac module quan trong: phim, rap, phong, ghe, suat chieu, showtime seats, voucher, booking, auth.

Trang thai hien tai phu hop muc prototype/MVP. Tuy nhien, du an chua nen dua len production neu chua xu ly cac rui ro ve phan quyen, giu ghe, booking, thanh toan va test.

Danh gia tong quan:

- Kien truc tong the: kha ro module, co tach frontend/backend.
- Nghiep vu dat ve: da co luong co ban nhung chua du an toan.
- Bao mat: con rui ro cao do nhieu API admin chua duoc bao ve.
- Chat luong frontend: build duoc, nhung lint con loi.
- Test: gan nhu chua co test tu dong cho cac vung rui ro cao.
- Muc san sang production: chua dat.

## 2. Diem tot da co

### 2.1. Backend co cau truc module ro

Backend da tach thanh:

- `router`
- `controllers`
- `models`
- `services`
- `repositories`
- `middleware`
- `utils`

Day la huong di tot, giup team de mo rong va de review hon so voi viec gom toan bo logic vao mot file.

### 2.2. Da co auth middleware va role middleware

Du an da co:

- `authMiddleware`
- `authorizeRoles`
- JWT token
- Phan biet user/admin

Day la nen tang can thiet. Van de hien tai khong phai la thieu co che, ma la chua ap dung day du cho tat ca API can bao ve.

### 2.3. Booking da dung transaction o buoc chuyen ghe

Trong `createBooking`, backend da dung MongoDB session/transaction de:

- Kiem tra user.
- Kiem tra showtime.
- Kiem tra ghe dang held boi user.
- Chuyen ghe sang booked.
- Tao booking.

Day la diem tot vi booking la vung co rui ro cao nhat cua san pham dat ve.

### 2.4. Co unique index cho ghe theo suat chieu

Model `ShowtimeSeat` co unique index theo:

- `showtime_id`
- `seat_id`
- `deleted_at: null`

Dieu nay giup tranh tao trung ghe trong cung mot suat chieu.

### 2.5. Frontend user da co flow dat ve co ban

Frontend user da co:

- Chon ngay.
- Chon suat chieu.
- Tai so do ghe.
- Giu ghe.
- Countdown thoi gian giu ghe.
- Xac nhan booking.
- Hien thi loading/error state.

Flow nay dung huong va co the tiep tuc hoan thien.

## 3. Van de nghiem trong can xu ly truoc

### 3.1. Blocker: Nhieu API admin chua co phan quyen

Nhieu route quan tri dang cho phep tao/sua/xoa ma khong can token admin.

Cac nhom API can bao ve:

- Cinema
- Room
- Seat
- Seat type
- Showtime
- Showtime seat
- Trailer
- Dashboard stats

Rui ro:

- User bat ky co the goi API de tao/xoa rap, phong, ghe, suat chieu.
- Co the pha lich chieu, gia ve, trang thai ghe.
- Co the xem thong tin dashboard neu endpoint cong khai.
- Day la loi bao mat nghiem trong, phai sua truoc production.

Dinh huong sua:

- Tao middleware chung:

```js
const adminOnly = [authMiddleware, authorizeRoles("admin")];
```

- Ap dung cho tat ca route write:

```js
router.post("/", adminOnly, createResource);
router.put("/:id", adminOnly, updateResource);
router.delete("/:id", adminOnly, deleteResource);
```

- Voi dashboard, nen yeu cau admin:

```js
router.get("/stats", adminOnly, getDashboardStats);
```

### 3.2. Blocker: Giu ghe chua atomic

Ham giu ghe hien tai doc danh sach ghe truoc, sau do moi update. O buoc update, filter chi dua vao `_id`, khong filter lai `status` va `held_by`.

Rui ro:

- Hai user cung chon mot ghe gan nhu dong thoi.
- Ca hai request deu thay ghe available.
- Request sau co the ghi de `held_by` cua request truoc.
- User bi mat ghe ma frontend van nghi dang giu.

Dinh huong sua:

- Khi hold ghe, update phai co dieu kien atomic:

```js
{
  _id: { $in: showtime_seat_ids },
  showtime_id,
  deleted_at: null,
  $or: [
    { status: "available" },
    { status: "held", held_by: req.user.id }
  ]
}
```

- Sau update, phai kiem tra `modifiedCount` hoac doc lai so ghe duoc hold.
- Neu khong du so ghe, rollback/tra ve loi 409.
- Nen dung transaction neu hold nhieu ghe cung luc.

### 3.3. Major: Booking chua co payment flow

Hien tai booking duoc tao thanh cong va ghe chuyen sang `booked` ngay sau khi user bam xac nhan. Chua co cac trang thai thanh toan nhu:

- `pending`
- `paid`
- `failed`
- `expired`
- `refunded`

Rui ro:

- User co ve ma chua thanh toan.
- Khong co co che verify payment callback/webhook.
- Khong co idempotency neu payment provider gui callback nhieu lan.
- Kho doi soat giao dich.

Dinh huong sua:

- Tach booking va payment:
  - Khi user xac nhan: tao booking `pending`.
  - Giu ghe trong thoi gian thanh toan.
  - Khi webhook payment thanh cong: cap nhat booking `paid`, ghe `booked`.
  - Khi payment fail/expired: booking `failed/expired`, ghe tro lai `available`.

- Them model/payment fields:

```js
payment_status: "pending" | "paid" | "failed" | "expired" | "refunded"
payment_provider
payment_transaction_id
paid_at
expired_at
```

### 3.4. Major: Xoa/sua suat chieu co the anh huong booking da ton tai

Ham xoa showtime hien tai soft delete showtime va xoa showtime seats lien quan. Neu da co booking, booking van tham chieu den cac showtime seats do.

Rui ro:

- Mat lich su ghe cua ve da dat.
- User xem lai ve co the thieu du lieu.
- Admin vo tinh xoa suat chieu da ban ve.

Dinh huong sua:

- Truoc khi xoa/sua showtime, kiem tra booking lien quan.
- Neu da co booking confirmed/paid, khong cho xoa cung.
- Chuyen sang trang thai `cancelled` hoac `inactive` thay vi xoa.
- Giu nguyen du lieu showtime seats cho lich su ve.

### 3.5. Major: Validate gia ve chua chat

Khi tao/sua showtime, `base_price` va `seat_prices` duoc ep `Number(...)` nhung chua validate day du.

Rui ro:

- Gia am.
- Gia `NaN`.
- Gia sai lam anh huong tinh tien booking.

Dinh huong sua:

- Tao helper validate tien:

```js
const parseMoney = (value, fieldName) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throwBadRequest(`${fieldName} khong hop le`);
  }
  return amount;
};
```

- Dung chung cho:
  - `base_price`
  - `seat_prices.normal`
  - `seat_prices.vip`
  - `seat_prices.couple`
  - `voucher.discount_value`
  - `voucher.min_order`

### 3.6. Major: Voucher chua duoc tich hop vao booking

Backend co service verify voucher va consume quantity, nhung booking hien tai chi tinh tong tien tu ghe. Voucher chua nam trong transaction tao booking.

Rui ro:

- Voucher hop le nhung khong ap dung vao booking.
- Neu sau nay frontend tu tru tien, backend se khong phai nguon su that.
- Co the tru voucher nhung booking fail, hoac booking thanh cong nhung voucher khong tru.

Dinh huong sua:

- Booking API co the nhan `voucher_code`.
- Backend tinh subtotal tu ghe.
- Backend verify voucher theo subtotal.
- Backend tinh discount/final total.
- Consume voucher trong cung transaction tao booking/payment.
- Luu vao booking:

```js
subtotal
discount_amount
total_price
voucher_id
voucher_code
```

## 4. Van de chat luong code va cau hinh

### 4.1. Frontend build duoc nhung lint fail

Ket qua kiem tra:

- `frontend`: `npm run build` pass.
- `frontend-user`: `npm run build` pass.
- `frontend`: `npm run lint` fail voi 14 loi.
- `frontend-user`: `npm run lint` fail voi 3 loi.

Nhom loi chinh:

- Goi `setState` dong bo trong `useEffect`.
- Bien import/khai bao nhung khong dung.
- Mutate props/object dau vao, vi du sua truc tiep `apiErrors`.

Dinh huong sua:

- Xu ly het loi lint truoc khi merge.
- Doi cac logic derive state sang `useMemo` neu co the.
- Neu can set form data khi modal mo, can can nhac reset state qua handler mo modal hoac chap nhan rule config phu hop voi React version/team convention.
- Khong mutate props; tao object moi va truyen callback clear error.

### 4.2. Hard-code localhost va port

Mot so file con hard-code:

- `http://localhost:5001/api`
- port `5001`

Rui ro:

- Kho deploy staging/production.
- De sai API endpoint khi build.
- Dashboard service dang dung axios rieng, khong dung axios client chung.

Dinh huong sua:

- Backend dung:

```js
const PORT = process.env.PORT || 5001;
```

- Frontend dung thong nhat:

```js
import.meta.env.VITE_API_URL
```

- Tat ca service nen dung `axiosClient` chung de co token, baseURL va interceptor thong nhat.

### 4.3. CORS dang mo rong

Backend dang dung:

```js
app.use(cors());
```

Rui ro:

- Production cho phep moi origin goi API.
- Kho kiem soat nguon request.

Dinh huong sua:

- Dung bien moi truong:

```js
const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];
```

- Chi cho phep domain frontend/admin hop le tren production.

### 4.4. Chua co test cho vung rui ro cao

Hien tai chua thay test cho:

- Booking.
- Hold/release ghe.
- Double-booking.
- Voucher.
- Auth/role.
- Showtime conflict.

Dinh huong sua:

- Them test backend truoc, vi day la nguon su that.
- Uu tien test service/controller cho cac case:
  - Hai user hold cung ghe.
  - Booking ghe khong phai cua user.
  - Hold het han.
  - Tao booking thanh cong.
  - Voucher het han/het luot/khong dat min order.
  - Admin route khong co token phai tra 401/403.

## 5. Uu tien hanh dong de xuat

### Giai doan 1: Sua loi chan production

Muc tieu: dua du an ve trang thai an toan toi thieu.

- Bao ve tat ca API admin bang `authMiddleware` va `authorizeRoles("admin")`.
- Sua hold ghe thanh atomic.
- Khong cho xoa/sua showtime da co booking.
- Validate tien te day du.
- Chay lai lint va sua cac loi lint hien co.

### Giai doan 2: Lam chac nghiep vu booking

Muc tieu: tranh sai ghe, sai tien, sai ve.

- Thiet ke lai booking status va payment status.
- Them flow payment pending/paid/failed/expired.
- Them idempotency cho callback/webhook.
- Tich hop voucher vao booking transaction.
- Them expired job/endpoint de tra ghe khi booking qua han.

### Giai doan 3: Chuan hoa API va cau hinh

Muc tieu: de maintain va de deploy.

- Thong nhat response format.
- Thong nhat error handling middleware.
- Dung `PORT`, `CORS_ORIGIN`, `VITE_API_URL`.
- Bo route trung lap khong co `/api` neu khong can:
  - `/seat-types`
  - `/seats`
  - `/showtime-seats`
- Dung chung `axiosClient` cho tat ca service frontend.

### Giai doan 4: Bo sung test va CI

Muc tieu: tranh regression khi team phat trien tiep.

- Them test backend cho booking/voucher/auth.
- Them lint/build vao CI.
- Yeu cau PR pass CI truoc khi merge.
- Them checklist PR dua tren `review.md`.

## 6. Checklist can dat truoc khi deploy

- [ ] Tat ca API admin co auth va role admin.
- [ ] User khong the tao/sua/xoa du lieu quan tri.
- [ ] Hold ghe atomic, khong bi ghi de khi request dong thoi.
- [ ] Booking khong the dat ghe da booked/held boi user khac.
- [ ] Booking/payment co trang thai ro rang.
- [ ] Backend tinh tong tien, voucher va final total.
- [ ] Khong xoa showtime/seat lam hong booking da ton tai.
- [ ] Gia ve, voucher, quantity duoc validate.
- [ ] CORS cau hinh theo domain.
- [ ] Khong hard-code localhost trong production build.
- [ ] Frontend lint pass.
- [ ] Frontend build pass.
- [ ] Backend co test cho booking, voucher, auth.
- [ ] Khong commit `.env`, secret, token.

## 7. Dinh huong kien truc de phat trien lau dai

### 7.1. Backend la nguon su that

Moi quyet dinh quan trong phai nam o backend:

- Ghe co dat duoc khong.
- Gia ve bao nhieu.
- Voucher co hop le khong.
- User co quyen khong.
- Payment da thanh cong chua.

Frontend chi gui y dinh cua user, khong quyet dinh ket qua cuoi cung.

### 7.2. Tach service cho nghiep vu quan trong

Nen tach cac service rieng:

- `BookingService`
- `SeatHoldService`
- `PaymentService`
- `VoucherService`
- `ShowtimeService`

Controller chi nen:

- Doc request.
- Goi service.
- Tra response.

Business rule nen nam trong service de de test.

### 7.3. Quan ly trang thai booking/ghe ro rang

Trang thai ghe theo suat chieu nen thong nhat:

- `available`
- `held`
- `booked`
- `disabled`

Trang thai booking nen thong nhat:

- `pending`
- `confirmed`
- `cancelled`
- `expired`

Trang thai payment nen thong nhat:

- `pending`
- `paid`
- `failed`
- `refunded`

Khong nen dung mot truong status de dai dien qua nhieu y nghia.

### 7.4. Moi loi production phai sinh checklist/test moi

Neu gap loi nghiem trong, team nen:

- Ghi lai nguyen nhan.
- Them test de loi khong lap lai.
- Cap nhat `review.md` neu can.
- Cap nhat checklist PR.

Day la cach bien loi thanh nang luc cua team.

## 8. Ket luan

AuraCinema da co nen tang tot de tiep tuc phat trien, nhung hien tai chua dat muc an toan cho san pham dat ve that. Rui ro lon nhat nam o phan quyen API admin, atomic hold ghe, payment flow va bao toan du lieu booking.

Huong di toi uu la khong nen tiep tuc them nhieu UI moi ngay lap tuc. Team nen uu tien lam chac backend va nghiep vu dat ve truoc, sau do moi mo rong tinh nang. Khi booking, ghe, voucher, payment va auth da on dinh, cac phan frontend/admin se de phat trien va it tao loi nghiem trong hon.
