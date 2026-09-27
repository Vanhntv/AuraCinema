import test from "node:test";
import assert from "node:assert/strict";
import TicketScanLog from "../src/models/TicketScanLog.js";
import { scanHistoryGrouping } from "../src/modules/tickets/scanHistoryGrouping.js";
import { getAdminTicketScanLogs } from "../src/controllers/adminTicketControllers.js";

test("grouping keeps different scan times, results and operators separate", () => {
  const group = scanHistoryGrouping().find((step) => step.$group).$group;
  assert.deepEqual(group._id.booking, { $ifNull: ["$booking._id", "$_id"] });
  assert.equal(group._id.time.$dateToString.format, "%Y-%m-%dT%H:%M:%S");
  assert.equal(group._id.action, "$action");
  assert.equal(group._id.result, "$result");
  assert.equal(group._id.admin, "$adminId");
  assert.deepEqual(group.scannedSeats, { $addToSet: "$ticket.seatLabel" });
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
    assert.equal(body.data[0].seatLabel, "A1, A2");
    assert.equal(body.data[0].scanCount, 2);
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
