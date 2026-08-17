import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultShowtimeViewState,
  paginateShowtimeGroups,
  sortShowtimeGroupsNewestFirst,
} from "./showtimePagination.js";

test("resets every showtime filter and pagination to the initial state", () => {
  assert.deepEqual(createDefaultShowtimeViewState(), {
    searchQuery: "",
    movieFilter: "",
    roomFilter: "",
    dateFilter: "",
    statusFilter: "",
    currentPage: 1,
  });
});

test("sorts groups and their slots from newest to oldest", () => {
  const groups = [
    {
      key: "older",
      startDate: "2026-07-17T10:00:00Z",
      showtimes: [
        { id: "a", start_time: "2026-07-17T10:00:00Z" },
        { id: "b", start_time: "2026-07-17T23:00:00Z" },
      ],
    },
    {
      key: "newer",
      startDate: "2026-07-18T11:00:00Z",
      showtimes: [
        { id: "c", start_time: "2026-07-18T11:00:00Z" },
      ],
    },
  ];

  const result = sortShowtimeGroupsNewestFirst(groups);

  assert.deepEqual(
    result.map((group) => group.key),
    ["newer", "older"],
  );
  assert.deepEqual(
    result[1].showtimes.map((showtime) => showtime.id),
    ["b", "a"],
  );
});

test("places groups with invalid start times last", () => {
  const result = sortShowtimeGroupsNewestFirst([
    {
      key: "invalid",
      startDate: "invalid",
      showtimes: [{ start_time: "invalid" }],
    },
    {
      key: "valid",
      startDate: "2026-07-18T11:00:00Z",
      showtimes: [{ start_time: "2026-07-18T11:00:00Z" }],
    },
  ]);

  assert.deepEqual(
    result.map((group) => group.key),
    ["valid", "invalid"],
  );
});

test("returns ten groups by default and a partial final page", () => {
  const groups = Array.from({ length: 23 }, (_, index) => ({ key: index }));

  assert.equal(paginateShowtimeGroups(groups, 1).items.length, 10);
  assert.equal(paginateShowtimeGroups(groups, 3).items.length, 3);
  assert.equal(paginateShowtimeGroups(groups, 3).totalPages, 3);
});

test("clamps a requested page after the result count shrinks", () => {
  const groups = Array.from({ length: 7 }, (_, index) => ({ key: index }));
  const result = paginateShowtimeGroups(groups, 4);

  assert.equal(result.currentPage, 1);
  assert.equal(result.totalPages, 1);
  assert.equal(result.items.length, 7);
});
