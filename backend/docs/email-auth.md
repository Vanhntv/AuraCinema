# Xác minh email AuraCinema

## Bật gửi thư thật

1. Tạo tài khoản Resend, thêm tên miền do bạn quản lý và hoàn thành bản ghi DNS SPF/DKIM theo hướng dẫn nhà cung cấp.
2. Tạo API key có quyền gửi email cho tên miền đó.
3. Thêm vào `backend/.env` (không đưa API key vào frontend hoặc Git):

   ```dotenv
   RESEND_API_KEY=<API key riêng của bạn>
   EMAIL_FROM="AuraCinema <no-reply@ten-mien-cua-ban>"
   ```

4. Khởi động lại backend (`npm run dev` hoặc `npm start`). Dùng Node.js 20.19+ như yêu cầu của frontend Vite hiện tại.
5. Đăng ký bằng hộp thư bạn kiểm soát, nhận mã thật, xác minh và đăng nhập. Kiểm tra cả thư rác; API chấp nhận thư không bảo đảm thư đã đến hộp thư chính. Theo dõi delivery/bounce trong Resend Dashboard.

Tài liệu nhà cung cấp: https://resend.com/docs/api-reference/emails/send-email

Không có chế độ in OTP ra console/trả OTP trong JSON. Thiếu cấu hình thì đăng ký mới trả 503 trước khi tạo tài khoản. Nếu nhà cung cấp lỗi sau khi tạo tài khoản, tài khoản được giữ ở trạng thái chờ xác minh và giao diện cho gửi lại mã. Request gửi thư có timeout 10 giây; không tự retry bằng mã mới. Người dùng có thể gửi lại sau cooldown.

## Hành vi

- `POST /api/auth/register`: tạo user `unverified`, `status=false`, `email_verification_required=true`; không cấp JWT. Trả `verification_required`, `email`, thời gian gửi lại và thông báo. Đăng ký lại tài khoản chờ xác minh không ghi đè mật khẩu.
- `POST /api/auth/resend-verification` với `{ email }`: yêu cầu mã mới. Email không tồn tại/đã xác minh nhận thông báo chung.
- `POST /api/auth/verify-email` với `{ email, otp }`: kích hoạt tài khoản và ghi `email_verified_at`; sau đó người dùng đăng nhập bằng mật khẩu.
- `POST /api/auth/login`: chỉ sau khi mật khẩu đúng mới trả `403 EMAIL_NOT_VERIFIED` nếu cần xác minh. Không tự gửi thư mỗi lần đăng nhập.
- `POST /api/auth/forgot-password` và `/reset-password`: dùng email thật; mã khôi phục và mã xác minh là hai mục đích riêng. Khôi phục mật khẩu không kích hoạt tài khoản chưa xác minh. Đổi mật khẩu vô hiệu hóa JWT cũ.
- Admin hỗ trợ đặt lại mật khẩu cũng gửi email qua cùng dịch vụ. Không hiển thị OTP cho admin.
- Admin đổi email khách hàng sẽ xóa bằng chứng xác minh và các mã cũ, yêu cầu xác minh email mới. Tài khoản bị khóa vẫn giữ trạng thái khóa.

## Chính sách và tính nguyên tử

OTP 6 chữ số, sinh bằng `crypto.randomInt`, lưu bằng scrypt với salt riêng; hạn 10 phút, tối đa 5 lượt kiểm tra mỗi mã. Gửi tối đa 5 lần/giờ/mục đích/tài khoản, cách nhau ít nhất 60 giây. Quota lưu trong MongoDB, vẫn có hiệu lực khi restart hoặc có nhiều backend. Lần gửi thất bại cũng tính vào quota, mã đó bị vô hiệu hóa.

Challenge được nhúng trong User (ẩn khỏi truy vấn thông thường bằng `select:false`) để tiêu thụ OTP và cập nhật tài khoản/mật khẩu trong một thao tác MongoDB nguyên tử. Không cần transaction nhiều document. So khớp request ID/hash ngăn dùng lại mã, mã cũ sau resend và xóa nhầm mã mới khi request gửi trước thất bại muộn. Claim lượt thử trước khi so sánh hash ngăn vượt số lần thử bằng request đồng thời.

IP limiter dùng `req.ip`, không tin trực tiếp `X-Forwarded-For`. Limiter IP trong bộ nhớ áp dụng theo từng backend. Khi triển khai nhiều instance, bổ sung limiter ở reverse proxy/gateway. Nếu có proxy, cấu hình Express `trust proxy` chính xác cho hạ tầng; không bật tin mọi proxy tùy tiện.

## Tài khoản cũ

Không chạy migration hàng loạt. Tài khoản cũ đang active vẫn đăng nhập được, `email_verified_at` tiếp tục để trống và không giả định đã xác minh. Chỉ tài khoản đăng ký mới hoặc thay email bị buộc xác minh. Admin/staff hiện hữu tiếp tục hoạt động.

Nếu cần bắt buộc xác minh tài khoản cũ, triển khai theo đợt có thông báo; chỉ cập nhật các tài khoản mục tiêu, tránh khóa admin/staff. Có thể hướng người dùng tới `/xac-minh-email` để tự xác minh trước. Không đặt `email_verified_at` bằng script khi chưa có bằng chứng sở hữu hộp thư.

## Kiểm thử

```sh
cd backend
npm test
RUN_EMAIL_AUTH_INTEGRATION=1 node --test test/email.auth.integration.test.js
```

Integration test cần `mongod` trên PATH (hoặc `MONGOD_BINARY=/duong-dan/mongod`). Test tự tạo MongoDB độc lập ở cổng ngẫu nhiên và thư mục tạm, xóa sau khi kết thúc; không dùng `.env` hay database dự án. HTTP đến Resend được thay bằng transport giả, không gửi email ra ngoài.

Kiểm tra thủ công trước khi vận hành: nhận thư tại hộp thư thật; mã sai/hết hạn/đã dùng; gửi lại; đăng nhập trước/sau xác minh; khôi phục mật khẩu; provider lỗi; tài khoản bị khóa và tài khoản cũ.
