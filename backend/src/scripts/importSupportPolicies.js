import "dotenv/config";
import mongoose from "mongoose";
import { getMongoUri } from "../config/db.js";
import Policy from "../models/Policy.js";
import { createPolicy } from "../services/policyService.js";

// Nội dung được biên tập cho chức năng hiện có của AuraCinema từ bốn tài liệu tham khảo.
// Không đưa thông tin rạp, ưu đãi, fanpage hoặc cam kết hoàn tiền của Beta Cinemas vào đây.
export const policies = [
  {
    title: "Thanh toán trực tuyến và xác nhận vé",
    surface: "payment",
    summary: "Kiểm tra đơn, hoàn tất giao dịch và tra cứu vé sau khi thanh toán.",
    content: [
      "Trước khi thanh toán, vui lòng kiểm tra phim, ngày chiếu, suất chiếu, phòng, ghế, dịch vụ đi kèm và tổng số tiền trên trang xác nhận đơn. Chỉ tiếp tục khi các thông tin này đúng với lựa chọn của bạn.",
      "AuraCinema hỗ trợ các phương thức thanh toán hiển thị tại bước thanh toán, gồm SePay và VNPay khi hệ thống đang cung cấp. Bạn cần hoàn tất xác thực theo hướng dẫn của ngân hàng hoặc cổng thanh toán. Đừng chia sẻ mật khẩu, mã OTP ngân hàng hoặc thông tin thẻ cho người khác.",
      "Đơn và ghế chỉ được giữ đến thời điểm hết hạn hiển thị trên website. Khi giao dịch hết hạn mà hệ thống chưa xác nhận thanh toán thành công, đơn không còn hiệu lực và ghế được mở lại. Nếu giao dịch đã được ngân hàng ghi nhận nhưng vé chưa xuất hiện, vui lòng giữ mã đơn và mã giao dịch để AuraCinema kiểm tra; không thanh toán lại ngay cho cùng một đơn.",
      "Sau khi hệ thống xác nhận thanh toán thành công, bạn có thể xem vé trong mục Vé của tôi. Hãy kiểm tra cả hộp thư rác nếu đang chờ email thông báo. Việc đổi, hủy hoặc hoàn tiền đối với vé đã thanh toán được xem xét theo chính sách đang áp dụng và kết quả đối soát giao dịch, không dựa riêng vào thông báo từ trình duyệt.",
    ].join("\n\n"),
    requires_confirmation: true,
    display_order: 1,
  },
  {
    title: "Điều khoản sử dụng AuraCinema",
    surface: "terms",
    summary: "Quy định sử dụng tài khoản, nội dung website và dịch vụ đặt vé.",
    content: [
      "Khi truy cập AuraCinema, bạn cần sử dụng website đúng mục đích và cung cấp thông tin chính xác khi đăng ký tài khoản hoặc đặt vé. Bạn có trách nhiệm bảo vệ mật khẩu, mã xác minh và thông tin đăng nhập của mình.",
      "Thông tin phim, suất chiếu, giá và ưu đãi có thể được cập nhật. Giá và điều kiện áp dụng cho đơn được thể hiện tại bước xác nhận trước khi thanh toán. Bạn cần kiểm tra độ tuổi phù hợp với phim và chuẩn bị giấy tờ xác minh khi rạp yêu cầu.",
      "Bạn không được sử dụng website để gian lận đặt vé, can thiệp vào hệ thống, lấy dữ liệu trái phép hoặc đăng tải nội dung vi phạm quyền của người khác. Các nội dung, hình ảnh và dấu hiệu nhận diện trên website thuộc về chủ sở hữu tương ứng.",
      "Nếu phát hiện giao dịch hoặc tài khoản có dấu hiệu bất thường, AuraCinema có thể tạm dừng xử lý để xác minh và hỗ trợ. Những yêu cầu liên quan đến đơn hàng cần kèm mã đơn và thông tin giao dịch để được tra cứu chính xác.",
    ].join("\n\n"),
    display_order: 2,
  },
  {
    title: "Hướng dẫn đặt vé trực tuyến",
    surface: "booking",
    summary: "Các bước chọn phim, ghế, thanh toán và nhận vé trên website.",
    content: [
      "Bước 1 — Đăng nhập tài khoản AuraCinema. Nếu chưa có tài khoản, hãy đăng ký và hoàn tất xác minh email theo hướng dẫn trên website.",
      "Bước 2 — Mở Lịch chiếu hoặc trang phim, chọn ngày và suất chiếu phù hợp. Chọn ghế còn trống; bạn có thể thêm bắp nước hoặc áp dụng ưu đãi khi hệ thống cho phép.",
      "Bước 3 — Kiểm tra phim, ngày, giờ, phòng, ghế, dịch vụ đi kèm, ưu đãi và tổng tiền trên trang xác nhận. Nếu cần sửa lựa chọn, hãy quay lại trước khi hết thời hạn giữ ghế hoặc thanh toán.",
      "Bước 4 — Chọn phương thức thanh toán được hiển thị và hoàn tất giao dịch trên trang của đối tác. Khi thanh toán thành công và AuraCinema đã xác nhận, vé sẽ xuất hiện trong mục Vé của tôi.",
      "Nếu bộ đếm kết thúc hoặc thanh toán bị hủy, hãy trở lại Lịch chiếu để tạo đơn mới. Nếu đã bị trừ tiền nhưng chưa thấy vé, hãy giữ mã đơn và mã giao dịch để bộ phận hỗ trợ kiểm tra.",
    ].join("\n\n"),
    display_order: 3,
  },
  {
    title: "Tôi chưa nhận được email xác nhận vé",
    surface: "faq",
    summary: "Cách kiểm tra vé khi email đến chậm hoặc không thấy trong hộp thư.",
    content: "Hãy kiểm tra mục Vé của tôi trong tài khoản và tìm email ở hộp thư rác. Nếu đơn đã thanh toán thành công nhưng vẫn không có vé, vui lòng cung cấp mã đơn và email tài khoản cho bộ phận hỗ trợ để kiểm tra. Trạng thái đơn trên AuraCinema là căn cứ tra cứu chính.",
    display_order: 4,
  },
  {
    title: "Giao dịch bị trừ tiền nhưng chưa có vé",
    surface: "faq",
    summary: "Cần đối soát giao dịch trước khi thử thanh toán lại.",
    content: "Đừng thanh toán lại ngay cho cùng một đơn. Hãy lưu mã đơn, thời điểm thanh toán, số tiền và mã giao dịch từ ngân hàng hoặc cổng thanh toán, rồi liên hệ bộ phận hỗ trợ. AuraCinema sẽ kiểm tra trạng thái đơn và đối soát với đối tác thanh toán trước khi hướng dẫn bước tiếp theo.",
    display_order: 5,
  },
  {
    title: "Tôi có thể đổi hoặc hủy vé đã thanh toán không?",
    surface: "faq",
    summary: "Kiểm tra chính sách đang áp dụng cho đơn vé của bạn.",
    content: "Vui lòng kiểm tra kỹ thông tin trước khi thanh toán. Đơn đã thanh toán không thể tự hủy hoặc đổi trên website. Nếu có sự cố về giao dịch, suất chiếu hoặc thông tin vé, hãy liên hệ bộ phận hỗ trợ và cung cấp mã đơn để được xem xét theo chính sách đang áp dụng.",
    display_order: 6,
  },
  {
    title: "Vì sao tôi không chọn được một số suất chiếu hoặc ghế?",
    surface: "faq",
    summary: "Suất chiếu, độ tuổi và tình trạng ghế có thể giới hạn lựa chọn.",
    content: "Một ghế có thể đang được người khác giữ, đã đặt hoặc không còn khả dụng. Suất chiếu cũng có thể đã bắt đầu hoặc không phù hợp với điều kiện đặt vé. Hãy tải lại Lịch chiếu, chọn suất và ghế còn trống; kiểm tra phân loại độ tuổi của phim trước khi xác nhận.",
    display_order: 7,
  },
];

const apply = process.argv.includes("--apply");

try {
  await mongoose.connect(getMongoUri(), { serverSelectionTimeoutMS: 5000, autoIndex: false });
  const existing = await Policy.find({
    deleted_at: null,
    $or: policies.map(({ title, surface }) => ({ title, surface })),
  }).select("title surface status").lean();
  const existingKeys = new Set(existing.map((policy) => `${policy.surface}:${policy.title}`));
  const missing = policies.filter((policy) => !existingKeys.has(`${policy.surface}:${policy.title}`));

  if (apply) {
    for (const policy of missing) {
      await createPolicy({ ...policy, status: "published", source_type: "manual" });
    }
  }

  console.log(JSON.stringify({
    database: mongoose.connection.name,
    mode: apply ? "apply" : "preview",
    existing: existing.length,
    created: apply ? missing.length : 0,
    pending: apply ? 0 : missing.length,
    titles: missing.map((policy) => policy.title),
  }, null, 2));
} catch (error) {
  console.error(`Không thể nhập chính sách: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
