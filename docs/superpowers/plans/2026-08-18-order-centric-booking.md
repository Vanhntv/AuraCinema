# Order-Centric Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển Booking thành điểm vào chính của nghiệp vụ vé, cấp QR đơn cho booking mới và cho phép admin quét một lần để in nguyên tử toàn bộ vé hợp lệ chưa từng in, trong khi check-in vẫn dùng QR từng ticket.

**Architecture:** `Booking` lưu snapshot giao dịch và order QR; `Ticket` tiếp tục là child collection có trạng thái riêng. Backend cung cấp order-detail, order-QR và admin scan/print/reprint; frontend hiển thị theo đơn và tạo một print job gồm summary cùng các ticket con.

**Tech Stack:** Node.js, Express, Mongoose 9, MongoDB transactions, React 19, Vite, QRCode, pdfmake, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-18-order-centric-booking-design.md`

## Global Constraints

- Chỉ booking mới có `ticketing_version: 2`; không backfill booking cũ.
- QR đơn dùng `AURA_BOOKING_V2:<token>`; QR ticket tiếp tục dùng `AURA_TICKET:<token>`.
- Quét đơn chỉ tra cứu và in; check-in chỉ nhận QR ticket.
- In lần đầu chỉ claim ticket `VALID` có `printedAt=null`; reprint cần admin và lý do.
- Không thay đổi vòng đời giữ ghế, payment, voucher và combo hiện tại.
- Không chạy browser và không tạo commit.

---

### Task 1: Order QR, snapshot schemas và audit model

**Files:**
- Modify: `backend/src/models/Booking.js`
- Modify: `backend/src/models/Ticket.js`
- Create: `backend/src/models/BookingActionLog.js`
- Create: `backend/src/services/bookingOrderService.js`
- Test: `backend/test/bookingOrder.service.test.js`

**Interfaces:**
- Produces: `buildBookingQrPayload(token)`, `parseBookingQrPayload(payload)`, `issueBookingOrderQr()`, `getBookingOrderQrPayload()`.
- Produces: `BookingActionLog.create()` audit documents.

- [ ] **Step 1: Write failing tests for QR prefix, encryption round-trip and legacy rejection**

```js
test("booking QR payload is versioned", () => {
  const payload = buildBookingQrPayload("secure-token");
  assert.equal(payload, "AURA_BOOKING_V2:secure-token");
  assert.equal(parseBookingQrPayload(payload), "secure-token");
  assert.equal(parseBookingQrPayload("AURA_TICKET:secure-token"), "");
});
```

- [ ] **Step 2: Run the test and confirm it fails before implementation**

Run: `cd backend && node --test test/bookingOrder.service.test.js`
Expected: FAIL because `bookingOrderService.js` does not exist.

- [ ] **Step 3: Add additive schemas and focused service**

```js
export const BOOKING_QR_PREFIX = "AURA_BOOKING_V2:";
export const buildBookingQrPayload = (token) => `${BOOKING_QR_PREFIX}${String(token).trim()}`;
export const parseBookingQrPayload = (payload) =>
  typeof payload === "string" && payload.startsWith(BOOKING_QR_PREFIX)
    ? payload.slice(BOOKING_QR_PREFIX.length).trim()
    : "";
```

Add `ticketing_version`, `order_qr`, snapshots, `seat_items`, and `pricing` to Booking; add immutable `seatType` to Ticket. Add audit enums and indexes on `bookingId`, `adminId`, `createdAt`, and `action`.

- [ ] **Step 4: Run focused tests**

Run: `cd backend && node --test test/bookingOrder.service.test.js`
Expected: PASS.

### Task 2: Create version-2 booking snapshots and child tickets

**Files:**
- Modify: `backend/src/controllers/bookingsControllers.js`
- Modify: `backend/src/services/ticketService.js`
- Modify: `backend/test/booking.flow.test.js`
- Modify: `backend/test/ticket.lifecycle.test.js`

**Interfaces:**
- Consumes: `issueBookingOrderQr()` from Task 1.
- Produces: new bookings with complete snapshots and child tickets with `seatType`.

- [ ] **Step 1: Add failing booking creation tests**

Assert a new booking has `ticketing_version === 2`, order QR hash/encrypted values, `seat_items.length === showtime_seat_ids.length`, and consistent pricing totals.

- [ ] **Step 2: Run focused tests and confirm the new assertions fail**

Run: `cd backend && node --test test/booking.flow.test.js test/ticket.lifecycle.test.js`
Expected: FAIL on missing version/snapshot fields.

- [ ] **Step 3: Build snapshots inside the existing booking transaction**

Create snapshot values only from server-loaded `Showtime`, `Movie`, `Room`, `Cinema`, `ShowtimeSeat`, `SeatType`, `Combo`, and verified voucher data. Do not trust client labels or prices. Populate the extra relations within `createBooking` and write all fields in the existing `Booking.create()` call.

- [ ] **Step 4: Include `seatType` when issuing each child ticket**

Populate `seat_type_id.name` in `populatePaidBookingForTickets()` and map it in `buildTicketDraft()`.

- [ ] **Step 5: Run focused tests**

Run: `cd backend && node --test test/booking.flow.test.js test/ticket.lifecycle.test.js`
Expected: PASS.

### Task 3: Booking-first customer API

**Files:**
- Create: `backend/src/services/bookingViewService.js`
- Modify: `backend/src/controllers/bookingsControllers.js`
- Modify: `backend/src/router/bookingsRouters.js`
- Create: `backend/test/bookingOrder.customerApi.test.js`

**Interfaces:**
- Produces: `formatBookingOrder(booking, tickets)` and `getTicketSummary(tickets)`.
- Produces endpoints `GET /bookings/my`, `GET /bookings/:id`, and `GET /bookings/:id/order-qr` with booking-first responses.

- [ ] **Step 1: Write failing tests for ownership, legacy QR rejection and grouped ticket summary**

```js
assert.deepEqual(body.data.ticket_summary, {
  total: 2, valid: 1, checked_in: 1, cancelled: 0, expired: 0,
  printed: 1, unprinted: 1,
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `cd backend && node --test test/bookingOrder.customerApi.test.js`
Expected: FAIL because the order formatter and QR endpoint are missing.

- [ ] **Step 3: Implement booking view composition**

Load tickets by `bookingId`, sort by seat label, remove token hashes/encrypted values, and return snapshots plus child tickets. Preserve legacy fields in responses used by payment pages.

- [ ] **Step 4: Implement owner-only order QR endpoint**

Return 404 for another user, 409 `LEGACY_BOOKING_UNSUPPORTED` for version 1, and 409 when booking is not `confirmed/paid`.

- [ ] **Step 5: Run focused tests**

Run: `cd backend && node --test test/bookingOrder.customerApi.test.js`
Expected: PASS.

### Task 4: Atomic admin scan-print and audited reprint

**Files:**
- Create: `backend/src/controllers/adminBookingPrintControllers.js`
- Modify: `backend/src/router/adminBookingsRouters.js`
- Create: `backend/test/bookingOrder.adminPrint.test.js`

**Interfaces:**
- Consumes: order QR helpers and `BookingActionLog` from Task 1.
- Produces: `lookupAdminBookingOrder`, `scanPrintBookingOrder`, `reprintBookingTickets`.

- [ ] **Step 1: Write failing tests for eligibility, concurrent claims and audit logs**

Cover: only `VALID + printedAt=null` is claimed; second scan returns `NO_ELIGIBLE_TICKETS`; checked-in/cancelled/expired tickets are skipped; invalid/legacy/unpaid orders are rejected; reprint requires non-empty reason and ticket ownership.

- [ ] **Step 2: Run tests and confirm failure**

Run: `cd backend && node --test test/bookingOrder.adminPrint.test.js`
Expected: FAIL because controller functions are missing.

- [ ] **Step 3: Implement atomic first-print claim**

Within a transaction, locate the booking by order-token hash, validate status/version/ticket count, read eligible IDs, and update only documents matching all conditions:

```js
await Ticket.updateMany(
  { _id: { $in: eligibleIds }, bookingId, status: "VALID", printedAt: null },
  { $set: { printedAt: now, printedBy: adminId } },
  { session },
);
```

Reload only claimed tickets with encrypted QR token, build printable ticket payloads, and write `PRINT_INITIAL` audit metadata.

- [ ] **Step 4: Implement reprint without mutating first-print timestamps**

Validate `reason.trim().length >= 3`, restrict tickets to the requested booking and `VALID`, return printable payloads, and write a `REPRINT` log containing ticket IDs and reason.

- [ ] **Step 5: Wire routes before `/:id` route**

```js
router.post("/lookup", lookupAdminBookingOrder);
router.post("/scan-print", scanPrintBookingOrder);
router.post("/:id/reprint", reprintBookingTickets);
```

- [ ] **Step 6: Run focused tests**

Run: `cd backend && node --test test/bookingOrder.adminPrint.test.js`
Expected: PASS.

### Task 5: Customer UI grouped by booking

**Files:**
- Modify: `frontend-user/src/services/bookingService.js`
- Modify: `frontend-user/src/pages/BookingResultPage.jsx`
- Modify: `frontend-user/src/pages/AccountPage.jsx`
- Create: `frontend-user/src/utils/bookingOrderView.js`
- Create: `frontend-user/src/utils/bookingOrderView.test.js`
- Modify: `frontend-user/package.json`

**Interfaces:**
- Produces: `getBookingOrderQr(bookingId)` and `mapBookingOrderView(booking)`.

- [ ] **Step 1: Write failing pure mapping tests**

Verify one order with two tickets produces one order card, preserves service/voucher totals, and sorts tickets by seat label.

- [ ] **Step 2: Run test and confirm failure**

Run: `cd frontend-user && node --test src/utils/bookingOrderView.test.js`
Expected: FAIL because the mapper is missing.

- [ ] **Step 3: Implement mapper and service endpoint**

Keep date/currency presentation outside the mapper. Make new fields tolerant of legacy booking responses.

- [ ] **Step 4: Update booking success page**

Load one booking detail, its order QR, and ticket QR children. Render order summary and QR first, then ticket cards. Retain ticket QR download/check-in information.

- [ ] **Step 5: Update “Vé của tôi” to paginate booking cards**

Use `/bookings/my`; show booking code, movie/showtime, services, voucher, total and aggregate ticket status, with expandable child ticket details.

- [ ] **Step 6: Run frontend unit tests and build**

Run: `cd frontend-user && npm test && npm run build`
Expected: PASS; existing Vite chunk-size warning is acceptable.

### Task 6: Admin scanner and single order print document

**Files:**
- Modify: `frontend-user/src/admin/services/bookingAdminService.js`
- Modify: `frontend-user/src/admin/pages/TicketScannerPage.jsx`
- Modify: `frontend-user/src/admin/pages/BookingsPage.jsx`
- Create: `frontend-user/src/utils/bookingOrderPrint.js`
- Create: `frontend-user/src/utils/bookingOrderPrint.test.js`
- Modify: `frontend-user/package.json`

**Interfaces:**
- Produces: `lookupBookingOrder`, `scanPrintBookingOrder`, `reprintBookingTickets`.
- Produces: `createBookingOrderPrintDefinition(printPayload)`.

- [ ] **Step 1: Write failing print-definition tests**

Assert the document contains one order summary, services/voucher/pricing, and exactly one ticket block per returned ticket with ticket QR payload.

- [ ] **Step 2: Run test and confirm failure**

Run: `cd frontend-user && node --test src/utils/bookingOrderPrint.test.js`
Expected: FAIL because the print utility is missing.

- [ ] **Step 3: Implement print utility**

Return a deterministic pdfmake definition. Put summary first and `pageBreak: "before"` on each ticket after the first printable section. Never place order token as visible text.

- [ ] **Step 4: Make scanner dispatch by QR prefix**

For `AURA_BOOKING_V2:`, call scan-print, immediately create/open one print job, and display printed/skipped counts. For `AURA_TICKET:`, preserve existing verify/check-in behavior.

- [ ] **Step 5: Add reprint UI to booking detail**

Allow selecting only `VALID` child tickets, require a reason, show confirmation, and display action history. Do not reset `printedAt` when reprinting.

- [ ] **Step 6: Run frontend tests and build**

Run: `cd frontend-user && npm test && npm run build`
Expected: PASS.

### Task 7: Regression and repository verification

**Files:**
- Modify tests only if a regression exposes a requirement mismatch.

- [ ] **Step 1: Run all backend tests**

Run: `cd backend && npm test`
Expected: all tests pass.

- [ ] **Step 2: Run all frontend tests and production build**

Run: `cd frontend-user && npm test && npm run build`
Expected: all tests and build pass.

- [ ] **Step 3: Run targeted lint on changed frontend files**

Run: `cd frontend-user && npx eslint src/pages/BookingResultPage.jsx src/pages/AccountPage.jsx src/admin/pages/TicketScannerPage.jsx src/admin/pages/BookingsPage.jsx src/utils/bookingOrderView.js src/utils/bookingOrderView.test.js src/utils/bookingOrderPrint.js src/utils/bookingOrderPrint.test.js`
Expected: no new errors; pre-existing errors must be reported separately and not broaden scope.

- [ ] **Step 4: Check whitespace and review modified files**

Run: `git diff --check && git status --short`
Expected: no whitespace errors; no commit is created.
