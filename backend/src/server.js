import express from 'express'
import genresRoute  from './router/genresRouters.js'
import { connect } from 'mongoose';
import { connectDB } from './config/db.js';
import cors from "cors";


const app = express();
app.use(cors());
app.use(express.json())
app.use("/api/genres",genresRoute)
connectDB().then(()=>{
app.listen(5001, () =>{
    console.log("5001")
})

})


