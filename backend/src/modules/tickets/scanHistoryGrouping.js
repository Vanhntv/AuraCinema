export const scanHistoryGrouping = () => [
  { $sort: { scannedAt: -1, _id: -1 } },
  { $group: {
    _id: {
      booking: { $ifNull: ["$booking._id", "$_id"] },
      time: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S", date: "$scannedAt" } },
      admin: "$adminId",
      action: "$action",
      result: "$result",
    },
    latest: { $first: "$$ROOT" },
    scannedSeats: { $addToSet: "$ticket.seatLabel" },
    scanCount: { $sum: 1 },
  } },
  { $replaceRoot: { newRoot: { $mergeObjects: ["$latest", { scannedSeats: "$scannedSeats", scanCount: "$scanCount" }] } } },
];
