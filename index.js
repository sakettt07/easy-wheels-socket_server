import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import User from "./models/user.model.js";
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
    console.log(socket.id)
    socket.on("identity", async (userId) => {
        socket.userId = userId
        await User.findByIdAndUpdate(userId, {
            socketId: socket.id,
            isOnline: true
        })
    })
    socket.on("disconnect", async () => {
        if (!socket.userId) return
        await User.findByIdAndUpdate(userId, {
            socketId: null,
            isOnline: false
        })
    })
})

server.listen(port, () => {
    console.log("Server is working crazyyy")
    connectDb();
})