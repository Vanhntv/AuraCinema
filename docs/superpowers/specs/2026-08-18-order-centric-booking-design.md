# Order-Centric Booking Design

## Mục tiêu

Chuyển `Booking` thành aggregate root của giao dịch đặt vé. Một booking mới chứa toàn bộ snapshot nghiệp vụ tại thời điểm mua, liên kết với một hoặc nhiều `Ticket`, có QR đơn riêng để quản trị viên tra cứu và in tất cả vé hợp lệ chưa từng in trong một thao tác. Check-in vẫn thực hiện bằng QR riêng của từng ticket.

## Phạm vi

- Áp dụng cho booking mới được tạo sau khi tính năng triển khai.
- Không backfill và không tự cấp QR đơn cho booking cũ.
- Giữ nguyên vòng đời giữ ghế, thời hạn thanh toán, voucher, combo và thanh toán hiện tại.
- Giữ `Ticket` là collection riêng để quản lý trạng thái từng ghế và chống phát hành trùng vé.
- Thay các màn hình sau thanh toán sang cách trình bày theo booking trước, tickets sau.
- Không chạy browser và không tự commit trong lần triển khai này.

## Kiến trúc

`Booking` là nguồn dữ liệu chuẩn cho khách hàng, suất chiếu, danh sách ghế, dịch vụ, voucher, giá và thanh toán. `Ticket` là thực thể con, liên kết qua `bookingId`, có vòng đời in/check-in riêng. API và UI dùng booking làm điểm vào chính; API ticket chỉ còn phục vụ chi tiết vé, lấy QR vé và check-in.

## Mô hình dữ liệu

### Booking

Bổ sung các trường cho booking mới:

- `ticketing_version: 2` để phân biệt booking hỗ trợ QR đơn.
- `order_qr.token_hash`, `order_qr.token_encrypted`, `order_qr.issued_at`.
- `movie_snapshot`: `movie_id`, `title`, `poster`, `age_classification`.
- `showtime_snapshot`: `showtime_id`, `start_time`, `end_time`, thông tin rạp và phòng.
- `seat_items[]`: `showtime_seat_id`, `seat_id`, `seat_code`, `seat_label`, `seat_type`, `price`.
- `pricing`: `ticket_subtotal`, `service_subtotal`, `subtotal`, `discount`, `total`.

Các trường `combos`, `voucher`, thông tin khách hàng, payment và cancellation hiện có tiếp tục được dùng làm snapshot. Các trường giá cũ được giữ trong giai đoạn chuyển đổi để tránh phá vỡ payment/dashboard hiện tại; `pricing` phải được tạo từ cùng phép tính và được kiểm thử đồng nhất.

QR đơn dùng token ngẫu nhiên có entropy cao. Cơ sở dữ liệu chỉ tìm kiếm bằng hash; bản mã hóa chỉ được giải mã khi trả QR cho đúng chủ booking hoặc khi tạo dữ liệu in. Payload dùng định dạng `AURA_BOOKING_V2:<token>`, không chứa MongoDB ObjectId hoặc `booking_code` dạng rõ.

### Ticket

Giữ collection `tickets` và quan hệ `bookingId`. Bổ sung snapshot `seatType` để loại ghế trên vé không thay đổi khi cấu hình ghế được sửa. Các trường hiện có tiếp tục quản lý:

- Mã vé và QR token riêng.
- Ghế, giá vé và suất chiếu.
- Trạng thái `VALID`, `CHECKED_IN`, `CANCELLED`, `EXPIRED`.
- `printedAt`, `printedBy` cho lần in đầu tiên.

QR ticket là mã duy nhất được chấp nhận ở endpoint check-in.

### BookingActionLog

Tạo collection audit riêng gồm:

- `bookingId`, `ticketIds`, `adminId`.
- `action`: `LOOKUP`, `PRINT_INITIAL`, `REPRINT`.
- `result`: `SUCCESS`, `PARTIAL`, `NO_ELIGIBLE_TICKETS`, `INVALID_TOKEN`, `BOOKING_NOT_PAYABLE`, `ERROR`.
- `reason`, `scannedAt`, IP, user-agent và metadata an toàn.

Log không lưu raw QR token.

## Phát hành booking và vé

Khi tạo booking mới, backend ghi đầy đủ snapshot, đặt `ticketing_version=2` và tạo token QR đơn. QR chỉ được trả cho người dùng sau khi booking ở trạng thái `confirmed/paid`.

Khi thanh toán thành công, service phát hành tickets idempotent như hiện tại: mỗi ghế có đúng một ticket. Kết quả chi tiết booking luôn trả `tickets[]` cùng phần tóm tắt số lượng theo trạng thái.

Nếu phát hành thiếu ticket, booking không được coi là sẵn sàng để in. Service có thể chạy lại idempotent để tạo phần còn thiếu, nhưng endpoint quét/in phải trả lỗi có kiểm soát cho đến khi số ticket khớp số ghế.

## API khách hàng

- `GET /bookings/my`: phân trang theo booking, không phân trang theo từng ticket; trả summary và `ticket_summary`.
- `GET /bookings/:id`: trả toàn bộ snapshot đơn cùng `tickets[]` nhưng không trả raw QR token.
- `GET /bookings/:id/order-qr`: chỉ chủ đơn, chỉ booking version 2 đã thanh toán; trả payload QR đơn.
- `GET /tickets/:ticketId/qr`: tiếp tục trả QR ticket cho chủ vé để check-in.

Các endpoint ticket hiện tại được giữ trong giai đoạn tương thích, nhưng UI “Vé của tôi” gọi booking API làm nguồn dữ liệu chính.

## API quản trị quét và in

### Quét QR đơn và in lần đầu

`POST /admin/bookings/scan-print` nhận `qrToken`.

Backend thực hiện trong transaction:

1. Parse prefix/version, hash token và tìm booking version 2.
2. Xác nhận booking `confirmed/paid`, suất chiếu chưa kết thúc và số ticket khớp số ghế.
3. Chọn tickets có `status=VALID` và `printedAt=null`.
4. Claim nguyên tử các ticket đó bằng điều kiện trạng thái và `printedAt=null`.
5. Ghi `PRINT_INITIAL` log với đúng danh sách ticket đã claim.
6. Trả một print payload gồm summary booking và QR riêng của từng ticket đã claim.

Frontend mở một lệnh in duy nhất ngay khi nhận response. Trang đầu/khối đầu là tóm tắt đơn; các phần sau là từng vé. Tickets đã in, đã check-in, hủy hoặc hết hạn bị bỏ qua và được liệt kê trong `skippedTickets` để nhân viên biết lý do.

Nếu không còn ticket hợp lệ chưa in, API trả `409 NO_ELIGIBLE_TICKETS` cùng summary đơn nhưng không mở lệnh in.

### Tra cứu thủ công

`POST /admin/bookings/lookup` nhận `bookingCode` và chỉ trả chi tiết đơn. Tra cứu thủ công không tự đánh dấu đã in. Từ màn hình kết quả, quản trị viên có thể chạy hành động in lần đầu nếu còn vé đủ điều kiện.

### In lại

`POST /admin/bookings/:id/reprint` nhận `ticketIds` và `reason` bắt buộc. Chỉ admin được phép gọi. Chỉ tickets thuộc booking và còn `VALID` được in lại; ticket đã check-in, hủy hoặc hết hạn luôn bị từ chối. `printedAt` tiếp tục biểu thị lần in đầu, còn mỗi lần in lại được ghi trong `BookingActionLog`.

## Check-in

Giữ endpoint và UI check-in ticket hiện tại. QR đơn không được chấp nhận ở endpoint check-in. Sau khi quét QR ticket, backend vẫn cập nhật duy nhất ticket tương ứng từ `VALID` sang `CHECKED_IN` bằng cập nhật có điều kiện để chống quét đồng thời.

Màn hình quét admin phân biệt payload bằng prefix:

- QR đơn: tải booking và tự động in các vé đủ điều kiện.
- QR ticket: tải một ticket và cho phép check-in như hiện tại.

## Nội dung bản in

Một print job gồm:

1. Tóm tắt đơn: mã đơn, phim, suất chiếu, rạp/phòng, khách hàng, dịch vụ, voucher, tạm tính, giảm giá, tổng thanh toán và phương thức thanh toán.
2. Một khối/trang cho mỗi ticket được in: mã vé, ghế, loại ghế, giá, phim, suất chiếu, phòng và QR ticket để check-in.

Không đưa dữ liệu nhạy cảm hoặc raw order token vào nội dung hiển thị ngoài QR.

## Frontend

### Khách hàng

- Trang đặt vé thành công hiển thị một thẻ đơn chính, QR đơn, chi tiết dịch vụ/voucher/giá và danh sách ticket con.
- “Vé của tôi” phân trang theo booking. Mỗi booking mở rộng để xem các ghế, trạng thái từng ticket và QR ticket.
- Tải/in mặc định tạo tài liệu theo toàn bộ booking; thao tác QR ticket riêng vẫn có cho check-in.

### Quản trị

- Màn hình scanner nhận cả QR đơn và QR ticket.
- QR đơn thành công mở print job ngay và hiển thị kết quả: số vé đã in, số vé bỏ qua và lý do.
- Trang chi tiết booking hiển thị toàn bộ ticket và lịch sử lookup/print/reprint.
- In lại yêu cầu chọn ticket, nhập lý do và xác nhận rõ ràng.

## Tính nhất quán và lỗi

- Production tiếp tục yêu cầu MongoDB replica set/sharded cluster cho transaction.
- Claim in lần đầu dùng điều kiện `status=VALID` và `printedAt=null`; hai quầy quét đồng thời không thể cùng claim một ticket.
- Endpoint quét/in là idempotent theo trạng thái: lần gọi sau không in lại ticket đã claim.
- Nếu client nhận payload nhưng hộp thoại in bị hủy/lỗi vật lý, quản trị viên dùng luồng reprint có lý do; hệ thống không thể xác nhận chắc chắn trạng thái máy in từ trình duyệt.
- Booking cũ không có `ticketing_version=2` trả lỗi `LEGACY_BOOKING_UNSUPPORTED` khi dùng luồng QR đơn.
- Không thay đổi trạng thái voucher, combo hoặc payment khi in/check-in.

## Tương thích và chuyển đổi

- Không migration booking cũ.
- Booking cũ và tickets cũ tiếp tục dùng API/UI tương thích hiện tại.
- Booking mới luôn đi theo order-centric API.
- Giữ endpoint ticket cũ trong ít nhất một giai đoạn phát hành; không xóa trong phạm vi này.

## Kiểm thử chấp nhận

- Booking một ghế tạo một order QR và một ticket QR.
- Booking nhiều ghế tạo một order QR và đúng một ticket cho mỗi ghế.
- Snapshot đơn giữ nguyên khi phim, suất, phòng, loại ghế, combo hoặc voucher được chỉnh sửa sau đó.
- Quét order QR lần đầu claim và trả tất cả tickets `VALID` chưa in.
- Quét lại không in lại tickets đã in và trả `NO_ELIGIBLE_TICKETS` nếu không còn ticket phù hợp.
- Hai admin quét đồng thời không thể in trùng cùng ticket.
- Ticket đã check-in, hủy hoặc hết hạn không xuất hiện trong print payload.
- In lại bắt buộc quyền admin và lý do; lịch sử lưu đúng tickets và người thực hiện.
- QR đơn bị từ chối ở check-in; QR ticket vẫn check-in một ghế duy nhất.
- Booking cũ không được cấp QR đơn và vẫn truy cập được bằng luồng tương thích.
- Trang thành công, “Vé của tôi”, chi tiết admin và tài liệu in đều hiển thị đúng dịch vụ, voucher, tickets và tổng tiền.
