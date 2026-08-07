import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  HiOutlineCamera,
  HiOutlineCheckCircle,
  HiOutlinePhotograph,
  HiOutlinePrinter,
  HiOutlineRefresh,
  HiOutlineStop,
  HiOutlineTicket,
  HiOutlineXCircle,
} from "react-icons/hi";
import { checkInTicketQr, verifyTicketQr } from "../services/ticketAdminService";
import { showToast } from "../../utils/toast";

const SCANNER_ELEMENT_ID = "ticket-qr-reader";

const ticketStatusLabels = {
  VALID: "Chưa sử dụng",
  CHECKED_IN: "Đã check-in",
  CANCELLED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getApiMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const getCameraErrorMessage = (error) => {
  const errorName = String(error?.name || "").toLowerCase();
  const errorText = String(error?.message || error || "").toLowerCase();

  if (errorName.includes("notallowed") || errorText.includes("permission")) {
    return "Trình duyệt chưa cho phép sử dụng camera. Hãy bật quyền camera rồi tải lại trang.";
  }

  if (
    errorName.includes("notfound")
    || errorText.includes("device not found")
    || errorText.includes("no camera")
  ) {
    return "Không tìm thấy camera trên thiết bị này. Hãy kiểm tra kết nối webcam.";
  }

  if (
    errorName.includes("notreadable")
    || errorName.includes("trackstarterror")
    || errorText.includes("could not start video source")
    || errorText.includes("starting videoinput failed")
  ) {
    return "Camera đang được ứng dụng hoặc tab khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.";
  }

  if (errorName.includes("overconstrained") || errorText.includes("constraint")) {
    return "Camera không hỗ trợ cấu hình quét hiện tại. Hãy thử lại hoặc chọn tải ảnh QR.";
  }

  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    return "Trình duyệt không hỗ trợ camera trong kết nối hiện tại. Hãy dùng localhost hoặc HTTPS.";
  }

  return "Không thể khởi động camera. Hãy đóng ứng dụng đang dùng webcam, tải lại trang rồi thử lại.";
};

const selectPreferredCamera = (cameras) => {
  const rearCameraPattern = /back|rear|environment|sau/i;
  return cameras.find((camera) => rearCameraPattern.test(camera.label || "")) || cameras[0] || null;
};

const getResponsiveQrBox = (viewfinderWidth, viewfinderHeight) => {
  const availableSize = Math.min(viewfinderWidth, viewfinderHeight);
  const qrBoxSize = Math.max(50, Math.min(Math.floor(availableSize * 0.8), 380));
  return { width: qrBoxSize, height: qrBoxSize };
};

const getStatusClass = (status) => {
  if (status === "VALID") return "status-badge status-now-showing";
  if (status === "CHECKED_IN") return "status-badge status-coming-soon";
  return "status-badge status-ended";
};

const getVerificationTone = (result) => {
  if (result?.success) return "success";
  if (result?.data?.status === "CHECKED_IN") return "warning";
  return "error";
};

const TicketScannerPage = () => {
  const scannerRef = useRef(null);
  const mountedRef = useRef(false);
  const handlingQrRef = useRef(false);
  const checkingInRef = useRef(false);
  const lastQrTokenRef = useRef("");
  const fileInputRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("Camera chưa bật. Hãy cấp quyền camera khi trình duyệt hỏi.");
  const [processing, setProcessing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [printingTicket, setPrintingTicket] = useState(false);
  const [currentQrToken, setCurrentQrToken] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [checkInResult, setCheckInResult] = useState(null);

  const ticket = verifyResult?.data || checkInResult?.data || null;
  const actionResult = checkInResult;
  const canCheckIn = Boolean(verifyResult?.data?.verification?.canCheckIn && !checkingIn);
  const isAlreadyCheckedInResult = ticket?.verification?.result === "ALREADY_CHECKED_IN";

  const scannerConfig = useMemo(
    () => ({
      fps: 15,
      qrbox: getResponsiveQrBox,
      disableFlip: false,
    }),
    [],
  );

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      if (mountedRef.current) setCameraActive(false);
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch (error) {
      if (mountedRef.current) {
        setCameraMessage(getApiMessage(error, "Không thể dừng camera."));
      }
    } finally {
      scannerRef.current = null;
      handlingQrRef.current = false;
      if (mountedRef.current) setCameraActive(false);
    }
  }, []);

  const handleQrToken = useCallback(async (decodedText) => {
    const qrToken = String(decodedText || "").trim();
    if (!qrToken || handlingQrRef.current) return;
    if (qrToken === lastQrTokenRef.current && processing) return;

    handlingQrRef.current = true;
    lastQrTokenRef.current = qrToken;

    if (mountedRef.current) {
      setProcessing(true);
      setCurrentQrToken(qrToken);
      setCheckInResult(null);
      setVerifyResult(null);
      setCameraMessage("Đã đọc QR. Đang xác minh vé...");
    }

    await stopScanner();

    try {
      const response = await verifyTicketQr(qrToken);
      if (!mountedRef.current) return;
      setVerifyResult(response);
      setCameraMessage(response.message || "Đã xác minh vé.");
      showToast(response.success ? "success" : "error", response.message || "Đã xác minh vé.");
    } catch (error) {
      const message = getApiMessage(error, "Không thể xác minh mã QR.");
      if (!mountedRef.current) return;
      setVerifyResult({
        success: false,
        message,
        data: error?.response?.data?.data || null,
      });
      setCameraMessage(message);
      showToast("error", message);
    } finally {
      handlingQrRef.current = false;
      if (mountedRef.current) setProcessing(false);
    }
  }, [processing, stopScanner]);

  const startScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning || processing) return;

    try {
      setCameraMessage("Đang bật camera...");

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is unavailable in the current context");
      }

      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
        } catch {
          // Recreate a clean scanner instance after a failed previous attempt.
        }
        scannerRef.current = null;
      }

      const cameras = await Html5Qrcode.getCameras();
      const selectedCamera = selectPreferredCamera(cameras);
      if (!selectedCamera) throw new Error("No camera found");

      scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      });

      await scannerRef.current.start(
        selectedCamera.id,
        {
          ...scannerConfig,
          videoConstraints: {
            deviceId: { exact: selectedCamera.id },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        handleQrToken,
      );

      if (mountedRef.current) {
        setCameraActive(true);
        setCameraMessage("Đưa mã QR vé vào khung camera để xác minh.");
      }
    } catch (error) {
      if (!mountedRef.current) return;
      setCameraActive(false);

      const failedScanner = scannerRef.current;
      if (failedScanner) {
        try {
          if (failedScanner.isScanning) await failedScanner.stop();
          await failedScanner.clear();
        } catch {
          // The scanner may already be partially disposed after start() fails.
        }
      }

      scannerRef.current = null;
      const message = getCameraErrorMessage(error);
      setCameraMessage(message);
      showToast("error", message);
    }
  }, [handleQrToken, processing, scannerConfig]);

  const handleCheckIn = async () => {
    if (!currentQrToken || checkingIn || checkingInRef.current || !canCheckIn) return;

    try {
      checkingInRef.current = true;
      setCheckingIn(true);
      setCheckInResult(null);
      const response = await checkInTicketQr(currentQrToken);
      setCheckInResult(response);
      setVerifyResult(response);
      setCameraMessage(response.message || "Check-in vé thành công.");
      showToast("success", response.message || "Check-in vé thành công.");
    } catch (error) {
      const message = getApiMessage(error, "Không thể check-in vé.");
      setCheckInResult({
        success: false,
        message,
        data: error?.response?.data?.data || ticket,
      });
      setCameraMessage(message);
      showToast("error", message);
    } finally {
      checkingInRef.current = false;
      setCheckingIn(false);
    }
  };

  const handleScanNext = async () => {
    setVerifyResult(null);
    setCheckInResult(null);
    setCurrentQrToken("");
    lastQrTokenRef.current = "";
    handlingQrRef.current = false;
    await startScanner();
  };

  const handlePrintTicket = async () => {
    if (!ticket || printingTicket) return;

    try {
      setPrintingTicket(true);
      const { downloadTicketPdf } = await import("../utils/ticketPdf");
      await downloadTicketPdf(ticket, currentQrToken);
      showToast("success", "Đã tải file PDF của vé.");
    } catch (error) {
      showToast("error", getApiMessage(error, "Không thể tạo file PDF của vé."));
    } finally {
      setPrintingTicket(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || processing) return;

    try {
      setCameraMessage("Đang đọc ảnh QR...");
      const scanner = new Html5Qrcode("ticket-qr-file-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      const decodedText = await scanner.scanFile(file, true);
      await scanner.clear();
      await handleQrToken(decodedText);
    } catch {
      const message = "Không đọc được mã QR từ ảnh đã chọn.";
      setCameraMessage(message);
      setVerifyResult({
        success: false,
        message,
        data: null,
      });
      showToast("error", message);
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      const scanner = scannerRef.current;
      if (scanner?.isScanning) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      } else if (scanner) {
        scanner.clear().catch(() => {});
      }
      scannerRef.current = null;
    };
  }, []);

  const verificationTone = getVerificationTone(verifyResult);

  return (
    <div className="ticket-scanner-page">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quét vé QR</h1>
          <p>Xác minh vé điện tử và check-in khách tại cửa phòng chiếu.</p>
        </div>
        <button className="btn btn-secondary" onClick={handleScanNext} type="button">
          <HiOutlineRefresh />
          Quét vé tiếp theo
        </button>
      </div>

      <div className="ticket-scanner-grid">
        <section className="ticket-scanner-panel">
          <div className="ticket-scanner-panel-header">
            <div>
              <h2>Camera</h2>
              <p>Ưu tiên camera sau trên điện thoại. Có thể tải ảnh QR nếu không dùng được camera.</p>
            </div>
            <HiOutlineCamera />
          </div>

          <div className="ticket-camera-frame">
            <div id={SCANNER_ELEMENT_ID} className="ticket-camera-reader" />
            {!cameraActive && (
              <div className="ticket-camera-placeholder">
                <HiOutlineCamera />
                <span>{cameraMessage}</span>
              </div>
            )}
          </div>

          <div id="ticket-qr-file-reader" className="ticket-file-reader" />

          <div className="ticket-scanner-actions">
            <button className="btn btn-primary" disabled={cameraActive || processing} onClick={startScanner} type="button">
              <HiOutlineCamera />
              Bật camera
            </button>
            <button className="btn btn-secondary" disabled={!cameraActive} onClick={stopScanner} type="button">
              <HiOutlineStop />
              Dừng camera
            </button>
            <button className="btn btn-secondary" disabled={processing} onClick={() => fileInputRef.current?.click()} type="button">
              <HiOutlinePhotograph />
              Tải ảnh QR
            </button>
            <input
              ref={fileInputRef}
              accept="image/*"
              className="ticket-file-input"
              onChange={handleFileChange}
              type="file"
            />
          </div>

          <div className={`ticket-scanner-message ${processing ? "loading" : ""}`}>
            {processing ? "Đang xử lý mã QR..." : cameraMessage}
          </div>
        </section>

        <section className={`ticket-scanner-panel ticket-result-panel ${verificationTone}`}>
          <div className="ticket-scanner-panel-header">
            <div>
              <h2>Kết quả xác minh</h2>
              <p>Verify chỉ kiểm tra vé, chưa tự động check-in.</p>
            </div>
            <HiOutlineTicket />
          </div>

          {!verifyResult ? (
            <div className="ticket-result-empty">
              <HiOutlineTicket />
              <p>Chưa có vé được quét.</p>
            </div>
          ) : (
            <>
              <div className="ticket-result-summary">
                {verifyResult.success ? <HiOutlineCheckCircle /> : <HiOutlineXCircle />}
                <div>
                  <strong>{verifyResult.message}</strong>
                  <span>{ticket?.ticketCode || "Không có thông tin vé"}</span>
                </div>
              </div>

              {ticket && (
                <div className="ticket-info-grid">
                  <InfoItem label="Mã vé" value={ticket.ticketCode} />
                  <InfoItem label="Phim" value={ticket.movie?.title || "-"} />
                  <InfoItem label="Suất chiếu" value={formatDateTime(ticket.showtime?.startTime)} />
                  <InfoItem label="Phòng" value={ticket.room?.name || "-"} />
                  <InfoItem label="Ghế" value={ticket.seat?.label || ticket.seatLabel || "-"} />
                  <InfoItem label="Loại ghế" value={ticket.seat?.type || "-"} />
                  <InfoItem label="Giá vé" value={currencyFormatter.format(Number(ticket.price || 0))} />
                  <InfoItem label="Trạng thái" value={ticketStatusLabels[ticket.status] || ticket.status || "-"} />
                  <InfoItem label="Thời gian check-in" value={formatDateTime(ticket.checkedInAt)} />
                  <InfoItem label="Mã đơn" value={ticket.booking?.bookingCode || "-"} />
                </div>
              )}
            </>
          )}
        </section>

        <section className="ticket-scanner-panel ticket-action-panel">
          <div className="ticket-scanner-panel-header">
            <div>
              <h2>Hành động</h2>
              <p>Admin xác nhận thủ công sau khi xem thông tin vé.</p>
            </div>
          </div>

          {ticket?.status && (
            <span className={getStatusClass(ticket.status)}>
              {ticketStatusLabels[ticket.status] || ticket.status}
            </span>
          )}

          {ticket?.status !== "CHECKED_IN" && (
            <button className="btn btn-success ticket-checkin-btn" disabled={!canCheckIn || checkingIn} onClick={handleCheckIn} type="button">
              <HiOutlineCheckCircle />
              {checkingIn ? "Đang check-in..." : "Xác nhận check-in"}
            </button>
          )}

          <button
            className="btn btn-primary ticket-print-btn"
            disabled={!ticket || processing || checkingIn || printingTicket}
            onClick={handlePrintTicket}
            type="button"
          >
            <HiOutlinePrinter />
            {printingTicket ? "Đang tạo PDF..." : "In vé PDF"}
          </button>

          {isAlreadyCheckedInResult && (
            <div className="ticket-checkin-feedback error">
              Vé này đã được check-in trước đó.
            </div>
          )}

          {actionResult && (
            <div className={`ticket-checkin-feedback ${actionResult.success ? "success" : "error"}`}>
              {actionResult.message}
            </div>
          )}

          <button className="btn btn-secondary" disabled={processing || checkingIn} onClick={handleScanNext} type="button">
            <HiOutlineRefresh />
            Quét vé tiếp theo
          </button>
        </section>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }) => (
  <div className="ticket-info-item">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default TicketScannerPage;
