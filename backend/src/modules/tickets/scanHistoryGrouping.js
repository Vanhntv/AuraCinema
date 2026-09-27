export const scanHistoryGrouping = () => [
  { $sort: { scannedAt: -1, _id: -1 } },
  { $group: {
    _id: { $ifNull: ["$booking._id", { source: "$source", logId: "$_id" }] },
    latest: { $first: "$$ROOT" },
    scannedSeats: { $addToSet: "$ticket.seatLabel" },
    scanCount: { $sum: 1 },
  } },
  { $replaceRoot: { newRoot: { $mergeObjects: ["$latest", { scannedSeats: "$scannedSeats", scanCount: "$scanCount" }] } } },
];
