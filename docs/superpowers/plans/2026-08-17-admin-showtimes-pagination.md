# Admin Showtimes Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiển thị tối đa 10 hàng nhóm suất chiếu mỗi trang trên `/admin/showtimes`, với suất có `start_time` mới nhất luôn xuất hiện trước.

**Architecture:** Giữ API hiện tại và thực hiện sắp xếp/phân trang sau bước lọc và gộp dữ liệu ở frontend admin. Tách phép sắp xếp, tính trang và kẹp trang thành utility thuần để kiểm thử bằng Node test runner; component React chỉ quản lý state và render điều khiển.

**Tech Stack:** React 19, Vite 7, JavaScript ES modules, Node.js built-in test runner, CSS admin hiện có.

## Global Constraints

- Mỗi trang có tối đa 10 hàng nhóm suất chiếu.
- Khung giờ trong nhóm và các nhóm đều được sắp xếp theo `start_time` giảm dần.
- Giá trị thời gian không hợp lệ được xếp cuối.
- Thay đổi chỉ áp dụng cho trang admin; API và trang khách hàng không đổi.
- Giữ cách gộp suất chiếu và visual vocabulary hiện tại.

---

### Task 1: Pure sorting and pagination utilities

**Files:**
- Create: `frontend-user/src/admin/utils/showtimePagination.js`
- Test: `frontend-user/src/admin/utils/showtimePagination.test.js`

**Interfaces:**
- Consumes: nhóm có shape `{ startDate, showtimes: Array<{ start_time }> }`.
- Produces: `SHOWTIME_PAGE_SIZE`, `sortShowtimeGroupsNewestFirst(groups)`, `paginateShowtimeGroups(groups, requestedPage, pageSize)`.

- [ ] **Step 1: Write the failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  SHOWTIME_PAGE_SIZE,
  paginateShowtimeGroups,
  sortShowtimeGroupsNewestFirst,
} from "./showtimePagination.js";

test("sorts groups and their slots from newest to oldest", () => {
  const groups = [
    { key: "older", startDate: "2026-07-17T10:00:00Z", showtimes: [
      { id: "a", start_time: "2026-07-17T10:00:00Z" },
      { id: "b", start_time: "2026-07-17T23:00:00Z" },
    ] },
    { key: "newer", startDate: "2026-07-18T11:00:00Z", showtimes: [
      { id: "c", start_time: "2026-07-18T11:00:00Z" },
    ] },
  ];

  const result = sortShowtimeGroupsNewestFirst(groups);

  assert.deepEqual(result.map((group) => group.key), ["newer", "older"]);
  assert.deepEqual(result[1].showtimes.map((showtime) => showtime.id), ["b", "a"]);
});

test("places groups with invalid start times last", () => {
  const result = sortShowtimeGroupsNewestFirst([
    { key: "invalid", startDate: "invalid", showtimes: [{ start_time: "invalid" }] },
    { key: "valid", startDate: "2026-07-18T11:00:00Z", showtimes: [{ start_time: "2026-07-18T11:00:00Z" }] },
  ]);

  assert.deepEqual(result.map((group) => group.key), ["valid", "invalid"]);
});

test("returns at most ten groups and a partial final page", () => {
  const groups = Array.from({ length: 23 }, (_, index) => ({ key: index }));

  assert.equal(SHOWTIME_PAGE_SIZE, 10);
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
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test src/admin/utils/showtimePagination.test.js` from `frontend-user`.

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `showtimePagination.js`.

- [ ] **Step 3: Implement the minimal pure utilities**

```js
export const SHOWTIME_PAGE_SIZE = 10;

const toSortableTimestamp = (value) => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
};

export const sortShowtimeGroupsNewestFirst = (groups = []) =>
  groups
    .map((group) => {
      const showtimes = [...(group.showtimes || [])].sort(
        (first, second) =>
          toSortableTimestamp(second.start_time) -
          toSortableTimestamp(first.start_time),
      );

      return {
        ...group,
        startDate: showtimes[0]?.start_time || group.startDate,
        showtimes,
      };
    })
    .sort(
      (first, second) =>
        toSortableTimestamp(second.startDate) -
        toSortableTimestamp(first.startDate),
    );

export const paginateShowtimeGroups = (
  groups = [],
  requestedPage = 1,
  pageSize = SHOWTIME_PAGE_SIZE,
) => {
  const totalPages = Math.max(Math.ceil(groups.length / pageSize), 1);
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    currentPage,
    totalPages,
    items: groups.slice(start, start + pageSize),
  };
};
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test src/admin/utils/showtimePagination.test.js` from `frontend-user`.

Expected: 4 tests PASS with no warnings.

- [ ] **Step 5: Commit the utility and tests**

```bash
git add frontend-user/src/admin/utils/showtimePagination.js frontend-user/src/admin/utils/showtimePagination.test.js
git commit -m "test: cover showtime sorting and pagination"
```

### Task 2: Wire pagination into the admin showtimes table

**Files:**
- Modify: `frontend-user/src/admin/pages/ShowtimesPage.jsx`

**Interfaces:**
- Consumes: `sortShowtimeGroupsNewestFirst` and `paginateShowtimeGroups` from Task 1.
- Produces: paginated table rendering and accessible previous/next controls.

- [ ] **Step 1: Add page state and apply sorted grouping**

Import the utilities, add `const [currentPage, setCurrentPage] = useState(1);`, pass the existing grouped result through `sortShowtimeGroupsNewestFirst`, then derive pagination:

```js
const {
  currentPage: resolvedCurrentPage,
  totalPages,
  items: pagedShowtimeGroups,
} = useMemo(
  () => paginateShowtimeGroups(groupedShowtimes, currentPage),
  [currentPage, groupedShowtimes],
);
```

- [ ] **Step 2: Reset and clamp page state**

Add focused effects:

```js
useEffect(() => {
  setCurrentPage(1);
}, [dateFilter, movieFilter, roomFilter, searchQuery, statusFilter]);

useEffect(() => {
  if (currentPage !== resolvedCurrentPage) {
    setCurrentPage(resolvedCurrentPage);
  }
}, [currentPage, resolvedCurrentPage]);
```

- [ ] **Step 3: Render the current page and paginator**

Replace `groupedShowtimes.map` with `pagedShowtimeGroups.map`. Wrap the table container and paginator in a fragment, then render:

```jsx
<nav className="pagination" aria-label="Phân trang suất chiếu">
  <button
    className="pagination-btn"
    disabled={resolvedCurrentPage <= 1}
    onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
    type="button"
  >
    Trang trước
  </button>
  <span className="pagination-info">
    Trang {resolvedCurrentPage} / {totalPages}
  </span>
  <button
    className="pagination-btn"
    disabled={resolvedCurrentPage >= totalPages}
    onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
    type="button"
  >
    Trang sau
  </button>
</nav>
```

- [ ] **Step 4: Run automated verification**

Run from `frontend-user`:

```bash
node --test src/admin/utils/showtimePagination.test.js
npm run lint
npm run build
```

Expected: utility tests pass; lint and Vite production build exit 0.

- [ ] **Step 5: Run bounded visual verification**

Open `/admin/showtimes` with seeded data and inspect one desktop viewport plus one mobile viewport. Verify newest groups/slots are first, exactly 10 rows appear when at least 11 groups exist, controls disable correctly, filters return to page 1, and the paginator does not overflow.

- [ ] **Step 6: Commit the UI integration**

```bash
git add frontend-user/src/admin/pages/ShowtimesPage.jsx
git commit -m "feat: paginate admin showtimes newest first"
```
