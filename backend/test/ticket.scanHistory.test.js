import test from "node:test";
import assert from "node:assert/strict";
import TicketScanLog from "../src/models/TicketScanLog.js";
import { scanHistoryGrouping } from "../src/modules/tickets/scanHistoryGrouping.js";
import { bookingScanHistoryUnion } from "../src/modules/tickets/bookingScanHistory.js";
import { getAdminTicketScanLogs } from "../src/controllers/adminTicketControllers.js";

test("grouping uses only booking identity so repeated scans, prints and seats share one row", () => {
  const group = scanHistoryGrouping().find((step) => step.$group).$group;
  assert.deepEqual(group._id, { $ifNull: ["$booking._id", { source: "$source", logId: "$_id" }] });
  assert.deepEqual(group.latest, { $first: "$$ROOT" });
  assert.deepEqual(group.scannedSeats, { $addToSet: "$ticket.seatLabel" });
});

test("order scan history reads pre-existing lookup and print logs, not complaint notes", () => {
  const union = bookingScanHistoryUnion().$unionWith;
  assert.equal(union.coll, "booking_action_logs");
  assert.deepEqual(union.pipeline[0].$match.action.$in, ["LOOKUP", "PRINT_INITIAL", "REPRINT"]);
  assert.equal(union.pipeline[1].$set.scannedAt, "$createdAt");
  assert.equal(union.pipeline[1].$set.source, "booking");
});

test("order lookup links booking and seats without requiring an individual ticket", async () => {
  const original = TicketScanLog.aggregate;
  TicketScanLog.aggregate = async (pipeline) => {
    if (pipeline.some((step) => step.$project)) return [{
      _id: "lookup-log", source: "booking", scannedAt: new Date(), action: "LOOKUP", result: "SUCCESS",
      booking: {
        _id: "order-1", booking_code: "ORDER-1", seat_items: [{ seat_label: "A1" }, { seat_label: "A2" }],
        movie_snapshot: { title: "Phim của đơn" },
        showtime_snapshot: { start_time: new Date(), room_name: "Phòng 1" },
      },
    }];
    return [{ count: 1, totalItems: 1 }];
  };
  try {
    let body;
    await getAdminTicketScanLogs({ query: { page: 1, limit: 10, groupBy: "booking" } }, {
      json(value) { body = value; return this; }, status() { return this; },
    });
    assert.equal(body.success, true);
    assert.equal(body.data[0].bookingId, "order-1");
    assert.equal(body.data[0].bookingCode, "ORDER-1");
    assert.equal(body.data[0].seatLabel, "A1, A2");
    assert.equal(body.data[0].scanCount, 2);
    assert.equal(body.data[0].ticketCount, 2);
    assert.equal(body.data[0].movie.title, "Phim của đơn");
    assert.equal(body.data[0].room.name, "Phòng 1");
  } finally { TicketScanLog.aggregate = original; }
});

test("history groups before pagination, searches order codes and returns booking identity", async () => {
  const original = TicketScanLog.aggregate;
  const pipelines = [];
  const scannedAt = new Date();
  TicketScanLog.aggregate = async (pipeline) => {
    pipelines.push(pipeline);
    if (pipeline.some((step) => step.$project)) return [{
      _id: "log-1", scannedAt, booking: { _id: "order-1", booking_code: "AURA-ORDER" },
      ticket: { ticketCode: "AURA-ORDER-A1", seatLabel: "A1" },
      bookingTickets: [{ seatLabel: "A1" }, { seatLabel: "A2" }, { seatLabel: "A3" }],
      scannedSeats: ["A2", "A1"], scanCount: 2, action: "VERIFY", result: "SUCCESS",
    }];
    if (pipeline.at(-1)?.$count === "totalItems") return [{ totalItems: 1 }];
    return [{ count: 2 }];
  };
  try {
    let body;
    await getAdminTicketScanLogs({ query: { page: 1, limit: 10, groupBy: "booking", q: "AURA-ORDER" } }, {
      json(response) { body = response; return this; },
      status() { return this; },
    });
    assert.equal(body.success, true);
    assert.equal(body.data[0].bookingId, "order-1");
    assert.equal(body.data[0].bookingCode, "AURA-ORDER");
    assert.equal(body.data[0].seatLabel, "A1, A2, A3");
    assert.equal(body.data[0].scanCount, 2);
    assert.equal(body.data[0].ticketCount, 3);
    assert.equal(body.data[0].historyCount, 2);
    assert.equal(body.pagination.totalItems, 1);
    assert.equal(body.stats.totalScans, 4);
    const list = pipelines[0];
    assert.ok(list.findIndex((step) => step.$group) < list.findIndex((step) => step.$skip !== undefined));
    assert.ok(list.some((step) => step.$match?.$or?.some((condition) => condition["booking.booking_code"])));
    assert.equal(list.some((step) => step.$match?.$or?.some((condition) => condition["ticket.ticketCode"])), false);
  } finally {
    TicketScanLog.aggregate = original;
  }
});
