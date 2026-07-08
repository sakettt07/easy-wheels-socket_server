import mongoose, { Document } from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String
    },
    role: {
        type: String,
        default: "user",
        enum: ["user", "rider", "admin"]
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    riderOnboardingSteps: {
        type: Number,
        min: 0,
        max: 8,
        default: 0
    },
    riderStatus: {
        type: String,
        default: "pending",
        enum: ["pending", "approved", "rejected"]
    },
    rejectionReason: {
        type: String
    },
    contact: {
        type: String
    },
    videoKYCStatus: {
        type: String,
        enum: ["not_required", "pending", "in_progress", "approved", "rejected"],
        default: "not_required"
    },
    videoKYCRoomId: { type: String },
    VideoKYCRejectionReason: { type: String },
    otp: {
        type: String
    },
    otpExpiresAt: {
        type: Date
    },
    socketId: {
        type: String
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    isOnline: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true
});


userSchema.index({ location: "2dsphere" })

const User = mongoose.model("User", userSchema);
export default User;