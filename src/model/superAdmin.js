// SuperAdminModel.js
import mongoose from "mongoose";

const superAdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true }, // hashed
    secretKey: { type: String, required: true }, // hashed

    role: { type: String, default: "superadmin" }, // ← add karo

    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("SuperAdmin", superAdminSchema);
