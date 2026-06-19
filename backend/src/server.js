import express from 'express'
import genresRoute  from './router/genresRouters.js'
import { connectDB } from './config/db.js';
import cors from "cors";
import moviesRoute from "./router/moviesRouters.js";
import authRoute from "./router/authRouters.js";
import cinemasRoute from "./router/cinemasRouters.js";
import roomsRoute from "./router/roomsRouters.js";
import trailersRoute from "./router/trailersRouters.js";
import dashboardRoute from "./router/dashboardRouters.js";
import seatTypesRoute from "./router/seatTypesRouters.js";
import seatsRoute from "./router/seatsRouters.js";
import showtimesRoute from "./router/showtimesRouters.js";
import "dotenv/config";


const app = express();
app.use(cors());
app.use(express.json())
app.use("/api/genres",genresRoute)
app.use("/api/movies", moviesRoute)
app.use("/api/auth", authRoute)
app.use("/api/cinemas", cinemasRoute)
app.use("/api/rooms", roomsRoute)
app.use("/api/trailers", trailersRoute)
app.use("/api/dashboard", dashboardRoute)
app.use("/api/seat-types", seatTypesRoute)
app.use("/seat-types", seatTypesRoute)
app.use("/api/seats", seatsRoute)
app.use("/seats", seatsRoute)
app.use("/api/showtimes", showtimesRoute)
connectDB().then(()=>{
app.listen(5001, () =>{
    console.log("5001")
})

})

