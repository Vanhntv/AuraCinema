# Checklist Code Review cho du an website dat ve xem phim

Tai lieu nay dung de danh gia chat luong code, thiet lap quy trinh Code Review va dinh huong lam viec cho team phat trien website dat ve xem phim AuraCinema.

## 1. Tieu chi danh gia mot doan code tot

### 1.1. Dung yeu cau nghiep vu

- Code giai quyet dung yeu cau trong task, khong lam thieu va khong tu y mo rong ngoai pham vi.
- Luong dat ve phai ro rang: chon phim, chon rap, chon suat chieu, chon ghe, ap dung voucher, thanh toan, tao ve.
- Trang thai nghiep vu phai nhat quan, vi du: `available`, `held`, `booked`, `cancelled`, `expired`.
- Khong cho dat ghe da duoc giu hoac da ban.
- Gia ve, phu thu loai ghe, voucher, tong tien phai duoc tinh o backend, khong tin vao du lieu frontend gui len.
- Cac dieu kien thoi gian phai dung: khong cho dat suat chieu da qua gio, voucher het han, phim da ngung chieu.

### 1.2. De doc va de bao tri

- Ten bien, ten ham, ten component, ten API ro nghia va thong nhat.
- Moi ham/component chi nen lam mot nhiem vu chinh.
- Tach logic nghiep vu khoi UI khi co the: UI hien thi, service xu ly goi API, backend xu ly validation va business rule.
- Tranh lap code. Neu lap lai nhieu hon 2-3 lan, can can nhac tach helper, hook, service hoac component dung chung.
- Khong viet ham qua dai. Neu mot ham can doc tu tren xuong duoi moi hieu, nen tach thanh cac buoc nho hon.
- Comment chi dung de giai thich ly do hoac logic phuc tap, khong comment lai dieu code da noi ro.

### 1.3. Kien truc va tach trach nhiem

- Frontend khong chua logic bao mat hoac logic quyet dinh tien/ghe cuoi cung.
- Backend nen tach ro route, controller, service, model, middleware.
- Model du lieu can co constraint phu hop: unique, required, index, enum, default value.
- API response nen co format thong nhat, vi du:

```json
{
  "success": true,
  "message": "Booking created",
  "data": {}
}
```

- Loi nghiep vu va loi he thong can duoc phan biet ro.
- Khong de logic quan trong nam rai rac o nhieu noi khac nhau.

### 1.4. Bao mat

- Mat khau phai duoc hash, khong luu plain text.
- Khong commit file `.env`, token, secret key, payment key, database URI.
- API quan tri phai co xac thuc va phan quyen.
- User chi duoc xem/sua thong tin cua chinh minh, tru khi la admin.
- Validate input o backend cho tat ca API: body, params, query.
- Chong cac loi pho bien: XSS, NoSQL injection, brute force login, upload file nguy hiem.
- CORS phai cau hinh theo domain can thiet, khong mo rong tuy tien tren production.
- Thanh toan phai co co che verify tu payment provider, khong chi dua vao ket qua frontend.

### 1.5. Tinh dung dan khi nhieu nguoi dat ve cung luc

- Chon ghe va thanh toan la khu vuc rui ro cao, can review ky.
- Backend phai co co che tranh double-booking: transaction, atomic update, unique constraint hoac locking.
- Ghe dang giu can co thoi gian het han.
- Khi thanh toan that bai hoac qua han, ghe phai duoc tra ve trang thai co the dat.
- Khi thanh toan thanh cong, trang thai booking va ghe phai duoc cap nhat cung nhau.
- Khong duoc de trang thai nua chua: da tru tien nhung chua tao ve, hoac da tao ve nhung ghe van available.

### 1.6. Hieu nang

- API danh sach phim, suat chieu, ghe khong duoc query lap vo ly trong vong lap.
- Cac truong hay loc/tim kiem nen co index: movie, cinema, showtime, room, booking, user, status.
- Frontend khong render lai toan bo trang khi chi thay doi mot phan nho.
- Anh poster/banner nen toi uu dung kich thuoc va lazy load neu can.
- Khong load tat ca du lieu neu chi can phan trang hoac filter.
- Khong goi API lien tuc khi user nhap lieu ma khong debounce.

### 1.7. Trai nghiem nguoi dung

- UI chon ghe phai phan biet ro ghe trong, ghe dang chon, ghe da ban, ghe dang giu, ghe khong kha dung.
- Loi phai hien thi de hieu: voucher khong hop le, ghe vua co nguoi dat, thanh toan that bai.
- Form can co validation tu som: email, so dien thoai, so luong ghe, ma voucher.
- Trang phai co loading, empty state va error state.
- Flow dat ve khong duoc mat du lieu khi user quay lai buoc truoc.
- Sau khi dat ve thanh cong, user can thay thong tin ve: phim, rap, phong, ghe, gio chieu, ma ve, tong tien.

### 1.8. Test

- Logic tinh gia ve, voucher, trang thai ghe va booking can co test rieng.
- API quan trong can co test cho ca truong hop thanh cong va that bai.
- Can test cac case canh tranh: hai user dat cung mot ghe, giu ghe qua han, thanh toan that bai.
- Frontend nen test cac component quan trong: seat map, booking summary, login/register, admin form.
- Moi bug nghiem trong sau khi fix nen co test de tranh lap lai.

### 1.9. Chat luong Git va PR

- Commit nho, co y nghia, khong gom qua nhieu thay doi khong lien quan.
- PR nen co mo ta ngan gon: lam gi, vi sao, cach test.
- Khong dua file sinh ra tu build, cache, `node_modules`, log vao PR.
- Khong sua format toan bo file neu task chi can sua mot doan nho.
- Khong tron refactor lon voi thay doi nghiep vu trong cung mot PR.

## 2. Checklist nhanh khi review code

Dung checklist nay truoc khi approve PR.

### 2.1. Tong quan

- [ ] PR co mo ta ro muc tieu va pham vi.
- [ ] Thay doi dung voi ticket/task.
- [ ] Khong co thay doi ngoai pham vi.
- [ ] Code khong lam hong flow hien co.
- [ ] Ten file, ten function, ten component de hieu.

### 2.2. Frontend React

- [ ] Component co trach nhiem ro rang.
- [ ] State duoc dat o dung cap, khong day state qua nhieu tang neu khong can.
- [ ] Goi API duoc tach vao service/helper khi hop ly.
- [ ] Co xu ly loading, error, empty state.
- [ ] Form co validation va thong bao loi than thien.
- [ ] Khong co hard-code URL backend neu du an da dung bien moi truong.
- [ ] Khong render danh sach bang key khong on dinh neu co id.
- [ ] UI responsive tren desktop va mobile.

### 2.3. Backend Express/Mongoose

- [ ] API validate day du `params`, `query`, `body`.
- [ ] Controller khong qua day logic, business rule nen nam trong service.
- [ ] Query MongoDB co dieu kien loc ro rang, khong lay qua nhieu du lieu.
- [ ] Co phan quyen cho API can bao ve.
- [ ] Loi duoc tra ve dung HTTP status code.
- [ ] Khong expose stack trace hoac thong tin nhay cam cho client.
- [ ] Schema co required, enum, default, unique/index khi can.
- [ ] Cac thao tac lien quan booking/payment co xu ly tinh nhat quan du lieu.

### 2.4. Database va du lieu

- [ ] Quan he giua movie, cinema, room, seat, showtime, booking ro rang.
- [ ] Co constraint de tranh trung suat chieu/ghe/booking khong hop le.
- [ ] Soft delete neu dung thi moi query can loc ban ghi da xoa.
- [ ] Ngay gio duoc luu va xu ly thong nhat.
- [ ] Cac truong tien te khong bi loi lam tron tuy tien.

### 2.5. Bao mat va thanh toan

- [ ] Mat khau/token/secret khong xuat hien trong code.
- [ ] API admin co middleware auth va role.
- [ ] Backend tu tinh tong tien, khong tin `totalPrice` tu client.
- [ ] Payment callback/webhook duoc verify.
- [ ] Booking khong the thanh toan lai nhieu lan neu da thanh cong.
- [ ] User khong the xem booking cua user khac.

### 2.6. Test va kiem tra

- [ ] Da chay lint/build/test phu hop.
- [ ] Co test cho logic moi hoac logic rui ro.
- [ ] Da test manual flow chinh.
- [ ] Da test truong hop loi quan trong.
- [ ] Khong co console log/debugger con sot lai.

## 3. Quy trinh Code Review hieu qua cho team

### 3.1. Nguyen tac chung

- Review de tang chat luong san pham, khong phai de bat loi ca nhan.
- Reviewer tap trung vao bug, bao mat, maintainability, nghiep vu va rui ro production.
- Author co trach nhiem tu review code cua minh truoc khi tao PR.
- Comment can cu the, co ly do va neu duoc thi goi y cach sua.
- Khong tranh luan dai tren PR neu van de lon; hen trao doi nhanh, sau do ghi lai ket luan vao PR.

### 3.2. Quy trinh de xuat

1. Tao branch rieng cho moi task.
2. Code theo pham vi task, commit nho va ro y.
3. Tu chay lint/build/test truoc khi tao PR.
4. Tao PR voi mo ta:
   - Muc tieu thay doi.
   - Man hinh/API bi anh huong.
   - Cach test.
   - Anh chup man hinh neu thay doi UI.
   - Rui ro hoac diem can reviewer xem ky.
5. Gan it nhat 1 reviewer cho task nho, 2 reviewer cho task lien quan booking/payment/auth.
6. Reviewer doc theo thu tu:
   - Hieu muc tieu PR.
   - Xem data flow va business rule.
   - Xem security va error handling.
   - Xem test.
   - Xem style va clean code sau cung.
7. Author phan hoi tung comment: sua, giai thich, hoac tao task rieng neu nam ngoai scope.
8. PR chi merge khi build pass, comment quan trong da xu ly va reviewer approve.

### 3.3. Tieu chuan approve

Chi approve khi:

- Code dung yeu cau nghiep vu.
- Khong thay ro bug nghiem trong.
- Khong tao lo hong bao mat.
- Khong pha vo flow dat ve, thanh toan, dang nhap, admin.
- Co cach test ro rang.
- Code du de bao tri sau nay.

Nen request changes khi:

- Co bug co the gay sai tien, sai ghe, sai ve.
- Co rui ro mat du lieu hoac double-booking.
- Co API thieu auth/role.
- Co logic tin vao du lieu tu client trong cac quyet dinh quan trong.
- Code qua kho hieu hoac copy-paste nhieu.
- PR khong the build/chay.

### 3.4. Muc do uu tien comment

Nen gan muc do uu tien de tranh lam PR bi roi:

- `Blocker`: Phai sua truoc khi merge. Vi du: double-booking, sai tien, leak secret.
- `Major`: Nen sua trong PR nay. Vi du: thieu validation, query qua rong, loi phan quyen.
- `Minor`: Co the sua nhanh. Vi du: ten bien chua ro, tach ham nho.
- `Suggestion`: Goi y cai thien, khong bat buoc.

### 3.5. Mau PR description

```md
## Muc tieu
- ...

## Thay doi chinh
- ...

## Man hinh/API bi anh huong
- ...

## Cach test
- [ ] npm run lint
- [ ] npm run build
- [ ] Test manual: ...

## Rui ro can review ky
- ...

## Screenshot/Video
- ...
```

### 3.6. Mau comment review tot

Comment chua tot:

```md
Code nay sai, sua lai di.
```

Comment tot:

```md
Doan nay dang tin vao `totalPrice` tu client. Trong flow dat ve, client co the sua gia truoc khi gui request. Nen tinh lai tong tien o backend dua tren showtime, seat type va voucher de tranh sai tien.
```

## 4. Dinh huong toi uu hoa cho team lap trinh AuraCinema

### 4.1. Uu tien kien truc booking truoc UI phuc tap

Website dat ve xem phim co rui ro lon nhat o tinh dung dan cua booking. Team nen uu tien lam chac cac phan sau:

- Trang thai ghe theo suat chieu.
- Giu ghe tam thoi co het han.
- Chong hai user dat cung mot ghe.
- Xac nhan thanh toan an toan.
- Tao ve sau khi thanh toan thanh cong.
- Huy/het han booking phai tra ghe dung cach.

UI dep nhung booking sai thi san pham khong the van hanh.

### 4.2. Thiet ke backend la nguon su that

Backend phai la noi quyet dinh cuoi cung cho:

- Ghe co con dat duoc khong.
- Gia ve cuoi cung.
- Voucher co hop le khong.
- User co quyen thuc hien hanh dong khong.
- Booking co duoc thanh toan/huy/hoan tat khong.

Frontend chi nen hien thi va gui y dinh cua user, khong nen nam quyen quyet dinh cac thong tin quan trong.

### 4.3. Chuan hoa API som

Team nen thong nhat som:

- Format response thanh cong/that bai.
- Cach dat ten route.
- Cach tra validation error.
- Cach phan trang, filter, sort.
- Cach xu ly auth token.
- Cach log loi backend.

Neu API khong thong nhat, frontend se phai xu ly nhieu ngoai le va code se nhanh roi.

### 4.4. Them test cho vung rui ro cao

Khong can test tat ca ngay tu dau, nhung can bat buoc test cac logic sau:

- Tinh tong tien ve.
- Ap dung voucher.
- Chuyen trang thai ghe.
- Tao booking.
- Payment callback/webhook.
- Auth va role admin/user.

Day la cac noi neu sai se anh huong truc tiep den doanh thu, du lieu va niem tin nguoi dung.

### 4.5. Chia task theo chieu doc tinh nang

Nen chia task theo feature hoan chinh thay vi chia qua thuan ky thuat.

Vi du nen chia:

- User xem danh sach phim.
- User chon suat chieu.
- User chon ghe.
- User dat ve.
- Admin quan ly phim.
- Admin quan ly suat chieu.

Khong nen chia qua chung chung:

- Lam database.
- Lam frontend.
- Lam backend.

Chia theo feature giup review de hon, test de hon va moi PR co gia tri ro rang.

### 4.6. Duy tri chat luong code bang cong cu

Team nen cai va bat buoc chay:

- ESLint cho frontend va backend.
- Formatter thong nhat, vi du Prettier.
- Script build cho frontend.
- Script start/dev cho backend.
- Environment example, vi du `.env.example`.
- Git ignore day du cho `node_modules`, build output, log, `.env`.

Khi co CI/CD, nen bat buoc lint/build/test pass truoc khi merge.

### 4.7. Nguyen tac lam viec cho team

- Moi PR nho nhat co the nhung van hoan thanh mot muc tieu ro.
- Khong merge code khi chua tu test.
- Khong day viec kiem tra co ban cho reviewer.
- Khong tranh luan style neu team da co convention.
- Bat dau bang giai phap don gian, chi them abstraction khi co nhu cau that.
- Uu tien sua bug nghiep vu va bao mat truoc toi uu giao dien.
- Sau moi loi production nghiem trong, them checklist hoac test de loi do khong lap lai.

## 5. Checklist rieng cho cac tinh nang chinh

### 5.1. Dang ky, dang nhap, phan quyen

- [ ] Password duoc hash.
- [ ] Token co thoi han.
- [ ] API admin can role admin.
- [ ] User khong xem/sua du lieu user khac.
- [ ] Loi dang nhap khong tiet lo qua nhieu thong tin.

### 5.2. Quan ly phim

- [ ] Thong tin phim co validation.
- [ ] Poster/banner co kiem tra dinh dang va kich thuoc neu upload file.
- [ ] Trang thai phim ro rang: sap chieu, dang chieu, ngung chieu.
- [ ] Khong xoa cung phim da co booking neu can giu lich su.

### 5.3. Quan ly rap, phong, ghe

- [ ] Phong thuoc dung rap.
- [ ] Ghe khong bi trung hang/so trong cung phong.
- [ ] Capacity khop voi so ghe thuc te.
- [ ] Ghe bi vo hieu hoa khong duoc ban trong suat chieu moi.

### 5.4. Quan ly suat chieu

- [ ] Khong tao suat chieu trung phong va trung thoi gian.
- [ ] Gio ket thuc phai sau gio bat dau.
- [ ] Gia co validate va khong am.
- [ ] Khong sua/xoa tuy tien suat chieu da co booking.

### 5.5. Dat ve

- [ ] Khong dat ghe da ban.
- [ ] Khong dat suat chieu da qua.
- [ ] Tong tien tinh o backend.
- [ ] Booking co ma dinh danh ro rang.
- [ ] Loi khi ghe vua bi user khac dat duoc xu ly than thien.

### 5.6. Voucher

- [ ] Voucher con han.
- [ ] Voucher con so luong.
- [ ] Don hang dat gia tri toi thieu.
- [ ] Giam gia khong vuot qua tong tien.
- [ ] Mot voucher khong bi dung qua gioi han cho phep.

### 5.7. Thanh toan

- [ ] Co trang thai thanh toan ro rang: pending, paid, failed, expired, refunded.
- [ ] Callback/webhook duoc verify.
- [ ] Xu ly idempotency: payment callback gui nhieu lan khong tao nhieu ve.
- [ ] Sau thanh toan thanh cong, booking va ghe cap nhat nhat quan.
- [ ] Log du thong tin de doi soat nhung khong log secret.

## 6. Ket luan

Mot doan code tot khong chi la code chay duoc. Voi website dat ve xem phim, code tot phai dung nghiep vu, an toan, de bao tri, tranh double-booking, tinh tien chinh xac va cho phep team mo rong tinh nang ma khong lam vo he thong.

Quy trinh Code Review hieu qua can duoc xem la mot phan cua qua trinh phat trien, khong phai buoc hinh thuc truoc khi merge. Neu team duy tri PR nho, checklist ro, test cho vung rui ro cao va review tap trung vao chat luong san pham, du an se on dinh hon va de phat trien lau dai hon.
