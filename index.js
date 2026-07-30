import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import User from "./models/user.model.js";
dotenv.config()

const port = process.env.PORT || 5000
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
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.NEXT_BASE_URL
    }
});

app.post("/emit", async (req, res) => {
    const { event, to, data } = req.body;
    console.log("[Server] /emit:", { event, to, data })
    try {
        const user = await User.findById(to);
        console.log("[Server] Found user:", user)
        if (user?.socketId) {
            io.to(user.socketId).emit(event, data);
            console.log(`[Server] Emitted "${event}" to user ${to} (socket: ${user.socketId})`)
        } else {
            console.log(`[Server] User ${to} not found or offline (no socketId)`)
        }
        return res.status(200).json({
            message: "Event emitted"
        })
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error"
        })
    }
})

io.on("connection", (socket) => {
    console.log('[Socket] User connected:', socket.id)

    socket.on("identity", async (userId) => {
        try {
            socket.userId = userId
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    socketId: socket.id,
                    isOnline: true
                },
                { new: true }
            )
        } catch (error) {
            console.error('[Socket] Error setting identity:', error.message)
        }
    })

    socket.on("update-location", async ({ userId, latitude, longitude }) => {
        try {
            console.log('[Socket] Location update received:', { userId, latitude, longitude })

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    $set: {
                        "location.type": "Point",
                        "location.coordinates": [longitude, latitude]
                    }
                },
                { new: true }
            )
        } catch (error) {
            console.error('[Socket] Error updating location:', error.message)
        }
    })
    socket.on("join-ride", (bookingId) => {
        console.log("[Socket] User joined ride:", bookingId, socket.id)
        socket.join(`ride-${bookingId}`);
    })
    socket.on("rider-location-update", ({ bookingId, latitude, longitude }) => {
        console.log("[Socket] Rider location update:", bookingId, latitude, longitude)
        io.to(`ride-${bookingId}`).emit("rider-location", {
            latitude,
            longitude
        })
    })
    socket.on("chat-message", ({ bookingId, senderRole, message }) => {
        console.log("[Socket] Chat message:", bookingId, senderRole, message)
        socket.broadcast.to(`ride-${bookingId}`).emit("chat-message", {
            bookingId,
            senderRole,
            message
        })
    })
    socket.on("disconnect", async () => {
        try {
            if (!socket.userId) return

            const updatedUser = await User.findByIdAndUpdate(
                socket.userId,
                {
                    socketId: null,
                    isOnline: false
                },
                { new: true }
            )
        } catch (error) {
            console.error('[Socket] Error on disconnect:', error.message)
        }
    })
})

server.listen(port, () => {
    console.log("Server is working crazyyy")
    connectDb();
})