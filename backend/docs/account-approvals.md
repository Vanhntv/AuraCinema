# Phê duyệt thay đổi tài khoản

`User.role` là nguồn quyền duy nhất (`user`, `staff`, `admin`). `role_id` được duy trì để tương thích dữ liệu cũ nhưng không cấp quyền. Trước khi triển khai, chạy `npm run migrate:roles` để xem số bản ghi lệch; chỉ khi đã kiểm tra kết quả mới chạy `npm run migrate:roles -- --apply`. Script đồng bộ `role_id` theo `role`, không tự nâng quyền.

Các thao tác từ quản lý người dùng (`PATCH /api/users/:id`, `PATCH /api/users/:id/status`, `POST /api/users/:id/force-reset-password`, `POST /api/users/:id/reward-points`) tạo yêu cầu chờ duyệt và trả `202`. Thay đổi thông tin admin qua `PATCH /api/auth/profile` và yêu cầu tự đổi mật khẩu qua `PATCH /api/auth/change-password` cũng trả `202`. Không có thay đổi nào được áp dụng tại bước tạo yêu cầu.

Admin xem hàng chờ tại `/admin/account-approvals`. Người tạo yêu cầu cho tài khoản khác được tính là người duyệt đầu tiên; một admin khác phải xác nhận bằng mật khẩu hiện tại. Khi tài khoản đích là admin, tài khoản đích không được duyệt và cần hai admin khác xác nhận. Yêu cầu hết hạn sau 24 giờ. Đổi mật khẩu admin không lưu mật khẩu mới trong yêu cầu: sau khi đủ duyệt, chủ tài khoản nhập lại mật khẩu hiện tại và mật khẩu mới trong hàng chờ. Với yêu cầu đặt lại mật khẩu, OTP chỉ được gửi sau khi đủ duyệt; luồng quên mật khẩu công khai không tự gửi OTP cho admin.

Hệ thống cần MongoDB hỗ trợ transaction để áp dụng thay đổi, lưu trạng thái yêu cầu và audit cùng nhau. Cần ít nhất ba admin hoạt động để thay đổi một admin; không thể khóa hoặc hạ quyền khiến còn dưới hai admin hoạt động. Để phục hồi khi chỉ còn hai admin, họ có thể cùng duyệt nâng một tài khoản đã xác minh email và đang hoạt động lên admin.

API hàng chờ (chỉ admin): `GET /api/users/approval-requests`, `POST /api/users/approval-requests/:id/approve`, `POST /api/users/approval-requests/:id/reject`, `POST /api/users/approval-requests/:id/send-reset`. Phê duyệt yêu cầu trường `current_password`; từ chối yêu cầu trường `reason`.
