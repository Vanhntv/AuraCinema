# Booking Seat Hold Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tích hợp phiên giữ ghế 5 phút và booking chờ thanh toán 10 phút với khôi phục sau tải lại, tự hết hạn và chống bán trùng ghế.

**Architecture:** `SeatHold` là nguồn sở hữu trong bước chọn ghế; `Booking` là nguồn sở hữu trong bước thanh toán. Một service vòng đời tập trung xử lý hết hạn và giải phóng tài nguyên, được gọi bởi endpoint và worker định kỳ; controller chỉ điều phối HTTP.

**Tech Stack:** Node.js, Express, Mongoose/MongoDB transactions, React 19, Axios, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-18-booking-seat-hold-lifecycle-design.md`

## Global Constraints

- Giữ ghế 5 phút cố định từ lần chọn đầu tiên; thao tác sau không gia hạn.
- Booking chờ thanh toán tối đa 10 phút.
- Tối đa 8 ghế, yêu cầu đăng nhập, một phiên active trên mỗi người dùng và suất chiếu.
- Backend là nguồn thời gian/trạng thái duy nhất; giữ polling 3 giây.
- Không chạy browser và không tạo commit.

---

### Task 1: SeatHold model và hàm thời gian thuần

**Files:**
- Create: `backend/src/models/SeatHold.js`
- Create: `backend/src/services/seatHoldPolicy.js`
- Modify: `backend/src/models/ShowtimeSeat.js`
- Modify: `backend/src/models/Booking.js`
- Modify: `backend/src/models/Payment.js`
- Test: `backend/test/seatHold.lifecycle.test.js`

**Interfaces:**
- Produces: `createSeatHoldExpiry(now)`, `createPaymentExpiry(now)`, `isExpired(expiresAt, now)` and Mongoose model `SeatHold`.

- [ ] Viết test thất bại chứng minh thời hạn giữ là 5 phút, thanh toán là 10 phút và `isExpired` xử lý đúng biên bằng các mốc thời gian literal.
- [ ] Chạy `cd backend && node --test test/seatHold.lifecycle.test.js`; xác nhận lỗi do module/hàm chưa tồn tại.
- [ ] Tạo policy thời gian; thêm schema/index và các enum/trường theo spec.
- [ ] Chạy lại test mục tiêu và xác nhận pass.

### Task 2: Service thu nhận, khôi phục và giải phóng SeatHold

**Files:**
- Create: `backend/src/services/seatHoldService.js`
- Modify: `backend/src/controllers/showtimeSeatsControllers.js`
- Modify: `backend/src/router/showtimeSeatsRouters.js`
- Test: `backend/test/seatHold.lifecycle.test.js`

**Interfaces:**
- Produces: `acquireSeatHold({ userId, showtimeId, seatIds, token, now, session })`, `getActiveSeatHold(...)`, `releaseSeatHold(...)`, `expireSeatHolds(...)`.
- API: `POST /showtime-seats/hold`, `GET /showtime-seats/hold/active`, `POST /showtime-seats/release`.

- [ ] Viết test thất bại cho: giới hạn 8 ghế; giữ mới; chọn thêm không gia hạn; token sai bị từ chối; cạnh tranh được hoàn tác; khôi phục phiên; hết hạn trả đúng ghế.
- [ ] Chạy file test mục tiêu và xác nhận từng lỗi xuất phát từ hành vi còn thiếu.
- [ ] Cài đặt service với cập nhật nguyên tử theo `hold_id`; controller trả token, danh sách ghế và expiry.
- [ ] Chạy lại file test và giữ toàn bộ test xanh.

### Task 3: Chuyển SeatHold thành booking chờ thanh toán

**Files:**
- Modify: `backend/src/controllers/bookingsControllers.js`
- Modify: `backend/test/booking.flow.test.js`
- Test: `backend/test/seatHold.lifecycle.test.js`

**Interfaces:**
- Consumes: SeatHold active và `createPaymentExpiry(now)`.
- Produces: booking có `seat_hold_id`, `payment_expires_at`; ghế `reserved_by_booking_id`; SeatHold `converted`.

- [ ] Viết test thất bại cho token bắt buộc, token của người khác, token hết hạn, danh sách ghế không khớp, và booking nhận deadline 10 phút.
- [ ] Chạy các test mục tiêu và xác nhận fail đúng nguyên nhân.
- [ ] Sửa `createBooking` để xác thực SeatHold và chuyển đổi trong transaction hiện có; giữ nguyên tính giá, voucher và combo.
- [ ] Chạy lại `booking.flow.test.js` và `seatHold.lifecycle.test.js`.

### Task 4: Hết hạn booking và callback thanh toán muộn

**Files:**
- Create: `backend/src/services/bookingExpiryService.js`
- Modify: `backend/src/controllers/bookingsControllers.js`
- Modify: `backend/src/controllers/paymentsControllers.js`
- Modify: `backend/src/controllers/sepayWebhookControllers.js`
- Modify: `backend/src/controllers/adminBookingsControllers.js`
- Test: `backend/test/booking.flow.test.js`

**Interfaces:**
- Produces: `expirePendingBooking({ booking, now, session })`, `expirePendingBookings({ now, limit })`, `assertBookingPayable(booking, now)`.
- Late success: booking `payment_status=refund_pending`, payment `status=review_required`, no ghế booked, no ticket issued.

- [ ] Viết test thất bại chứng minh booking hết hạn trả ghế/combo một lần và callback thành công muộn không phát hành vé.
- [ ] Chạy test mục tiêu và xác nhận fail đúng hành vi thiếu.
- [ ] Tập trung logic hoàn tài nguyên vào service idempotent; gọi service trước khi tạo URL, xác nhận payment và cập nhật admin.
- [ ] Ghi nhận late success để đối soát, giữ raw provider payload.
- [ ] Chạy lại test mục tiêu.

### Task 5: Worker quét mỗi 30 giây

**Files:**
- Create: `backend/src/services/bookingLifecycleWorker.js`
- Modify: `backend/src/server.js`
- Test: `backend/test/seatHold.lifecycle.test.js`

**Interfaces:**
- Produces: `startBookingLifecycleWorker({ intervalMs = 30000 })` trả hàm dừng worker; lần chạy gọi dọn SeatHold và booking hết hạn.

- [ ] Viết test thất bại bằng fake scheduler chứng minh worker gọi cả hai tác vụ và không chạy chồng lần quét.
- [ ] Chạy test mục tiêu, xác nhận fail do worker chưa tồn tại.
- [ ] Cài đặt worker có khóa `isRunning`, log lỗi nhưng không làm dừng server; khởi động sau `connectDB`.
- [ ] Chạy lại test mục tiêu.

### Task 6: Khôi phục phiên và đồng hồ frontend

**Files:**
- Modify: `frontend-user/src/services/showtimeSeatService.js`
- Modify: `frontend-user/src/components/BookingModal.jsx`
- Modify: `frontend-user/src/pages/PaymentPage.jsx`
- Create: `frontend-user/src/utils/bookingExpiry.js`
- Create: `frontend-user/src/utils/bookingExpiry.test.js`
- Modify: `frontend-user/package.json`

**Interfaces:**
- Produces: `getRemainingSeconds(expiresAt, now)`, `isBookingExpired(status, expiresAt, now)`; frontend gửi `hold_token` khi cập nhật hold và tạo booking.

- [ ] Viết test thất bại cho phép tính countdown tại biên và nhận diện `expired/refund_pending`.
- [ ] Chạy `cd frontend-user && node --test src/utils/bookingExpiry.test.js`; xác nhận fail do module chưa tồn tại.
- [ ] Cài utility, thêm test script, bổ sung API active hold và token vào booking UI.
- [ ] Khi tải ghế, khôi phục phiên; khi hết hạn chọn ghế chỉ xóa ghế, giữ combo/voucher; trang payment dùng `payment_expires_at` từ backend.
- [ ] Chạy frontend unit tests và build.

### Task 7: Hồi quy toàn hệ thống

**Files:**
- Test: `backend/test/*.test.js`
- Test: `frontend-user/src/**/*.test.js`

**Interfaces:**
- Verifies: API cũ không bán trùng ghế; thanh toán đúng hạn vẫn phát hành vé; frontend compile với payload mới.

- [ ] Chạy `cd backend && npm test`, sửa mọi hồi quy thuộc phạm vi thay đổi.
- [ ] Chạy `cd frontend-user && npm test`.
- [ ] Chạy `cd frontend-user && npm run build`.
- [ ] Đối chiếu từng tiêu chí chấp nhận trong spec với test tương ứng và kiểm tra `git diff --check`.

