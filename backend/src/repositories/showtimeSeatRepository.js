import ShowtimeSeat from "../models/ShowtimeSeat.js";

const defaultPopulate = [
  {
    path: "showtime_id",
    select:
      "movie_id room_id start_time end_time base_price created_at updated_at",
    populate: [
      {
        path: "movie_id",
        select: "title poster duration release_date status",
      },
      {
        path: "room_id",
        select: "name capacity cinema_id",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      },
    ],
  },
  {
    path: "seat_id",
    select:
      "room_id seat_type_id seat_row seat_number status created_at updated_at",
    populate: [
      {
        path: "room_id",
        select: "name capacity cinema_id",
        populate: {
          path: "cinema_id",
          select: "name city address",
        },
      },
      {
        path: "seat_type_id",
        select: "name description price_multiplier",
      },
    ],
  },
];

const applyQueryOptions = (query, options = {}) => {
  if (options.populate !== false) {
    query.populate(options.populate ?? defaultPopulate);
  }

  if (options.select) {
    query.select(options.select);
  }

  if (options.sort) {
    query.sort(options.sort);
  }

  if (options.skip !== undefined) {
    query.skip(options.skip);
  }

  if (options.limit !== undefined) {
    query.limit(options.limit);
  }

  return query;
};

export const findAllShowtimeSeats = async (filter = {}, options = {}) => {
  const query = ShowtimeSeat.find(filter);
  applyQueryOptions(query, options);
  return query;
};

export const findShowtimeSeatsByShowtimeId = async (
  showtimeId,
  options = {},
) => {
  const query = ShowtimeSeat.find({
    showtime_id: showtimeId,
    deleted_at: null,
  });
  applyQueryOptions(query, options);
  return query;
};

export const findShowtimeSeatById = async (id, options = {}) => {
  const query = ShowtimeSeat.findOne({ _id: id, deleted_at: null });
  applyQueryOptions(query, options);
  return query;
};

export const findShowtimeSeatByIdIncludingDeleted = async (
  id,
  options = {},
) => {
  const query = ShowtimeSeat.findById(id);
  applyQueryOptions(query, options);
  return query;
};

export const findOneShowtimeSeat = async (filter = {}, options = {}) => {
  const query = ShowtimeSeat.findOne(filter);
  applyQueryOptions(query, options);
  return query;
};

export const createShowtimeSeat = async (payload) => {
  return ShowtimeSeat.create(payload);
};

export const createManyShowtimeSeats = async (payloads) => {
  return ShowtimeSeat.insertMany(payloads);
};

export const bulkUpsertShowtimeSeats = async (operations = []) => {
  if (!operations.length) {
    return {
      upsertedCount: 0,
      matchedCount: 0,
      modifiedCount: 0,
    };
  }

  return ShowtimeSeat.bulkWrite(operations, {
    ordered: false,
  });
};

export const updateShowtimeSeatById = async (id, updates, options = {}) => {
  const queryOptions = {
    new: true,
    runValidators: true,
    ...options,
  };

  const query = ShowtimeSeat.findByIdAndUpdate(id, updates, queryOptions);
  applyQueryOptions(query, options);
  return query;
};

export const softDeleteShowtimeSeatById = async (id) => {
  return ShowtimeSeat.findByIdAndUpdate(
    id,
    {
      deleted_at: new Date(),
    },
    {
      new: true,
    },
  );
};

export const softDeleteShowtimeSeatsByShowtimeId = async (showtimeId) => {
  return ShowtimeSeat.updateMany(
    {
      showtime_id: showtimeId,
      deleted_at: null,
    },
    {
      deleted_at: new Date(),
    },
  );
};

export const countShowtimeSeats = async (filter = {}) => {
  return ShowtimeSeat.countDocuments(filter);
};
