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
connectDB().then(()=>{
app.listen(5001, () =>{
    console.log("5001")
})

})

