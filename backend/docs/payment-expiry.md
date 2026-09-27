# Thời hạn thanh toán AuraCinema

## Nguồn thời gian duy nhất

`PAYMENT_DURATION_MS` trong `src/services/seatHoldPolicy.js` là cấu hình duy nhất cho thời hạn thanh toán. Khi tạo booking, backend tính và lưu `payment_expires_at`. Mốc này không được tạo lại khi khách mở lại trang hoặc thử thanh toán lần khác.

Giá trị hiện tại:

```js
export const PAYMENT_DURATION_MS = 5 * 60 * 1000;
```

Muốn đổi thời hạn toàn hệ thống, chỉ sửa hằng số trên. Booking đã tạo vẫn giữ mốc hết hạn cũ; booking mới dùng giá trị mới.

## VNPay

Khi tạo URL thanh toán, backend truyền chính xác `booking.payment_expires_at` vào trường ký `vnp_ExpireDate` theo múi giờ GMT+7. Đồng hồ trên trang VNPay vì thế dùng cùng deadline với AuraCinema.

Đăng ký URL IPN công khai trong cổng quản trị VNPay:

```text
https://<backend-domain>/api/payments/vnpay/ipn
```

Return URL vẫn dùng để đưa trình duyệt về giao diện. IPN là kênh máy chủ dùng để ghi nhận kết quả đáng tin cậy. Backend kiểm tra chữ ký, mã đơn, số tiền và dùng `vnp_PayDate` đã ký để phân biệt thanh toán đúng hạn với callback đến muộn.

## SePay Payment Gateway

Form checkout của SePay không có trường thời hạn đơn hàng. AuraCinema áp dụng deadline theo hai lớp:

1. Backend từ chối tạo checkout sau `payment_expires_at`.
2. Worker chạy mỗi 30 giây, hết hạn booking và gọi API hủy đơn SePay đang chờ. Lỗi tạm thời được thử lại tối đa 3 lần, cách nhau 5 phút.

Tạo IPN trong SePay Payment Gateway với:

```text
URL: https://<backend-domain>/api/payments/sepay-pg/ipn
Method: POST
Authentication: API Key
Header: X-Secret-Key
```

Đặt secret đã khai báo trên SePay vào backend:

```dotenv
SEPAY_PG_IPN_SECRET=<secret-rieng-cua-ipn>
```

Nếu không khai báo biến riêng, backend tạm dùng `SEPAY_PG_SECRET_KEY`; production nên dùng secret IPN riêng. Callback lặp hoặc đến sai thứ tự không làm booking đã thanh toán bị chuyển ngược thành thất bại.

## Thanh toán đến muộn

Nếu nhà cung cấp xác nhận tiền sau khi ghế hoặc booking đã hết hạn, backend không tự khôi phục ghế. Booking và Payment chuyển sang `review_required` để đối soát/hoàn tiền thủ công, tránh bán trùng ghế.

`localhost` không nhận được IPN từ VNPay/SePay. Khi thử cục bộ, dùng HTTPS tunnel và cấu hình URL tunnel làm IPN; frontend vẫn có thể chạy ở `localhost`.

## Biến môi trường

```dotenv
VNP_TMN_CODE=<tmn-code>
VNP_HASH_SECRET=<hash-secret>
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:5173/payment/vnpay-return

SEPAY_PG_ENV=sandbox
SEPAY_PG_MERCHANT_ID=<merchant-id>
SEPAY_PG_SECRET_KEY=<payment-gateway-secret>
SEPAY_PG_IPN_SECRET=<ipn-secret>
```

Sau khi đổi `.env`, khởi động lại backend.
