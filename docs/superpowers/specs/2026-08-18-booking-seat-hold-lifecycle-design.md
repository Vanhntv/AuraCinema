# Booking Seat Hold Lifecycle Design

## Mục tiêu

Xây dựng vòng đời giữ ghế nhất quán cho AuraCinema: giữ ghế ngay khi chọn, duy trì phiên giữ cố định trong 5 phút, chuyển sang booking chờ thanh toán trong 10 phút, tự giải phóng tài nguyên khi hết hạn và không bao giờ bán trùng ghế khi có nhiều người thao tác đồng thời.

## Phạm vi

- Người dùng phải đăng nhập mới được giữ ghế.
- Tối đa 8 ghế cho một phiên; ghế đôi vẫn phải được chọn đủ cặp theo quy tắc hiện có.
- Một người dùng chỉ có một phiên giữ ghế đang hoạt động trên một suất chiếu.
- Backend là nguồn thời gian và trạng thái duy nhất. Frontend chỉ hiển thị thời gian còn lại.
- Giữ polling sơ đồ ghế mỗi 3 giây; chưa bổ sung WebSocket.
- Không thay đổi thiết kế hình ảnh tổng thể.
- Không chạy browser và không tự commit trong lần triển khai này.

## Mô hình trạng thái

### SeatHold

Thêm collection `seat_holds` gồm:

- `token`: chuỗi ngẫu nhiên duy nhất, chỉ trả cho chủ phiên.
- `user_id`, `showtime_id`, `showtime_seat_ids`.
- `status`: `active`, `converted`, `released`, `expired`.
- `expires_at`, `converted_booking_id`, `released_at`.

Chỉ được tồn tại một bản ghi `active` cho cặp `user_id + showtime_id`. Một phiên mới có thời hạn 5 phút từ lúc tạo. Thêm hoặc bỏ ghế không gia hạn `expires_at`.

### ShowtimeSeat

Giữ các trạng thái `available`, `held`, `reserved`, `booked`. Thêm `hold_id` để xác định chính xác phiên sở hữu ghế. `held_by` tiếp tục hỗ trợ truy vấn và tương thích, nhưng mọi chuyển trạng thái phải kiểm tra `hold_id` hoặc `reserved_by_booking_id`.

### Booking và Payment

Booking thêm `seat_hold_id` và `payment_expires_at`. Khi SeatHold được chuyển đổi, booking nhận thời hạn thanh toán 10 phút. `payment_status` thêm `expired` và `refund_pending`. Payment thêm `expired` và `review_required`.

## Luồng nghiệp vụ

### Chọn và giữ ghế

`POST /showtime-seats/hold` nhận suất chiếu, toàn bộ danh sách ghế mong muốn và token hiện tại nếu có. Backend:

1. Dọn phiên giữ/booking hết hạn liên quan.
2. Tìm hoặc tạo SeatHold active của người dùng trên suất chiếu.
3. Từ chối quá 8 ghế, ghế hỏng, ghế thuộc phiên/booking khác.
4. Giữ nguyên thời hạn ban đầu.
5. Thu nhận ghế thêm bằng cập nhật có điều kiện; nếu thất bại, hoàn tác phần vừa thu nhận.
6. Giải phóng ghế đã bỏ chọn sau khi toàn bộ ghế mới đã được thu nhận thành công.
7. Trả `hold_token`, `showtime_seat_ids`, `expires_at`.

`GET /showtime-seats/hold/active?showtime_id=...` trả phiên active của chính người dùng để khôi phục sau tải lại. `POST /showtime-seats/release` có thể bỏ một số ghế hoặc toàn bộ phiên và không phụ thuộc vào unload của trình duyệt.

### Tạo booking

`POST /bookings` bắt buộc có `hold_token`. Backend xác thực phiên active, chưa hết hạn, đúng người dùng, đúng suất và đúng tập ghế. Trong cùng transaction, backend dự trữ combo, xác minh voucher, tạo booking, chuyển ghế từ `held` sang `reserved`, đặt `reserved_by_booking_id`, chuyển SeatHold sang `converted` và đặt `payment_expires_at = now + 10 phút`.

### Thanh toán

Mọi endpoint tạo thanh toán và xác nhận thanh toán phải kiểm tra `payment_expires_at`. Nếu hết hạn trước khi có kết quả thành công, booking bị hủy với `payment_status=expired`, ghế được trả, tồn kho combo được hoàn và tài nguyên voucher được hoàn.

Nếu nhà cung cấp báo thành công sau khi booking đã hết hạn, hệ thống không được chiếm lại ghế. Payment được ghi `review_required`, booking được ghi `refund_pending`, lưu dữ liệu giao dịch để quản trị viên đối soát/hoàn tiền và trả mã lỗi xung đột có kiểm soát.

### Dọn dữ liệu hết hạn

Tạo service vòng đời dùng chung cho kiểm tra lười tại các endpoint đọc/ghi và một worker chạy mỗi 30 giây sau khi kết nối cơ sở dữ liệu. Worker dùng cập nhật có điều kiện và có thể chạy lặp an toàn:

- SeatHold active hết hạn -> `expired`, các ghế còn thuộc `hold_id` -> `available`.
- Booking pending hết hạn -> `cancelled/expired`, trả ghế, hoàn combo và giải phóng tài nguyên voucher.

## Frontend

Booking UI lưu `hold_token` trong state và gọi endpoint khôi phục khi tải sơ đồ ghế. Đồng hồ dùng `expires_at` hoặc `payment_expires_at` từ backend, không tự cấp thời gian mới. Khi hết hạn chọn ghế, xóa ghế đã chọn nhưng giữ combo/voucher. Trang thanh toán hiển thị đồng hồ, tự tải trạng thái, và điều hướng về chọn ghế khi booking hết hạn.

## Tính nhất quán và lỗi

- Mọi thao tác chiếm ghế dùng điều kiện trạng thái + chủ sở hữu; không dùng quy trình đọc rồi ghi không điều kiện.
- Production yêu cầu MongoDB replica set/sharded cluster để transaction bảo vệ chuyển SeatHold -> Booking.
- Development vẫn dùng cơ chế fallback hiện có nhưng phải hoàn tác phần thu nhận nếu xảy ra cạnh tranh.
- API trả `409` khi ghế/phiên không còn sở hữu, `410` khi phiên hoặc booking hết hạn, `400` cho payload không hợp lệ.

## Kiểm thử chấp nhận

- Hai người đồng thời không thể giữ cùng ghế.
- Chọn thêm ghế không gia hạn phiên 5 phút.
- Tải lại khôi phục đúng ghế và thời gian còn lại.
- Không thể tạo booking bằng token của người khác, token hết hạn hoặc danh sách ghế khác.
- Booking hết hạn sau 10 phút trả ghế và combo đúng một lần.
- Callback thành công muộn không phát hành vé và chuyển giao dịch sang đối soát.
- Luồng thanh toán đúng hạn vẫn phát hành vé như hiện tại.

