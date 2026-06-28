import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    // =========================
    // MEMBER TYPE
    // =========================
    memberType: {
      type: String,
      enum: ["Flat", "Shop"],
      required: true,
    },

    memberStatus: {
      type: String,
      enum: ["Owner", "Rent"],
      required: true,
    },

    // =========================
    // BUILDING
    // =========================
    buildingCode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    buildingName: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================
    // UNIT
    // =========================
    unitNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    shopName: {
      type: String,
      default: null,
      trim: true,
    },

    // =========================
    // OWNER DETAILS
    // =========================
    ownerName: {
      type: String,
      required: function () {
        return this.role === "primary"; // family ke liye required nahi
      },
      trim: true,
    },

    ownerPhone: {
      type: String,
      required: function () {
        return this.role === "primary"; // family ke liye required nahi
      },
      trim: true,
    },

    // =========================
    // TENANT DETAILS
    // =========================
    renterName: {
      type: String,
      default: null,
      trim: true,
    },

    renterPhone: {
      type: String,
      default: null,
      trim: true,
    },

    // =========================
    // MEMBER DETAILS
    // =========================
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    primaryPhone: {
      type: String,
      required: true,
      unique: true,
      sparse: true, // null pe unique skip
      match: [/^[0-9]{10}$/, "Phone must be 10 digits"],
    },

    // =========================
    // LOGIN (sirf primary ke liye)
    // =========================
    email: {
      type: String,
      default: null,
      unique: true,
      sparse: true, // null pe unique skip
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      default: null,
      minlength: 6,
      select: false,
    },

    // =========================
    // OTP
    // =========================
    otp: {
      type: String,
      default: null,
    },

    otpExpires: {
      type: Date,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // =========================
    // APPROVAL
    // =========================
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    // =========================
    // ROLE & RELATION
    // =========================
    role: {
      type: String,
      enum: ["primary", "family"],
      default: "primary",
    },

    relation: {
      type: String,
      default: null,
      trim: true,
    },

    // =========================
    // DEVICE
    // =========================
    currentDeviceId: {
      type: String,
      default: null,
    },
    fcmToken: {
      type: String,
      default: null,
    },

    // =========================
    // RESET PASSWORD
    // =========================
    resetOtp: {
      type: String,
      default: null,
      select: false,
    },

    resetOtpExpiry: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =========================
// COMPOUND INDEX
// ek unit me sirf ek primary member
// =========================
memberSchema.index(
  { buildingCode: 1, unitNo: 1, memberType: 1, role: 1 },
  { 
    unique: true,
    partialFilterExpression: { role: "primary" }  // sirf primary pe enforce
  }
);
// export default mongoose.model("Member", memberSchema);
export default mongoose.models.Member ||
  mongoose.model("Member", memberSchema);
