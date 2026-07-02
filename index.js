import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
dotenv.config()

const port = process.env.port || 5000
const mongoUrl = process.env.MONGODB_URI


const connectDb = async (params) => {
    try {
        await mongoose.connect(mongoUrl);
        console.log("db connected");
    } catch (error) {
        console.log("db error")
    }
}
const app = express()

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.NEXT_BASE_URL
    }
});

io.on("connection", (socket) => {
    socket.on("identity", (data) => {
        console.log(data);
    })
})

server.listen(port, () => {
    console.log("Server is working crazyyy")
    connectDb();
})