import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Combo from "../models/Combo.js";
import Showtime from "../models/Showtime.js";
import ShowtimeSeat from "../models/ShowtimeSeat.js";
import User from "../models/User.js";
import Voucher from "../models/Voucher.js";
import VoucherUsage from "../models/VoucherUsage.js";
import { verifyVoucherService } from "../services/voucherService.js";

const normalizeText = (value = "") =>
  String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const seatTypeName = (seat) => normalizeText(seat.seat_id?.seat_type_id?.name || "").trim();

const isCoupleSeat = (seat) => {
  const typeName = seatTypeName(seat);
  return typeName.includes("doi") || typeName.includes("couple") || typeName.includes("double");
};

const calculateBookingTotalPrice = (seats = []) => {
  const countedSeatIds = new Set();
  const sortedSeats = [...seats].sort((first, second) => {
    const firstRow = String(first.seat_id?.seat_row || "");
    const secondRow = String(second.seat_id?.seat_row || "");
    if (firstRow !== secondRow) return firstRow.localeCompare(secondRow);
    return Number(first.seat_id?.seat_number || 0) - Number(second.seat_id?.seat_number || 0);
  });

  return sortedSeats.reduce((total, seat, index) => {
    const seatId = String(seat._id);
    if (countedSeatIds.has(seatId)) return total;

    if (!isCoupleSeat(seat)) {
      countedSeatIds.add(seatId);
      return total + Number(seat.price || 0);
    }

    const nextSeat = sortedSeats[index + 1];
    const isPairedCouple =
      nextSeat &&
      isCoupleSeat(nextSeat) &&
      String(nextSeat.seat_id?.seat_row || "") === String(seat.seat_id?.seat_row || "") &&
      Number(nextSeat.seat_id?.seat_number || 0) === Number(seat.seat_id?.seat_number || 0) + 1;

    countedSeatIds.add(seatId);
    if (isPairedCouple) countedSeatIds.add(String(nextSeat._id));

    return total + Number(seat.price || 0);
  }, 0);
};

const normalizeComboItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const normalizedMap = new Map();

  for (const item of items) {
    const comboId = String(item?.combo_id ?? item?._id ?? "").trim();
    const quantity = Number(item?.quantity ?? 0);

    if (!comboId) {
      const error = new Error("combo_id la bat buoc");
      error.statusCode = 400;
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(comboId)) {
      const error = new Error("combo_id khong hop le");
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      const error = new Error("quantity combo khong hop le");
      error.statusCode = 400;
      throw error;
    }

    normalizedMap.set(comboId, (normalizedMap.get(comboId) ?? 0) + quantity);
  }

  return Array.from(normalizedMap.entries()).map(([combo_id, quantity]) => ({
    combo_id,
    quantity,
  }));
};

const reserveComboStock = async ({ combos, session }) => {
  if (!combos.length) {
    return [];
  }

  const comboIds = combos.map((item) => item.combo_id);
  const comboDocs = await Combo.find({
    _id: { $in: comboIds },
    deleted_at: null,
    status: true,
  }).session(session);

  if (comboDocs.length !== comboIds.length) {
    const error = new Error("Khong tim thay combo");
    error.statusCode = 404;
    throw error;
  }

  const comboById = new Map(comboDocs.map((combo) => [String(combo._id), combo]));

  for (const item of combos) {
    const combo = comboById.get(String(item.combo_id));

    if (!combo) {
      const error = new Error("Khong tim thay combo");
      error.statusCode = 404;
      throw error;
    }

    if (Number(combo.stock ?? 0) < item.quantity) {
      const error = new Error(`Combo ${combo.name} khong du so luong`);
      error.statusCode = 409;
      throw error;
    }
  }

  const updateResults = await Promise.all(
    combos.map((item) =>
      Combo.updateOne(
        {
          _id: item.combo_id,
          deleted_at: null,
          status: true,
          stock: { $gte: item.quantity },
        },
        { $inc: { stock: -item.quantity } },
        { session },
      ),
    ),
  );

  const failedIndex = updateResults.findIndex((result) => result.modifiedCount !== 1);
  if (failedIndex !== -1) {
    const error = new Error("Khong the cap nhat ton kho combo");
    error.statusCode = 409;
    throw error;
  }

  return combos.map((item) => {
    const combo = comboById.get(String(item.combo_id));
    const price = Number(combo.price || 0);
    return {
      combo_id: combo._id,
      name: combo.name,
      price,
      quantity: item.quantity,
      subtotal: price * item.quantity,
    };
  });
};

export const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { showtime_id, showtime_seat_ids } = req.body;
    const voucherCode = String(req.body.voucher_code || req.body.code || "").trim();
    const combos = normalizeComboItems(req.body.combos);
    if (!showtime_id || !Array.isArray(showtime_seat_ids) || !showtime_seat_ids.length) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn suất chiếu và ghế" });
    }

    let createdBooking;
    await session.withTransaction(async () => {
      const [user, showtime, seats] = await Promise.all([
        User.findOne({ _id: req.user.id, deleted_at: null, status: true }).session(session),
        Showtime.findOne({ _id: showtime_id, deleted_at: null }).session(session),
        ShowtimeSeat.find({
          _id: { $in: showtime_seat_ids },
          showtime_id,
          deleted_at: null,
          status: "held",
          held_by: req.user.id,
          hold_expires_at: { $gt: new Date() },
        }).populate({ path: "seat_id", populate: { path: "seat_type_id", select: "name" } }).session(session),
      ]);

      if (!user) throw Object.assign(new Error("Không tìm thấy tài khoản"), { statusCode: 404 });
      if (!showtime) throw Object.assign(new Error("Không tìm thấy suất chiếu"), { statusCode: 404 });
      if (seats.length !== new Set(showtime_seat_ids.map(String)).size) {
        throw Object.assign(new Error("Một hoặc nhiều ghế đã được đặt"), { statusCode: 409 });
      }

      const types = new Set(seats.map(seatTypeName));
      if (types.size > 1) throw Object.assign(new Error("Không thể đặt nhiều loại ghế cùng lúc"), { statusCode: 400 });

      const reservedCombos = await reserveComboStock({ combos, session });

      const updateResult = await ShowtimeSeat.updateMany(
        { _id: { $in: seats.map((seat) => seat._id) }, status: "held", held_by: req.user.id },
        { $set: { status: "booked", held_by: null, hold_expires_at: null } },
        { session },
      );
      if (updateResult.modifiedCount !== seats.length) {
        throw Object.assign(new Error("Ghế vừa được người khác đặt"), { statusCode: 409 });
      }

      const seatTotalPrice = calculateBookingTotalPrice(seats);
      const comboTotalPrice = reservedCombos.reduce((total, item) => total + Number(item.subtotal || 0), 0);
      const subtotalPrice = seatTotalPrice + comboTotalPrice;
      let discountAmount = 0;
      let voucherSnapshot = undefined;
      let voucherUsagePayload = null;

      if (voucherCode) {
        const voucherResult = await verifyVoucherService({
          code: voucherCode,
          order_amount: subtotalPrice,
          ticket_amount: seatTotalPrice,
          concession_amount: comboTotalPrice,
          movie_id: showtime.movie_id,
          user_id: user._id,
          session,
        });

        if (!voucherResult.valid) {
          throw Object.assign(new Error(voucherResult.message), { statusCode: 400 });
        }

        discountAmount = Number(voucherResult.discount_amount || 0);
        const now = new Date();
        const updateVoucherResult = await Voucher.updateOne(
          {
            _id: voucherResult.voucher.id,
            deleted_at: null,
            status: true,
            quantity: { $gt: 0 },
            start_date: { $lte: now },
            end_date: { $gte: now },
          },
          {
            $inc: {
              quantity: -1,
              usage_count: 1,
            },
          },
          { session },
        );

        if (updateVoucherResult.modifiedCount !== 1) {
          throw Object.assign(new Error("Ma giam gia khong con hop le. Vui long kiem tra lai truoc khi thanh toan."), { statusCode: 409 });
        }

        voucherSnapshot = {
          voucher_id: voucherResult.voucher.id,
          code: voucherResult.voucher.code,
          discount_type: voucherResult.voucher.discount_type,
          discount_value: Number(voucherResult.voucher.discount_value || 0),
          discount_amount: discountAmount,
          apply_scope: voucherResult.voucher.apply_scope,
        };

        voucherUsagePayload = {
          voucher_id: voucherResult.voucher.id,
          user_id: user._id,
          code: voucherResult.voucher.code,
          discount_type: voucherResult.voucher.discount_type,
          discount_value: Number(voucherResult.voucher.discount_value || 0),
          apply_scope: voucherResult.voucher.apply_scope,
          subtotal_price: subtotalPrice,
          eligible_amount: Number(voucherResult.eligible_amount || 0),
          discount_amount: discountAmount,
          final_price: Math.max(subtotalPrice - discountAmount, 0),
          payment_status: "paid",
          used_at: new Date(),
        };
      }

      const totalPrice = Math.max(subtotalPrice - discountAmount, 0);
      [createdBooking] = await Booking.create([{
        user_id: user._id,
        showtime_id,
        showtime_seat_ids: seats.map((seat) => seat._id),
        customer_name: user.full_name,
        customer_email: user.email,
        customer_phone: user.phone,
        combos: reservedCombos,
        voucher: voucherSnapshot,
        subtotal_price: subtotalPrice,
        discount_amount: discountAmount,
        total_price: totalPrice,
      }], { session });

      if (voucherUsagePayload) {
        await VoucherUsage.create([{
          ...voucherUsagePayload,
          booking_id: createdBooking._id,
        }], { session });
      }
    });

    return res.status(201).json({ success: true, message: "Đặt vé thành công", data: createdBooking });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user_id: req.user.id })
      .populate({
        path: "showtime_id",
        select: "movie_id room_id start_time end_time",
        populate: [
          { path: "movie_id", select: "title poster duration age_limit" },
          {
            path: "room_id",
            select: "name cinema_id",
            populate: { path: "cinema_id", select: "name address city" },
          },
        ],
      })
      .populate({
        path: "showtime_seat_ids",
        populate: {
          path: "seat_id",
          select: "seat_row seat_number seat_type_id",
          populate: { path: "seat_type_id", select: "name" },
        },
      })
      .populate({ path: "combos.combo_id", select: "name image type" })
      .populate({ path: "voucher.voucher_id", select: "code name apply_scope" })
      .sort({ created_at: -1 });
    return res.json({ success: true, data: bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
