export const BOOKING_SCAN_ACTIONS = ["LOOKUP", "PRINT_INITIAL", "REPRINT"];

export const bookingScanHistoryUnion = () => ({
  $unionWith: {
    coll: "booking_action_logs",
    pipeline: [
      { $match: { action: { $in: BOOKING_SCAN_ACTIONS } } },
      { $set: {
        source: "booking",
        scannedAt: "$createdAt",
        ticketId: { $arrayElemAt: ["$ticketIds", 0] },
        errorNote: { $ifNull: ["$reason", ""] },
      } },
    ],
  },
});
