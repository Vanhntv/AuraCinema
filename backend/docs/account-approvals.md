# Phê duyệt thay đổi tài khoản

`User.role` là nguồn quyền duy nhất (`user`, `staff`, `admin`). `role_id` được duy trì để tương thích dữ liệu cũ nhưng không cấp quyền. Trước khi triển khai, chạy `npm run migrate:roles` để xem số bản ghi lệch; chỉ khi đã kiểm tra kết quả mới chạy `npm run migrate:roles -- --apply`. Script đồng bộ `role_id` theo `role`, không tự nâng quyền.

Các thao tác từ quản lý người dùng (`PATCH /api/users/:id`, `PATCH /api/users/:id/status`, `POST /api/users/:id/force-reset-password`, `POST /api/users/:id/reward-points`) tạo yêu cầu chờ duyệt và trả `202`. Thay đổi thông tin admin qua `PATCH /api/auth/profile` và yêu cầu tự đổi mật khẩu qua `PATCH /api/auth/change-password` cũng trả `202`. Không có thay đổi nào được áp dụng tại bước tạo yêu cầu.

Admin xem hàng chờ tại `/admin/account-approvals`. Người tạo đề xuất không thể tự phê duyệt. Chỉ cần một admin khác xác nhận bằng mật khẩu hiện tại; nếu tài khoản đích là admin, chính tài khoản đích cũng không được duyệt. Yêu cầu hết hạn sau 24 giờ. Đổi mật khẩu admin không lưu mật khẩu mới trong yêu cầu: sau khi được duyệt, chủ tài khoản nhập lại mật khẩu hiện tại và mật khẩu mới trong hàng chờ. Với yêu cầu đặt lại mật khẩu, OTP chỉ được gửi sau khi được duyệt; luồng quên mật khẩu công khai không tự gửi OTP cho admin.

Hệ thống cần MongoDB hỗ trợ transaction để áp dụng thay đổi, lưu trạng thái yêu cầu và audit cùng nhau. Cần ít nhất hai admin hoạt động nếu admin tự đề xuất thay đổi tài khoản của mình; nếu admin A đề xuất thay đổi admin B thì cần thêm admin C để duyệt. Không thể khóa hoặc hạ quyền khiến còn dưới hai admin hoạt động.

Nếu phê duyệt hoặc từ chối trả `503 MONGODB_TRANSACTION_UNAVAILABLE`, kiểm tra log backend để xem lỗi MongoDB gốc. Lúc khởi động, backend báo `transaction: sẵn sàng` hoặc `transaction: không hỗ trợ`. Với MongoDB standalone, hãy chuyển sang replica set hoặc Atlas, rồi khởi động lại backend. `MONGODB_URI` được ưu tiên hơn `MONGODB_TARGET` và `MONGODB_ATLAS_URI`; kiểm tra biến môi trường của tiến trình backend nếu cấu hình trong `.env` trông đúng mà lỗi vẫn xảy ra. Không bỏ transaction ở luồng này vì trạng thái yêu cầu và audit phải được ghi cùng nhau.

Không chạy `Promise.all` với các truy vấn dùng cùng một session trong transaction. MongoDB có thể trả lỗi `ConflictingOperationInProgress` (mã 117); đó là lỗi thao tác đồng thời, không phải bằng chứng MongoDB thiếu replica set.

API hàng chờ (chỉ admin): `GET /api/users/approval-requests`, `POST /api/users/approval-requests/:id/approve`, `POST /api/users/approval-requests/:id/reject`, `POST /api/users/approval-requests/:id/send-reset`. Phê duyệt yêu cầu trường `current_password`; từ chối yêu cầu trường `reason`.
