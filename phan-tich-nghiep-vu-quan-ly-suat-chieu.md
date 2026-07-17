# Phân tích nghiệp vụ chức năng quản lý suất chiếu

## 1. Mục tiêu chức năng

Chức năng quản lý suất chiếu giúp quản trị viên hoặc nhân viên rạp tạo, cập nhật, theo dõi và ngừng các suất chiếu phim. Suất chiếu là dữ liệu trung tâm để khách hàng có thể chọn phim, chọn ngày giờ, chọn phòng chiếu và đặt vé.

Nói ngắn gọn: nếu không có suất chiếu hợp lệ thì khách hàng không thể đặt vé.

## 2. Đối tượng sử dụng

Các tác nhân chính gồm:

| Tác nhân | Vai trò |
|---|---|
| Quản trị viên | Quản lý toàn bộ suất chiếu của hệ thống |
| Nhân viên quản lý rạp | Tạo và điều chỉnh suất chiếu tại rạp được phân quyền |
| Khách hàng | Xem danh sách suất chiếu có thể đặt vé |
| Hệ thống đặt vé | Kiểm tra suất chiếu, ghế trống, thời gian và trạng thái trước khi cho đặt vé |

## 3. Thông tin của một suất chiếu

Một suất chiếu thường gồm các thông tin sau:

| Thuộc tính | Ý nghĩa |
|---|---|
| Mã suất chiếu | Định danh duy nhất |
| Phim | Phim được chiếu |
| Rạp | Rạp nơi diễn ra suất chiếu |
| Phòng chiếu | Phòng cụ thể trong rạp |
| Ngày chiếu | Ngày diễn ra suất chiếu |
| Giờ bắt đầu | Thời gian bắt đầu chiếu |
| Giờ kết thúc | Có thể tính tự động theo thời lượng phim |
| Giá vé | Giá áp dụng cho suất chiếu |
| Loại suất chiếu | 2D, 3D, IMAX, phụ đề, lồng tiếng... |
| Trạng thái | Sắp chiếu, đang mở bán, đã chiếu, đã hủy |
| Số ghế còn trống | Phục vụ hiển thị và đặt vé |

## 4. Quy trình nghiệp vụ chính

Quy trình quản lý suất chiếu có thể mô tả như sau:

1. Nhân viên chọn phim cần tạo suất chiếu.
2. Chọn rạp và phòng chiếu.
3. Chọn ngày chiếu và giờ bắt đầu.
4. Hệ thống tự tính giờ kết thúc dựa trên thời lượng phim.
5. Hệ thống kiểm tra phòng chiếu có bị trùng lịch hay không.
6. Nhân viên nhập hoặc chọn giá vé.
7. Nhân viên lưu suất chiếu.
8. Suất chiếu được hiển thị cho khách hàng nếu đang ở trạng thái mở bán.
9. Khách hàng có thể chọn suất chiếu và đặt vé.

## 5. Các chức năng chi tiết

### 5.1. Thêm suất chiếu

Cho phép nhân viên tạo suất chiếu mới. Khi thêm, hệ thống cần kiểm tra:

- Phim phải đang được phép chiếu.
- Rạp và phòng chiếu phải đang hoạt động.
- Thời gian chiếu không được nằm trong quá khứ.
- Phòng chiếu không được trùng với suất chiếu khác.
- Giữa hai suất chiếu nên có thời gian dọn phòng, ví dụ 10-15 phút.
- Giá vé phải hợp lệ.

Ví dụ: phim dài 120 phút, suất bắt đầu lúc 19:00, thời gian kết thúc là 21:00. Nếu cần 15 phút dọn phòng, suất tiếp theo trong cùng phòng chỉ được bắt đầu từ 21:15 trở đi.

### 5.2. Cập nhật suất chiếu

Cho phép chỉnh sửa thông tin suất chiếu, nhưng cần giới hạn tùy trạng thái:

- Nếu chưa có vé nào được đặt: có thể sửa phim, phòng, giờ chiếu, giá vé.
- Nếu đã có vé được đặt: nên hạn chế sửa các thông tin quan trọng như phim, phòng, giờ chiếu.
- Nếu suất chiếu đã diễn ra: không được chỉnh sửa.
- Nếu thay đổi giờ chiếu khi đã có khách đặt vé, cần có cơ chế thông báo hoặc hoàn vé.

### 5.3. Xóa hoặc hủy suất chiếu

Trong thực tế, không nên xóa cứng suất chiếu nếu đã phát sinh dữ liệu đặt vé. Nên dùng trạng thái **Đã hủy**.

Quy tắc:

- Suất chiếu chưa có vé: có thể xóa hoặc hủy.
- Suất chiếu đã có vé: chỉ được hủy, không xóa khỏi hệ thống.
- Khi hủy cần cập nhật trạng thái vé, đơn đặt vé và thông báo cho khách hàng.

### 5.4. Tìm kiếm và lọc suất chiếu

Người quản trị cần có màn hình danh sách suất chiếu với các bộ lọc:

- Theo phim.
- Theo rạp.
- Theo phòng chiếu.
- Theo ngày chiếu.
- Theo trạng thái.
- Theo khoảng thời gian.
- Theo loại suất chiếu.

### 5.5. Xem chi tiết suất chiếu

Màn hình chi tiết nên hiển thị:

- Thông tin phim.
- Rạp, phòng chiếu.
- Ngày giờ chiếu.
- Sơ đồ ghế.
- Số ghế đã đặt.
- Số ghế còn trống.
- Doanh thu tạm tính.
- Danh sách vé hoặc đơn đặt vé liên quan.

## 6. Trạng thái suất chiếu

Một suất chiếu có thể có các trạng thái sau:

| Trạng thái | Ý nghĩa |
|---|---|
| Nháp | Đã tạo nhưng chưa mở bán |
| Đang mở bán | Khách hàng có thể đặt vé |
| Ngừng bán | Không cho đặt thêm vé |
| Đang chiếu | Suất chiếu đang diễn ra |
| Đã chiếu | Suất chiếu đã kết thúc |
| Đã hủy | Suất chiếu bị hủy |

Với đồ án tốt nghiệp, có thể đơn giản hóa thành:

- Sắp chiếu
- Đang mở bán
- Đã chiếu
- Đã hủy

## 7. Quy tắc nghiệp vụ quan trọng

Một số quy tắc nên đưa vào phần phân tích:

- Một phòng chiếu tại một thời điểm chỉ được có một suất chiếu.
- Không được tạo suất chiếu có thời gian bắt đầu nhỏ hơn thời gian hiện tại.
- Không được tạo suất chiếu cho phim đã ngừng chiếu.
- Không được tạo suất chiếu cho phòng đang bảo trì.
- Không được xóa suất chiếu đã có vé đặt.
- Khi suất chiếu đã có vé, việc thay đổi giờ chiếu hoặc phòng chiếu cần bị hạn chế.
- Chỉ hiển thị cho khách hàng các suất chiếu còn hiệu lực và đang mở bán.
- Suất chiếu đã kết thúc không được đặt vé.
- Số lượng vé bán ra không được vượt quá số ghế của phòng chiếu.

## 8. Dữ liệu liên quan

Chức năng quản lý suất chiếu liên kết với nhiều bảng hoặc đối tượng khác:

- Phim
- Rạp chiếu
- Phòng chiếu
- Ghế
- Suất chiếu
- Vé
- Đơn đặt vé
- Thanh toán
- Giá vé

Mối quan hệ cơ bản:

- Một phim có nhiều suất chiếu.
- Một rạp có nhiều phòng chiếu.
- Một phòng chiếu có nhiều suất chiếu.
- Một suất chiếu có nhiều vé.
- Một vé thuộc một ghế trong một suất chiếu.

## 9. Gợi ý bảng dữ liệu `SuatChieu`

Ví dụ bảng `SuatChieu`:

| Tên trường | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| MaSuatChieu | int / UUID | Khóa chính |
| MaPhim | int | Khóa ngoại |
| MaRap | int | Khóa ngoại |
| MaPhong | int | Khóa ngoại |
| NgayChieu | date | Ngày chiếu |
| GioBatDau | time / datetime | Giờ bắt đầu |
| GioKetThuc | time / datetime | Giờ kết thúc |
| GiaVe | decimal | Giá vé cơ bản |
| LoaiChieu | varchar | 2D, 3D, IMAX... |
| TrangThai | varchar | Trạng thái suất chiếu |
| CreatedAt | datetime | Ngày tạo |
| UpdatedAt | datetime | Ngày cập nhật |

## 10. Luồng use case: Thêm suất chiếu

**Tên use case:** Thêm suất chiếu

**Tác nhân:** Quản trị viên / Nhân viên rạp

**Tiền điều kiện:**

- Người dùng đã đăng nhập.
- Người dùng có quyền quản lý suất chiếu.
- Phim, rạp và phòng chiếu đã tồn tại trong hệ thống.

**Luồng chính:**

1. Người dùng mở màn hình quản lý suất chiếu.
2. Chọn chức năng thêm suất chiếu.
3. Hệ thống hiển thị form nhập thông tin.
4. Người dùng chọn phim, rạp, phòng chiếu, ngày giờ chiếu, giá vé.
5. Người dùng bấm lưu.
6. Hệ thống kiểm tra dữ liệu hợp lệ.
7. Hệ thống kiểm tra trùng lịch phòng chiếu.
8. Nếu hợp lệ, hệ thống lưu suất chiếu.
9. Hệ thống thông báo thêm suất chiếu thành công.

**Luồng ngoại lệ:**

- Nếu thiếu dữ liệu bắt buộc, hệ thống báo lỗi.
- Nếu phòng chiếu bị trùng lịch, hệ thống yêu cầu chọn thời gian khác.
- Nếu phim đã ngừng chiếu, hệ thống không cho tạo suất chiếu.
- Nếu thời gian chiếu nằm trong quá khứ, hệ thống báo lỗi.

## 11. Đầu ra mong muốn của chức năng

Sau khi hoàn thành chức năng quản lý suất chiếu, hệ thống cần cho phép:

- Quản trị viên tạo suất chiếu mới.
- Quản trị viên cập nhật hoặc hủy suất chiếu.
- Quản trị viên xem danh sách suất chiếu.
- Khách hàng xem được suất chiếu hợp lệ để đặt vé.
- Hệ thống đảm bảo không xảy ra trùng lịch phòng chiếu.
- Hệ thống không cho đặt vé với suất chiếu đã hết hạn hoặc đã hủy.

Nội dung này có thể đưa vào báo cáo ở mục **Phân tích nghiệp vụ chức năng quản lý suất chiếu** hoặc tách thành các mục nhỏ: mô tả chức năng, tác nhân, quy trình nghiệp vụ, quy tắc nghiệp vụ, use case và dữ liệu liên quan.
