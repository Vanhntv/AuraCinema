import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlineEye,
  HiOutlineOfficeBuilding,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlinePlusCircle,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineTrash,
  HiOutlineViewGrid,
} from "react-icons/hi";
import { getCinemas } from "../services/cinemaService";
import {
  createRoom,
  deleteRoom,
  getRoomById,
  getRooms,
  updateRoom,
  updateRoomStatus,
} from "../services/roomService";
import { createSeatType, getSeatTypes } from "../services/seatTypeService";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Toast from "../components/common/Toast";

const emptyForm = {
  cinema_id: "",
  name: "",
  room_type: "2D",
  row_count: 8,
  column_count: 10,
  status: "active",
};

const statusLabels = {
  active: "Hoạt động",
  maintenance: "Bảo trì",
  inactive: "Ngừng hoạt động",
};

const roomTypes = ["2D", "3D", "IMAX", "VIP"];
const PAGE_SIZE = 10;

const getSeatCode = (seat) => seat.seat_code || `${seat.seat_row}${seat.seat_number}`;
const getRoomCinemaId = (room) => {
  if (!room?.cinema_id) return "";
  return typeof room.cinema_id === "object" ? room.cinema_id._id || "" : String(room.cinema_id);
};
const normalizeRoomName = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const normalizeSeatTypeName = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const getSeatTypeTone = (seatType) => {
  const name = normalizeSeatTypeName(seatType?.name);
  if (name.includes("vip")) return "vip";
  if (name.includes("couple") || name.includes("doi")) return "couple";
  if (name.includes("wheelchair") || name.includes("xe lan")) return "wheelchair";
  return "normal";
};
const isWheelchairSeatType = (seatType) => getSeatTypeTone(seatType) === "wheelchair";
const getCouplePairClass = ({ isCouple, previousCoupleCount, hasNextCouple }) => {
  if (!isCouple) return "";
  if (previousCoupleCount % 2 === 1) return "couple-connected-left";
  if (hasNextCouple) return "couple-connected-right";
  return "";
};
const parseSeatCode = (seatCode = "") => {
  const match = String(seatCode).match(/^([A-Z])(\d+)$/);
  if (!match) return null;

  return {
    rowIndex: match[1].charCodeAt(0) - 65,
    columnIndex: Number(match[2]) - 1,
  };
};
const buildSeatCode = (rowIndex, columnIndex) =>
  `${String.fromCharCode(65 + rowIndex)}${columnIndex + 1}`;
const buildDefaultSeatLayout = ({ rowCount, columnCount, seatTypeId }) => {
  if (!rowCount || !columnCount || !seatTypeId) return {};

  const nextLayout = {};
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      nextLayout[buildSeatCode(rowIndex, columnIndex)] = seatTypeId;
    }
  }

  return nextLayout;
};
const layoutToPayload = (seatLayout) =>
  Object.entries(seatLayout).map(([seat_code, seat_type_id]) => ({
    seat_code,
    seat_type_id,
  }));

const buildLayoutFromSeats = (seats = []) =>
  seats.reduce((layout, seat) => {
    const seatTypeId =
      typeof seat.seat_type_id === "object" ? seat.seat_type_id?._id : seat.seat_type_id;
    if (seatTypeId) {
      layout[getSeatCode(seat).toUpperCase()] = seatTypeId;
    }
    return layout;
  }, {});

const ensureSeatLayoutBounds = ({ rowCount, columnCount, currentLayout, fallbackSeatTypeId }) => {
  const rows = Number(rowCount);
  const columns = Number(columnCount);

  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows <= 0 || columns <= 0) {
    return {};
  }

  const nextLayout = {};
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const seatCode = buildSeatCode(rowIndex, columnIndex);
      nextLayout[seatCode] = currentLayout[seatCode] || fallbackSeatTypeId;
    }
  }

  return nextLayout;
};

function SeatMap({ seats = [] }) {
  const groupedSeats = useMemo(() => {
    return seats.reduce((groups, seat) => {
      const row = seat.seat_row || "?";
      groups[row] = groups[row] || [];
      groups[row].push(seat);
      return groups;
    }, {});
  }, [seats]);

  const rows = Object.keys(groupedSeats).sort();

  if (!seats.length) {
    return <div className="table-empty">Chưa có sơ đồ ghế.</div>;
  }

  return (
    <div className="room-seat-map">
      <div
        className="room-seat-stage"
        style={{ "--seat-columns": groupedSeats[rows[0]]?.length || 1 }}
      >
        <div className="room-screen">Màn hình</div>
        {rows.map((row) => (
          <div className="room-seat-row" key={row}>
            <span className="room-seat-row-label">{row}</span>
            <div className="room-seat-list">
              {groupedSeats[row]
                .sort((a, b) => Number(a.seat_number) - Number(b.seat_number))
                .map((seat, seatIndex, rowSeats) => {
                  const tone = getSeatTypeTone(seat.seat_type_id);
                  const nextTone = getSeatTypeTone(rowSeats[seatIndex + 1]?.seat_type_id);
                  const isCouple = tone === "couple";
                  let previousCoupleCount = 0;

                  for (let index = seatIndex - 1; index >= 0; index -= 1) {
                    if (getSeatTypeTone(rowSeats[index]?.seat_type_id) !== "couple") break;
                    previousCoupleCount += 1;
                  }

                  return (
                    <span
                      className={`room-seat ${tone} ${seat.status ? "" : "disabled"} ${
                        getCouplePairClass({
                          isCouple,
                          previousCoupleCount,
                          hasNextCouple: nextTone === "couple",
                        })
                      }`}
                      key={seat._id}
                      title={seat.seat_type_id?.name || "Ghế thường"}
                    >
                      {getSeatCode(seat)}
                    </span>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeatLayoutEditor({
  rowCount,
  columnCount,
  seatLayout,
  seatTypes,
  selectedSeatTypeId,
  onSeatClick,
  onRowClick,
}) {
  const rows = Number(rowCount);
  const columns = Number(columnCount);
  const seatTypeMap = useMemo(
    () => new Map(seatTypes.map((seatType) => [seatType._id, seatType])),
    [seatTypes],
  );

  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows <= 0 || columns <= 0) {
    return <div className="table-empty">Nhập số hàng và số cột để xem sơ đồ mẫu.</div>;
  }

  return (
    <div className="seat-layout-editor">
      <div className="room-seat-stage" style={{ "--seat-columns": columns }}>
        <div className="room-screen">Màn hình</div>
        {Array.from({ length: rows }).map((_, rowIndex) => {
          const rowLabel = String.fromCharCode(65 + rowIndex);

          return (
            <div className="room-seat-row" key={rowLabel}>
              <button
                className="room-seat-row-label room-seat-row-action"
                title={`Áp dụng loại ghế đang chọn cho hàng ${rowLabel}`}
                type="button"
                onClick={() => onRowClick(rowIndex)}
              >
                {rowLabel}
              </button>
              <div className="room-seat-list">
                {Array.from({ length: columns }).map((__, columnIndex) => {
                  const seatCode = buildSeatCode(rowIndex, columnIndex);
                  const nextSeatCode =
                    columnIndex + 1 < columns ? buildSeatCode(rowIndex, columnIndex + 1) : null;
                  const seatType = seatTypeMap.get(seatLayout[seatCode]);
                  const nextSeatType = seatTypeMap.get(seatLayout[nextSeatCode]);
                  const tone = getSeatTypeTone(seatType);
                  const isCouple = tone === "couple";
                  let previousCoupleCount = 0;

                  for (let index = columnIndex - 1; index >= 0; index -= 1) {
                    const previousCode = buildSeatCode(rowIndex, index);
                    const previousSeatTypeInRun = seatTypeMap.get(seatLayout[previousCode]);
                    if (getSeatTypeTone(previousSeatTypeInRun) !== "couple") break;
                    previousCoupleCount += 1;
                  }

                  return (
                    <button
                      className={`room-seat layout-editor-seat ${tone} ${
                        seatLayout[seatCode] === selectedSeatTypeId ? "selected" : ""
                      } ${
                        getCouplePairClass({
                          isCouple,
                          previousCoupleCount,
                          hasNextCouple: getSeatTypeTone(nextSeatType) === "couple",
                        })
                      }`}
                      key={seatCode}
                      title={`${seatCode} - ${seatType?.name || "Chưa chọn loại ghế"}`}
                      type="button"
                      onClick={() => onSeatClick(seatCode)}
                    >
                      {seatCode}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [editingRoom, setEditingRoom] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [toasts, setToasts] = useState([]);
  const [seatTypes, setSeatTypes] = useState([]);
  const [selectedSeatTypeId, setSelectedSeatTypeId] = useState("");
  const [seatLayout, setSeatLayout] = useState({});
  const [quickStartSeat, setQuickStartSeat] = useState("");
  const [quickEndSeat, setQuickEndSeat] = useState("");

  const addToast = useCallback((type, message) => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), type, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const fetchRooms = useCallback(async () => {
    const response = await getRooms({
      q: searchQuery.trim(),
      status: statusFilter,
    });
    setRooms(response.data || []);
  }, [searchQuery, statusFilter]);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomResponse, cinemaResponse, seatTypeResponse] = await Promise.all([
        getRooms({
          q: searchQuery.trim(),
          status: statusFilter,
        }),
        getCinemas(),
        getSeatTypes(),
      ]);
      setRooms(roomResponse.data || []);
      setCinemas(cinemaResponse.data || []);
      setSeatTypes((seatTypeResponse.data || []).filter((seatType) => !isWheelchairSeatType(seatType)));
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải dữ liệu phòng chiếu");
    } finally {
      setLoading(false);
    }
  }, [addToast, searchQuery, statusFilter]);

  const defaultCinemaId = cinemas[0]?._id || "";
  const defaultSeatTypeId = useMemo(() => {
    const normalType = seatTypes.find((seatType) => getSeatTypeTone(seatType) === "normal");
    return normalType?._id || seatTypes[0]?._id || "";
  }, [seatTypes]);

  useEffect(() => {
    if (!selectedSeatTypeId && defaultSeatTypeId) {
      setSelectedSeatTypeId(defaultSeatTypeId);
    }
    if (
      selectedSeatTypeId &&
      !seatTypes.some((seatType) => seatType._id === selectedSeatTypeId) &&
      defaultSeatTypeId
    ) {
      setSelectedSeatTypeId(defaultSeatTypeId);
    }
  }, [defaultSeatTypeId, seatTypes, selectedSeatTypeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadInitialData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadInitialData]);

  const activeRooms = useMemo(
    () => rooms.filter((room) => room.status === "active").length,
    [rooms],
  );

  const totalSeats = useMemo(
    () => rooms.reduce((sum, room) => sum + Number(room.capacity || 0), 0),
    [rooms],
  );

  const totalPages = Math.max(Math.ceil(rooms.length / PAGE_SIZE), 1);
  const pagedRooms = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rooms.slice(start, start + PAGE_SIZE);
  }, [currentPage, rooms]);

  const syncSeatLayout = useCallback(
    ({ rowCount, columnCount, currentLayout = seatLayout, fallbackSeatTypeId = selectedSeatTypeId }) =>
      ensureSeatLayoutBounds({
        rowCount,
        columnCount,
        currentLayout,
        fallbackSeatTypeId: fallbackSeatTypeId || defaultSeatTypeId,
      }),
    [defaultSeatTypeId, seatLayout, selectedSeatTypeId],
  );

  const updateField = (field, value) => {
    setFormData((current) => {
      const nextFormData = { ...current, [field]: value };

      if (field === "row_count" || field === "column_count") {
        setSeatLayout((currentLayout) =>
          syncSeatLayout({
            rowCount: nextFormData.row_count,
            columnCount: nextFormData.column_count,
            currentLayout,
          }),
        );
      }

      return nextFormData;
    });
    setFormErrors((current) => ({ ...current, [field]: "" }));
  };

  const openCreateForm = () => {
    setEditingRoom(null);
    const nextFormData = {
      ...emptyForm,
      cinema_id: defaultCinemaId,
    };
    setFormData(nextFormData);
    setSeatLayout(
      syncSeatLayout({
        rowCount: nextFormData.row_count,
        columnCount: nextFormData.column_count,
        currentLayout: buildDefaultSeatLayout({
          rowCount: nextFormData.row_count,
          columnCount: nextFormData.column_count,
          seatTypeId: defaultSeatTypeId,
        }),
        fallbackSeatTypeId: defaultSeatTypeId,
      }),
    );
    setSelectedSeatTypeId(defaultSeatTypeId);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditForm = async (room) => {
    try {
      const response = await getRoomById(room._id);
      const detail = response.data;
      const nextFormData = {
        cinema_id: detail.cinema_id?._id || detail.cinema_id || "",
        name: detail.name || "",
        room_type: detail.room_type || "2D",
        row_count: detail.row_count || "",
        column_count: detail.column_count || "",
        status: detail.status || "active",
      };
      const currentLayout = buildLayoutFromSeats(detail.seats || []);

      setEditingRoom(detail);
      setFormData(nextFormData);
      setSeatLayout(
        syncSeatLayout({
          rowCount: nextFormData.row_count,
          columnCount: nextFormData.column_count,
          currentLayout,
          fallbackSeatTypeId: defaultSeatTypeId,
        }),
      );
      setSelectedSeatTypeId(Object.values(currentLayout)[0] || defaultSeatTypeId);
      setFormErrors({});
      setIsFormOpen(true);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải phòng để cập nhật");
    }
  };

  const validateForm = () => {
    const errors = {};
    const rowCount = Number(formData.row_count);
    const columnCount = Number(formData.column_count);
    const seatTypeMap = new Map(seatTypes.map((seatType) => [seatType._id, seatType]));

    const resolvedCinemaId = formData.cinema_id || defaultCinemaId;
    if (!resolvedCinemaId) errors.cinema_id = "Hệ thống chưa có rạp mặc định để gán phòng.";
    if (!formData.name.trim()) errors.name = "Vui lòng nhập tên phòng.";
    if (!errors.name && resolvedCinemaId) {
      const duplicateRoom = rooms.find((room) => {
        const isSameRoom = editingRoom && room._id === editingRoom._id;
        return (
          !isSameRoom &&
          getRoomCinemaId(room) === resolvedCinemaId &&
          normalizeRoomName(room.name) === normalizeRoomName(formData.name)
        );
      });

      if (duplicateRoom) {
        errors.name = "Tên phòng đã tồn tại trong rạp này.";
      }
    }
    if (!Number.isInteger(rowCount) || rowCount <= 0) {
      errors.row_count = "Số hàng phải là số nguyên dương.";
    }
    if (rowCount > 26) {
      errors.row_count = "Số hàng không được vượt quá 26.";
    }
    if (!Number.isInteger(columnCount) || columnCount <= 0) {
      errors.column_count = "Số cột phải là số nguyên dương.";
    }
    if (rowCount * columnCount > 400) {
      errors.column_count = "Sơ đồ ghế không được vượt quá 400 ghế.";
    }
    if (!seatTypes.length || !defaultSeatTypeId) {
      errors.seat_layout = "Chưa có loại ghế để tạo sơ đồ.";
    }
    if (!errors.seat_layout) {
      for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        let currentCoupleRun = [];

        for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
          const seatCode = buildSeatCode(rowIndex, columnIndex);
          const seatType = seatTypeMap.get(seatLayout[seatCode]);

          if (getSeatTypeTone(seatType) === "couple") {
            currentCoupleRun.push(seatCode);
          } else {
            if (currentCoupleRun.length % 2 !== 0) {
              errors.seat_layout = `Ghế Couple ${currentCoupleRun.at(-1)} đang bị lẻ, cần chọn đủ 2 ghế liền nhau.`;
              break;
            }
            currentCoupleRun = [];
          }
        }

        if (!errors.seat_layout && currentCoupleRun.length % 2 !== 0) {
          errors.seat_layout = `Ghế Couple ${currentCoupleRun.at(-1)} đang bị lẻ, cần chọn đủ 2 ghế liền nhau.`;
        }

        if (errors.seat_layout) break;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    const payload = {
      cinema_id: formData.cinema_id || defaultCinemaId,
      name: formData.name.trim(),
      room_type: formData.room_type,
      row_count: Number(formData.row_count),
      column_count: Number(formData.column_count),
      status: formData.status,
      seat_layout: layoutToPayload(seatLayout),
    };

    try {
      setSubmitting(true);
      if (editingRoom) {
        await updateRoom(editingRoom._id, payload);
        addToast("success", "Đã cập nhật phòng chiếu.");
      } else {
        await createRoom(payload);
        addToast("success", "Đã tạo phòng và sinh sơ đồ ghế.");
      }
      setIsFormOpen(false);
      setEditingRoom(null);
      await fetchRooms();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể lưu phòng chiếu");
    } finally {
      setSubmitting(false);
    }
  };

  const viewRoomDetail = async (room) => {
    try {
      const response = await getRoomById(room._id);
      setSelectedRoom(response.data);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể tải sơ đồ ghế");
    }
  };

  const handleStatusChange = async (room, status) => {
    try {
      await updateRoomStatus(room._id, status);
      addToast("success", `Đã đổi trạng thái phòng sang ${statusLabels[status]}.`);
      await fetchRooms();
      if (selectedRoom?._id === room._id) {
        await viewRoomDetail(room);
      }
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể đổi trạng thái phòng");
    }
  };

  const openDeleteConfirm = (room) => {
    setDeleteTarget(room);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteRoom(deleteTarget._id);
      addToast("success", "Đã khóa phòng chiếu.");
      setConfirmOpen(false);
      setDeleteTarget(null);
      if (selectedRoom?._id === deleteTarget._id) {
        setSelectedRoom(null);
      }
      await fetchRooms();
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể khóa phòng chiếu");
    }
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  const selectSeatType = (seatTypeId) => {
    setSelectedSeatTypeId(seatTypeId);
    setFormErrors((current) => ({ ...current, seat_layout: "" }));
  };

  const updateSeatTypeForSeat = (seatCode) => {
    if (!selectedSeatTypeId) return;
    const selectedSeatType = seatTypes.find((seatType) => seatType._id === selectedSeatTypeId);

    if (getSeatTypeTone(selectedSeatType) !== "couple") {
      setSeatLayout((current) => ({ ...current, [seatCode]: selectedSeatTypeId }));
      return;
    }

    const seatPosition = parseSeatCode(seatCode);
    const columnCount = Number(formData.column_count);

    if (!seatPosition || !Number.isInteger(columnCount)) return;

    setSeatLayout((current) => {
      const seatTypeMap = new Map(seatTypes.map((seatType) => [seatType._id, seatType]));

      if (getSeatTypeTone(seatTypeMap.get(current[seatCode])) === "couple") {
        return current;
      }

      const rightSeatCode =
        seatPosition.columnIndex + 1 < columnCount
          ? buildSeatCode(seatPosition.rowIndex, seatPosition.columnIndex + 1)
          : null;
      const leftSeatCode =
        seatPosition.columnIndex > 0
          ? buildSeatCode(seatPosition.rowIndex, seatPosition.columnIndex - 1)
          : null;
      const rightSeatIsCouple =
        rightSeatCode && getSeatTypeTone(seatTypeMap.get(current[rightSeatCode])) === "couple";
      const leftSeatIsCouple =
        leftSeatCode && getSeatTypeTone(seatTypeMap.get(current[leftSeatCode])) === "couple";
      const nextPairSeatCode =
        rightSeatCode && !rightSeatIsCouple
          ? rightSeatCode
          : leftSeatCode && !leftSeatIsCouple
            ? leftSeatCode
            : null;

      if (!nextPairSeatCode) {
        addToast("error", "Ghế Couple cần có 2 ghế liền nhau.");
        return current;
      }

      return {
        ...current,
        [seatCode]: selectedSeatTypeId,
        [nextPairSeatCode]: selectedSeatTypeId,
      };
    });
    setFormErrors((current) => ({ ...current, seat_layout: "" }));
  };

  const applySeatTypeToSeatCodes = (seatCodes) => {
    if (!selectedSeatTypeId || !seatCodes.length) return;

    const selectedSeatType = seatTypes.find((seatType) => seatType._id === selectedSeatTypeId);
    const isCouple = getSeatTypeTone(selectedSeatType) === "couple";
    const appliedSeatCodes = isCouple
      ? seatCodes.slice(0, seatCodes.length - (seatCodes.length % 2))
      : seatCodes;

    if (!appliedSeatCodes.length) {
      addToast("error", "Ghế Couple cần chọn tối thiểu 2 ghế liền nhau.");
      return;
    }

    setSeatLayout((current) => {
      const nextLayout = { ...current };
      appliedSeatCodes.forEach((seatCode) => {
        nextLayout[seatCode] = selectedSeatTypeId;
      });
      return nextLayout;
    });
    setFormErrors((current) => ({ ...current, seat_layout: "" }));

    if (isCouple && appliedSeatCodes.length !== seatCodes.length) {
      addToast("error", `Đã bỏ ${seatCodes.at(-1)} vì ghế Couple phải chọn theo cặp.`);
    }
  };

  const applySeatTypeToRow = (rowIndex) => {
    const columnCount = Number(formData.column_count);
    if (!Number.isInteger(columnCount) || columnCount <= 0) return;

    applySeatTypeToSeatCodes(
      Array.from({ length: columnCount }).map((_, columnIndex) =>
        buildSeatCode(rowIndex, columnIndex),
      ),
    );
  };

  const handleQuickApply = () => {
    const startSeat = parseSeatCode(quickStartSeat.trim().toUpperCase());
    const endSeat = parseSeatCode(quickEndSeat.trim().toUpperCase());
    const rowCount = Number(formData.row_count);
    const columnCount = Number(formData.column_count);

    if (!startSeat || !endSeat) {
      addToast("error", "Vui lòng nhập khoảng ghế hợp lệ, ví dụ D3 đến D8.");
      return;
    }

    if (
      startSeat.rowIndex < 0 ||
      endSeat.rowIndex < 0 ||
      startSeat.rowIndex >= rowCount ||
      endSeat.rowIndex >= rowCount ||
      startSeat.columnIndex < 0 ||
      endSeat.columnIndex < 0 ||
      startSeat.columnIndex >= columnCount ||
      endSeat.columnIndex >= columnCount
    ) {
      addToast("error", "Khoảng chọn phải nằm trong sơ đồ ghế.");
      return;
    }

    const fromRow = Math.min(startSeat.rowIndex, endSeat.rowIndex);
    const toRow = Math.max(startSeat.rowIndex, endSeat.rowIndex);
    const fromColumn = Math.min(startSeat.columnIndex, endSeat.columnIndex);
    const toColumn = Math.max(startSeat.columnIndex, endSeat.columnIndex);
    const seatCodes = [];

    for (let rowIndex = fromRow; rowIndex <= toRow; rowIndex += 1) {
      for (let columnIndex = fromColumn; columnIndex <= toColumn; columnIndex += 1) {
        seatCodes.push(buildSeatCode(rowIndex, columnIndex));
      }
    }

    applySeatTypeToSeatCodes(seatCodes);
  };

  const addPresetSeatType = async (preset) => {
    try {
      const response = await createSeatType(preset);
      const createdSeatType = response.data;
      setSeatTypes((current) => [...current, createdSeatType]);
      setSelectedSeatTypeId(createdSeatType._id);
      addToast("success", `Đã thêm loại ghế ${createdSeatType.name}.`);
    } catch (error) {
      addToast("error", error.response?.data?.message || "Không thể thêm loại ghế");
    }
  };

  const missingPresetSeatTypes = [
    {
      name: "Couple",
      description: "Ghế đôi dành cho hai khách",
      price_multiplier: 1.8,
    },
  ].filter(
    (preset) =>
      !seatTypes.some(
        (seatType) => normalizeSeatTypeName(seatType.name) === normalizeSeatTypeName(preset.name),
      ),
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-info">
          <h1>Quản lý Phòng chiếu</h1>
          <p>Tạo phòng, sinh sơ đồ ghế và kiểm soát trạng thái hoạt động</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadInitialData}>
            <HiOutlineRefresh />
            Làm mới
          </button>
          <button className="btn btn-primary" onClick={openCreateForm}>
            <HiOutlinePlus />
            Thêm phòng
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <HiOutlineOfficeBuilding />
          </div>
          <div>
            <div className="stat-card-value">{rooms.length}</div>
            <div className="stat-card-label">Tổng phòng</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <HiOutlineViewGrid />
          </div>
          <div>
            <div className="stat-card-value">{activeRooms}</div>
            <div className="stat-card-label">Đang hoạt động</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon orange">
            <HiOutlineViewGrid />
          </div>
          <div>
            <div className="stat-card-value">{totalSeats}</div>
            <div className="stat-card-label">Tổng ghế</div>
          </div>
        </div>
      </div>

      {isFormOpen ? (
        <section className="card room-form-card">
          <div className="modal-header">
            <h2>{editingRoom ? "Cập nhật phòng chiếu" : "Thêm phòng chiếu"}</h2>
            <p>Nhập số hàng và số cột để hệ thống tự sinh sơ đồ ghế.</p>
          </div>
          <form className="showtime-form" onSubmit={handleSubmit}>
            <div className="showtime-form-grid">
              <label className="form-group">
                <span className="form-label">Tên phòng *</span>
                <input className={`form-input ${formErrors.name ? "error" : ""}`} value={formData.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Ví dụ: Phòng 01" />
                {formErrors.name ? <span className="form-error">{formErrors.name}</span> : null}
                {formErrors.cinema_id ? <span className="form-error">{formErrors.cinema_id}</span> : null}
              </label>

              <label className="form-group">
                <span className="form-label">Loại phòng</span>
                <select className="form-input" value={formData.room_type} onChange={(event) => updateField("room_type", event.target.value)}>
                  {roomTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label className="form-group">
                <span className="form-label">Trạng thái</span>
                <select className="form-input" value={formData.status} onChange={(event) => updateField("status", event.target.value)}>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="form-group">
                <span className="form-label">Số hàng ghế *</span>
                <input className={`form-input ${formErrors.row_count ? "error" : ""}`} min="1" type="number" value={formData.row_count} onChange={(event) => updateField("row_count", event.target.value)} />
                {formErrors.row_count ? <span className="form-error">{formErrors.row_count}</span> : null}
              </label>

              <label className="form-group">
                <span className="form-label">Số cột ghế *</span>
                <input className={`form-input ${formErrors.column_count ? "error" : ""}`} min="1" type="number" value={formData.column_count} onChange={(event) => updateField("column_count", event.target.value)} />
                {formErrors.column_count ? <span className="form-error">{formErrors.column_count}</span> : <span className="form-hint">Tổng ghế: {Number(formData.row_count || 0) * Number(formData.column_count || 0)}</span>}
              </label>
            </div>

            <div className="seat-layout-panel">
              <div className="seat-layout-header">
                <div>
                  <h3>Sơ đồ ghế mẫu</h3>
                  <p>Chọn loại ghế rồi bấm vào từng vị trí để áp dụng.</p>
                </div>
                <div className="seat-layout-total">
                  {Number(formData.row_count || 0) * Number(formData.column_count || 0)} ghế
                </div>
              </div>

              <div className="seat-type-toolbar">
                {seatTypes.map((seatType) => (
                  <button
                    className={`seat-type-chip ${getSeatTypeTone(seatType)} ${
                      selectedSeatTypeId === seatType._id ? "active" : ""
                    }`}
                    key={seatType._id}
                    type="button"
                    onClick={() => selectSeatType(seatType._id)}
                  >
                    {seatType.name}
                  </button>
                ))}
                {missingPresetSeatTypes.map((preset) => (
                  <button
                    className="seat-type-chip add"
                    key={preset.name}
                    type="button"
                    onClick={() => addPresetSeatType(preset)}
                  >
                    <HiOutlinePlusCircle />
                    {preset.name}
                  </button>
                ))}
              </div>

              <div className="seat-quick-tools">
                <div className="seat-quick-range">
                  <input
                    className="form-input seat-quick-input"
                    placeholder="Góc 1, ví dụ D4"
                    value={quickStartSeat}
                    onChange={(event) => setQuickStartSeat(event.target.value.toUpperCase())}
                  />
                  <input
                    className="form-input seat-quick-input"
                    placeholder="Góc 2, ví dụ F7"
                    value={quickEndSeat}
                    onChange={(event) => setQuickEndSeat(event.target.value.toUpperCase())}
                  />
                  <button className="btn btn-secondary" type="button" onClick={handleQuickApply}>
                    Áp dụng
                  </button>
                </div>
              </div>

              {formErrors.seat_layout ? (
                <span className="form-error">{formErrors.seat_layout}</span>
              ) : null}

              <SeatLayoutEditor
                rowCount={formData.row_count}
                columnCount={formData.column_count}
                seatLayout={seatLayout}
                seatTypes={seatTypes}
                selectedSeatTypeId={selectedSeatTypeId}
                onSeatClick={updateSeatTypeForSeat}
                onRowClick={applySeatTypeToRow}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" type="button" onClick={() => setIsFormOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" disabled={submitting} type="submit">
                {submitting ? "Đang lưu..." : "Lưu phòng"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            <span className="table-toolbar-title">Danh sách phòng chiếu</span>
            <span className="table-toolbar-count">{rooms.length} kết quả</span>
          </div>
          <div className="cinema-filters">
            <div className="table-search">
              <HiOutlineSearch className="table-search-icon" />
              <input className="table-search-input" placeholder="Tìm phòng..." value={searchQuery} onChange={handleSearchChange} />
            </div>
            <select className="form-input room-filter-select" value={statusFilter} onChange={handleStatusFilterChange}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Phòng</th>
                  <th>Loại</th>
                  <th>Sơ đồ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedRooms.map((room) => (
                  <tr key={room._id}>
                    <td className="table-cell-name">{room.name}</td>
                    <td>{room.room_type || "2D"}</td>
                    <td>{room.row_count || "?"} x {room.column_count || "?"} ({room.capacity || 0} ghế)</td>
                    <td>
                      <select className={`room-status-select ${room.status || "active"}`} value={room.status || "active"} onChange={(event) => handleStatusChange(room, event.target.value)}>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-icon btn-ghost" title="Xem sơ đồ ghế" onClick={() => viewRoomDetail(room)}>
                          <HiOutlineEye />
                        </button>
                        <button className="btn btn-icon btn-ghost" title="Cập nhật" onClick={() => openEditForm(room)}>
                          <HiOutlinePencil />
                        </button>
                        <button className="btn btn-icon btn-ghost" title="Khóa phòng" onClick={() => openDeleteConfirm(room)}>
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}>Trước</button>
          <span>Trang {currentPage} / {totalPages}</span>
          <button className="btn btn-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}>Sau</button>
        </div>
      </div>

      {selectedRoom ? (
        <section className="table-container room-detail-panel">
          <div className="table-toolbar">
            <div className="table-toolbar-left">
              <span className="table-toolbar-title">{selectedRoom.name}</span>
              <span className="table-toolbar-count">{selectedRoom.seats?.length || 0} ghế</span>
            </div>
            <button className="btn btn-secondary" onClick={() => setSelectedRoom(null)}>Đóng</button>
          </div>
          <SeatMap seats={selectedRoom.seats || []} />
        </section>
      ) : null}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Khóa phòng chiếu"
        message={`Bạn có chắc muốn khóa phòng "${deleteTarget?.name || ""}"? Phòng sẽ không còn dùng để tạo suất chiếu mới.`}
        confirmText="Khóa phòng"
        cancelText="Hủy"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default RoomsPage;
