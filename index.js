import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import cron from "node-cron";
import User from "./models/user.model.js";
import { logger } from "./logger.js";
import axios from "axios";
dotenv.config()

const port = process.env.PORT || 5000
const mongoUrl = process.env.MONGODB_URI


const connectDb = async (params) => {
    try {
        await mongoose.connect(mongoUrl);
        logger.info("db connected");
    } catch (error) {
        logger.error("db error")
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
    logger.info({ event, to, data }, "[Server] /emit:");
    try {
        const user = await User.findById(to);
        logger.info({ user }, "[Server] Found user:");
        if (user?.socketId) {
            io.to(user.socketId).emit(event, data);
            logger.info(`[Server] Emitted "${event}" to user ${to} (socket: ${user.socketId})`);
        } else {
            logger.info(`[Server] User ${to} not found or offline (no socketId)`);
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
    logger.info({ socketId: socket.id }, '[Socket] User connected:');

    /*The below socket event is made and got trigger when the user get logged in then its current location will gets fetched and 
    and its socket id will gets stored in the database and will be online. (Called under GeoUpdater then entry page under useeffect) */

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
            logger.error({ error: error.message }, '[Socket] Error setting identity:');
        }
    })
    /* The below socket event will store the current location of everyone using the platform in the database.
    */

    socket.on("update-location", async ({ userId, latitude, longitude }) => {
        try {
            logger.info({ userId, latitude, longitude }, '[Socket] Location update received:');

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
            logger.error({ error: error.message }, '[Socket] Error updating location:');
        }
    })

    /* The below socket event will create a room for the rider and user to communicate with each other  */
    socket.on("join-ride", (bookingId) => {
        logger.info({ bookingId, socketId: socket.id }, "[Socket] User joined ride:");
        socket.join(`ride-${bookingId}`);
    })
    socket.on("rider-location-update", ({ bookingId, latitude, longitude }) => {
        logger.info({ bookingId, latitude, longitude }, "[Socket] Rider location update:");
        io.to(`ride-${bookingId}`).emit("rider-location", {
            latitude,
            longitude
        })
    })
    /* The below event is made to send the message between the rider and user in real time.  */
    socket.on("chat-message", ({ bookingId, senderRole, message }) => {
        logger.info({ bookingId, senderRole, message }, "[Socket] Chat message:");
        socket.broadcast.to(`ride-${bookingId}`).emit("chat-message", {
            bookingId,
            senderRole,
            message
        })
    })
    /* The below event is made to make the user offline when he get logged out.  */
    socket.on("disconnect", async () => {
        try {
            if (!socket.userId) return

            await User.findByIdAndUpdate(
                socket.userId,
                {
                    socketId: null,
                    isOnline: false
                },
                { new: true }
            )
        } catch (error) {
            logger.error({ error: error.message }, '[Socket] Error on disconnect:');
        }
    })
})

// Schedule daily automation to expire active rides at 23:59
// TESTING: Changed to run every 5 minutes (*/5 * * * *)
cron.schedule("*/5 * * * *", async () => {
    try {
        logger.info("[Cron] Running daily active rides expiration job...");
        const response = await axios.post(`${process.env.NEXT_BASE_URL || 'http://localhost:3000'}/api/cron/expire-rides`);
        const data = await response.data;
        logger.info("[Cron] Expire rides job completed:");
    } catch (error) {
        logger.error({ error: error.message }, "[Cron] Failed to run expire rides job:");
    }
});

server.listen(port, () => {
    logger.info("Server is working crazyyy");
    connectDb();
})