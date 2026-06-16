import express from 'express'
import genresRoute  from './router/genresRouters.js'
import { connectDB } from './config/db.js';
import cors from "cors";
import moviesRoute from "./router/moviesRouters.js";
import authRoute from "./router/authRouters.js";
import "dotenv/config";


const app = express();
app.use(cors());
app.use(express.json())
app.use("/api/genres",genresRoute)
app.use("/api/movies", moviesRoute)
app.use("/api/auth", authRoute)
connectDB().then(()=>{
app.listen(5001, () =>{
    console.log("5001")
})

})

