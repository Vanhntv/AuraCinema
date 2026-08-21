import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  HiOutlineCamera,
  HiOutlineCheckCircle,
  HiOutlinePhotograph,
  HiOutlinePrinter,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineStop,
  HiOutlineTicket,
  HiOutlineXCircle,
} from "react-icons/hi";
import {
  checkInTicketQr,
  claimTicketPrint,
  lookupTicketByCode,
  verifyTicketQr,
} from "../services/ticketAdminService";
import { showToast } from "../../utils/toast";
import { lookupBookingOrderPrint, scanPrintBookingOrder } from "../services/bookingAdminService";

const SCANNER_ELEMENT_ID = "ticket-qr-reader";
const BOOKING_QR_PREFIX = "AURA_BOOKING_V2:";

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

const getVerificationTone = (result) => (result?.success ? "success" : "error");

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
  const [printingBookingOrder, setPrintingBookingOrder] = useState(false);
  const [lookingUpTicket, setLookingUpTicket] = useState(false);
  const [ticketCodeQuery, setTicketCodeQuery] = useState("");
  const [currentQrToken, setCurrentQrToken] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [checkInResult, setCheckInResult] = useState(null);
  const [bookingPrintResult, setBookingPrintResult] = useState(null);

  const ticket = checkInResult?.data || verifyResult?.data || null;

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
      setBookingPrintResult(null);
      setCameraMessage("Đã đọc QR. Đang xử lý...");
    }

    await stopScanner();

    try {
      if (qrToken.startsWith(BOOKING_QR_PREFIX)) {
        const response = await lookupBookingOrderPrint({ qrToken });
        if (!mountedRef.current) return;
        setBookingPrintResult({ ...response, action: "lookup" });
        const printableCount = response.data?.tickets?.length || 0;
        const skippedCount = response.data?.skippedTickets?.length || 0;
        const successMessage = printableCount
          ? `Đã tải đơn ${response.data?.booking?.bookingCode || ""}. Bấm In đơn vé để in ${printableCount} vé hợp lệ chưa in${skippedCount ? `, bỏ qua ${skippedCount} vé` : ""}.`
          : `Đã tải đơn ${response.data?.booking?.bookingCode || ""}. Không còn vé hợp lệ chưa in.`;
        setCameraMessage(successMessage);
        showToast("success", successMessage);
      } else {
        const response = await verifyTicketQr(qrToken);
        if (!mountedRef.current) return;
        setVerifyResult(response);
        const successMessage = "Đã tải thông tin vé.";
        setCameraMessage(response.message || successMessage);
        showToast(response.success ? "success" : "error", response.message || successMessage);
      }
    } catch (error) {
      const message = getApiMessage(error, "Không thể đọc thông tin từ mã QR.");
      if (!mountedRef.current) return;
      if (qrToken.startsWith(BOOKING_QR_PREFIX)) {
        setBookingPrintResult({ success: false, message, data: error?.response?.data?.data || null, action: "lookup" });
      } else {
        setVerifyResult({
          success: false,
          message,
          data: error?.response?.data?.data || null,
        });
      }
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

  const handleScanNext = async () => {
    setVerifyResult(null);
    setCheckInResult(null);
    setBookingPrintResult(null);
    setCurrentQrToken("");
    setTicketCodeQuery("");
    lastQrTokenRef.current = "";
    handlingQrRef.current = false;
    await startScanner();
  };

  const handleTicketCodeLookup = async (event) => {
    event.preventDefault();
    const ticketCode = ticketCodeQuery.trim().toUpperCase();
    if (!ticketCode || lookingUpTicket) return;

    try {
      setLookingUpTicket(true);
      setCheckInResult(null);
      setVerifyResult(null);
      setBookingPrintResult(null);
      setCurrentQrToken("");
      await stopScanner();

      const response = await lookupTicketByCode(ticketCode);
      setTicketCodeQuery(ticketCode);
      setCurrentQrToken(response.qrPayload || "");
      setVerifyResult(response);
      setCameraMessage(response.message || "Đã tìm thấy vé.");
      showToast("success", response.message || "Đã tìm thấy vé.");
    } catch (error) {
      const response = error?.response?.data || {};
      const message = response.message || "Không thể tra cứu mã vé.";
      setTicketCodeQuery(ticketCode);
      setCurrentQrToken(response.qrPayload || "");
      setVerifyResult({
        success: false,
        message,
        data: response.data || null,
      });
      setCameraMessage(message);
      showToast("error", message);
    } finally {
      setLookingUpTicket(false);
    }
  };

  const handlePrintTicket = async () => {
    if (!ticket || printingTicket || ticket.canPrint === false || ticket.printedAt) return;

    try {
      setPrintingTicket(true);
      const claimResponse = await claimTicketPrint(currentQrToken);
      const printableTicket = claimResponse.data || ticket;

      if (checkInResult?.data) {
        setCheckInResult((current) => ({ ...current, data: printableTicket }));
      } else {
        setVerifyResult((current) => ({ ...current, data: printableTicket }));
      }

      const { printTicketPdf } = await import("../../utils/ticketPdf");
      await printTicketPdf(printableTicket, currentQrToken);
      showToast("success", "Đã mở hộp thoại in vé.");
    } catch (error) {
      const latestTicket = error?.response?.data?.data;
      if (latestTicket) {
        if (checkInResult?.data) {
          setCheckInResult((current) => ({ ...current, data: latestTicket }));
        } else {
          setVerifyResult((current) => ({ ...current, data: latestTicket }));
        }
      }
      showToast("error", getApiMessage(error, "Không thể mở hộp thoại in vé."));
    } finally {
      setPrintingTicket(false);
    }
  };

  const handlePrintBookingOrder = async () => {
    if (!currentQrToken.startsWith(BOOKING_QR_PREFIX) || printingBookingOrder || processing) return;

    try {
      setPrintingBookingOrder(true);
      const response = await scanPrintBookingOrder(currentQrToken);
      if (!mountedRef.current) return;
      setBookingPrintResult({ ...response, action: "printed" });

      const { printBookingOrder } = await import("../../utils/bookingOrderPrint");
      await printBookingOrder(response.data);

      const printedCount = response.data?.tickets?.length || 0;
      const skippedCount = response.data?.skippedTickets?.length || 0;
      const successMessage = `Đã mở bản in ${printedCount} vé${skippedCount ? `, bỏ qua ${skippedCount} vé` : ""}.`;
      setCameraMessage(successMessage);
      showToast("success", successMessage);
    } catch (error) {
      const message = getApiMessage(error, "Không thể in đơn vé.");
      if (!mountedRef.current) return;
      setBookingPrintResult((current) => ({
        ...(current || {}),
        success: false,
        message,
        data: error?.response?.data?.data || current?.data || null,
        action: current?.action || "lookup",
      }));
      setCameraMessage(message);
      showToast("error", message);
    } finally {
      if (mountedRef.current) setPrintingBookingOrder(false);
    }
  };

  const handleCheckIn = async () => {
    if (!currentQrToken || !ticket || checkingIn || checkingInRef.current) return;

    try {
      checkingInRef.current = true;
      setCheckingIn(true);
      setCheckInResult(null);
      const response = await checkInTicketQr(currentQrToken);
      setCheckInResult(response);
      showToast("success", response.message || "Check-in vé thành công.");
    } catch (error) {
      const message = getApiMessage(error, "Không thể check-in vé.");
      setCheckInResult({
        success: false,
        message,
        data: error?.response?.data?.data || ticket,
      });
      showToast("error", message);
    } finally {
      checkingInRef.current = false;
      setCheckingIn(false);
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

  const activeResult = bookingPrintResult || verifyResult;
  const verificationTone = getVerificationTone(activeResult);

  return (
    <div className="ticket-scanner-page">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quét & tra cứu vé</h1>
          <p>Quét mã QR hoặc nhập mã vé để in và check-in.</p>
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
            <button className="btn btn-primary" disabled={cameraActive || processing || lookingUpTicket} onClick={startScanner} type="button">
              <HiOutlineCamera />
              Bật camera
            </button>
            <button className="btn btn-secondary" disabled={!cameraActive} onClick={stopScanner} type="button">
              <HiOutlineStop />
              Dừng camera
            </button>
            <button className="btn btn-secondary" disabled={processing || lookingUpTicket} onClick={() => fileInputRef.current?.click()} type="button">
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

          <form className="ticket-code-lookup" onSubmit={handleTicketCodeLookup}>
            <div className="ticket-code-lookup-copy">
              <label htmlFor="ticket-code-lookup">Tra cứu mã vé</label>
              <span>Dùng khi camera hoặc mã QR không đọc được.</span>
            </div>
            <div className="ticket-code-lookup-controls">
              <input
                id="ticket-code-lookup"
                className="form-input"
                value={ticketCodeQuery}
                onChange={(event) => setTicketCodeQuery(event.target.value.toUpperCase())}
                placeholder="Ví dụ: AURA111020904957-E4"
                minLength={6}
                maxLength={64}
                autoComplete="off"
                spellCheck="false"
                disabled={lookingUpTicket || processing}
                required
              />
              <button className="btn btn-secondary" disabled={lookingUpTicket || processing || !ticketCodeQuery.trim()} type="submit">
                <HiOutlineSearch />
                {lookingUpTicket ? "Đang tìm..." : "Tra cứu"}
              </button>
            </div>
          </form>

          <div className={`ticket-scanner-message ${processing || lookingUpTicket ? "loading" : ""}`} aria-live="polite">
            {processing ? "Đang xử lý mã QR..." : lookingUpTicket ? "Đang tra cứu mã vé..." : cameraMessage}
          </div>
        </section>

        <section className={`ticket-scanner-panel ticket-result-panel ${verificationTone}`}>
          <div className="ticket-scanner-panel-header">
            <div>
              <h2>Kết quả quét</h2>
              <p>QR đơn chỉ tải thông tin đơn; QR vé dùng để in hoặc check-in từng vé.</p>
            </div>
            <HiOutlineTicket />
          </div>

          {!activeResult ? (
            <div className="ticket-result-empty">
              <HiOutlineTicket />
              <p>Chưa có vé được quét.</p>
            </div>
          ) : (
            <>
              <div className="ticket-result-summary">
                {activeResult.success ? <HiOutlineCheckCircle /> : <HiOutlineXCircle />}
                <div>
                  <strong>{activeResult.message}</strong>
                  <span>{bookingPrintResult?.data?.booking?.bookingCode || ticket?.ticketCode || "Không có thông tin"}</span>
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
                  <InfoItem label="Mã đơn" value={ticket.booking?.bookingCode || "-"} />
                </div>
              )}
              {bookingPrintResult?.data?.booking && (
                <div className="ticket-info-grid">
                  <InfoItem label="Mã đơn" value={bookingPrintResult.data.booking.bookingCode} />
                  <InfoItem label="Phim" value={bookingPrintResult.data.booking.movie?.title || "-"} />
                  <InfoItem label="Suất chiếu" value={formatDateTime(bookingPrintResult.data.booking.showtime?.start_time)} />
                  <InfoItem label="Phòng" value={bookingPrintResult.data.booking.showtime?.room_name || "-"} />
                  <InfoItem
                    label={bookingPrintResult.action === "printed" ? "Vừa in" : "Vé chưa in"}
                    value={`${bookingPrintResult.data.tickets?.length || 0} vé`}
                  />
                  <InfoItem label="Bỏ qua" value={`${bookingPrintResult.data.skippedTickets?.length || 0} vé`} />
                </div>
              )}
            </>
          )}
        </section>

        <section className="ticket-scanner-panel ticket-action-panel">
          <div className="ticket-scanner-panel-header">
            <div>
              <h2>Hành động</h2>
              <p>In vé theo mẫu điện tử hoặc check-in vé vừa xác minh.</p>
            </div>
          </div>

          {!bookingPrintResult && <button
            className="btn btn-primary ticket-print-btn"
            disabled={!ticket || !currentQrToken || processing || lookingUpTicket || checkingIn || printingTicket || ticket?.canPrint === false || Boolean(ticket?.printedAt)}
            title={ticket?.printedAt ? "Vé này đã được in và không thể in lại." : "In vé điện tử"}
            onClick={handlePrintTicket}
            type="button"
          >
            <HiOutlinePrinter />
            {printingTicket ? "Đang chuẩn bị..." : ticket?.printedAt ? "Đã in" : "In vé"}
          </button>}

          {bookingPrintResult && <button
            className="btn btn-primary ticket-print-btn"
            disabled={
              !bookingPrintResult.success
              || bookingPrintResult.action === "printed"
              || processing
              || printingBookingOrder
              || (bookingPrintResult.data?.tickets?.length || 0) === 0
            }
            onClick={handlePrintBookingOrder}
            title={(bookingPrintResult.data?.tickets?.length || 0) === 0 ? "Không còn vé hợp lệ chưa in trong đơn." : "In tất cả vé hợp lệ chưa in trong đơn"}
            type="button"
          >
            <HiOutlinePrinter />
            {printingBookingOrder ? "Đang chuẩn bị..." : bookingPrintResult.action === "printed" ? "Đã chuẩn bị in" : "In đơn vé"}
          </button>}

          {!bookingPrintResult && <button
            className="btn btn-success ticket-checkin-btn"
            disabled={!ticket || !currentQrToken || processing || lookingUpTicket || printingTicket || checkingIn || ticket.status !== "VALID"}
            onClick={handleCheckIn}
            type="button"
          >
            <HiOutlineCheckCircle />
            {checkingIn ? "Đang check-in..." : ticket?.status === "CHECKED_IN" ? "Đã check-in" : "Check-in vé"}
          </button>}

          {bookingPrintResult?.success && (
            <div className="ticket-checkin-feedback success">
              QR đơn chỉ dùng để tra cứu và in đơn. Check-in vẫn thực hiện bằng QR riêng của từng vé.
            </div>
          )}

          {checkInResult && (
            <div className={`ticket-checkin-feedback ${checkInResult.success ? "success" : "error"}`}>
              {checkInResult.message}
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
