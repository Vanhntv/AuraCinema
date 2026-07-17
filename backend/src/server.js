import express from "express";
import cors from "cors";
import "dotenv/config";

import { connectDB } from "./config/db.js";
import genresRoute from "./router/genresRouters.js";
import moviesRoute from "./router/moviesRouters.js";
import authRoute from "./router/authRouters.js";
import cinemasRoute from "./router/cinemasRouters.js";
import roomsRoute from "./router/roomsRouters.js";
import trailersRoute from "./router/trailersRouters.js";
import dashboardRoute from "./router/dashboardRouters.js";
import seatTypesRoute from "./router/seatTypesRouters.js";
import seatsRoute from "./router/seatsRouters.js";
import showtimesRoute from "./router/showtimesRouters.js";
import showtimeSeatsRoute from "./router/showtimeSeatsRouters.js";
import vouchersRoute from "./router/vouchersRouters.js";
import bookingsRoute from "./router/bookingsRouters.js";
import usersRoute from "./router/usersRouters.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use("/api/genres", genresRoute);
app.use("/api/movies", moviesRoute);
app.use("/api/auth", authRoute);
app.use("/api/cinemas", cinemasRoute);
app.use("/api/rooms", roomsRoute);
app.use("/api/trailers", trailersRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/seat-types", seatTypesRoute);
app.use("/seat-types", seatTypesRoute);
app.use("/api/seats", seatsRoute);
app.use("/seats", seatsRoute);
app.use("/api/showtimes", showtimesRoute);
app.use("/api/showtime-seats", showtimeSeatsRoute);
app.use("/showtime-seats", showtimeSeatsRoute);
app.use("/api/vouchers", vouchersRoute);
app.use("/api/bookings", bookingsRoute);
app.use("/api/users", usersRoute);

connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} dang duoc su dung. Hay tat process cu hoac chay voi PORT khac.`,
      );
      process.exit(1);
    }

    throw error;
  });
});
