export const SHOWTIME_PAGE_SIZE = 10;

export const createDefaultShowtimeViewState = () => ({
  searchQuery: "",
  movieFilter: "",
  roomFilter: "",
  dateFilter: "",
  statusFilter: "",
  currentPage: 1,
});

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
