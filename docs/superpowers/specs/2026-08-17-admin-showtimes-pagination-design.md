# Admin Showtimes Pagination Design

## Goal

Trang `/admin/showtimes` hiển thị tối đa 10 hàng suất chiếu trên mỗi trang và luôn ưu tiên lịch có thời gian chiếu mới nhất.

## Scope

- Giữ nguyên cách giao diện hiện tại gộp các suất cùng phim, phòng, ngày và bảng giá vào một hàng.
- Một đơn vị phân trang là một hàng nhóm đang hiển thị, không phải một chip khung giờ riêng lẻ.
- Chỉ thay đổi hành vi của trang quản trị suất chiếu. API `/showtimes` và các trang khách hàng không đổi.

## Data Flow

1. Trang tải toàn bộ suất chiếu phù hợp với các bộ lọc hiện tại từ API.
2. Dữ liệu được lọc bổ sung theo chuỗi tìm kiếm không dấu như hiện tại.
3. Các suất chiếu được gộp theo quy tắc hiện có.
4. Khung giờ trong từng nhóm được sắp xếp theo `start_time` giảm dần.
5. Các nhóm được sắp xếp theo khung giờ mới nhất của nhóm, giảm dần.
6. Danh sách nhóm đã sắp xếp được cắt thành các trang, mỗi trang tối đa 10 nhóm.

Nếu hai suất có cùng `start_time`, thứ tự ổn định hiện có được giữ nguyên; không bổ sung tiêu chí sắp xếp nghiệp vụ mới.

## Pagination Behavior

- Trang đầu tiên là trang 1.
- Điều khiển gồm “Trang trước”, “Trang X / Y” và “Trang sau”, dùng lại style phân trang hiện có trong admin.
- Nút “Trang trước” bị vô hiệu hóa ở trang 1; nút “Trang sau” bị vô hiệu hóa ở trang cuối.
- Khi từ khóa tìm kiếm hoặc bất kỳ bộ lọc phim, phòng, ngày, trạng thái nào thay đổi, trang hiện tại trở về 1.
- Khi làm mới, tạo, cập nhật hoặc hủy làm số trang giảm, trang hiện tại được kẹp về trang hợp lệ cuối cùng.
- Khi không có dữ liệu, giữ nguyên empty state hiện tại và không hiển thị điều khiển phân trang.
- Khi chỉ có một trang, vẫn hiển thị điều khiển để giao diện nhất quán với các trang quản trị liên quan.

## UI and Accessibility

- Điều khiển phân trang nằm ngay dưới bảng, bên trong card, theo component vocabulary của admin.
- Các nút dùng `type="button"`, trạng thái `disabled` thật và nhãn tiếng Việt hiện có.
- Không thêm animation, thư viện hay kiểu điều khiển mới.
- Bố cục tiếp tục xuống dòng theo CSS `.pagination` hiện có trên màn hình hẹp.

## Error Handling and Edge Cases

- Giá trị `start_time` không hợp lệ được xem là cũ nhất để không đẩy dữ liệu lỗi lên đầu.
- Tổng số trang tối thiểu là 1 trong phép tính nội bộ, nhưng paginator không xuất hiện khi danh sách rỗng.
- Không thay đổi hành vi tải lỗi, phản hồi tạo/sửa/hủy hoặc logic quyền chỉnh sửa hiện có.

## Testing

- Tách logic sắp xếp và phân trang thành hàm thuần để kiểm thử độc lập.
- Kiểm thử thứ tự nhóm mới nhất trước, thứ tự chip trong nhóm mới nhất trước, giới hạn 10 hàng, trang cuối thiếu 10 hàng và xử lý thời gian không hợp lệ.
- Chạy lint/build frontend và kiểm tra trực quan một lượt ở desktop lẫn mobile sau khi triển khai.

## Non-goals

- Không thêm phân trang server-side.
- Không thay đổi cấu trúc nhóm suất chiếu.
- Không thay đổi API hoặc thứ tự dữ liệu cho trang khách hàng.
- Không thêm ô nhập số trang hoặc lựa chọn kích thước trang.
