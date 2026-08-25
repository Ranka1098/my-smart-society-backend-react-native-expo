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
      minlength: [2, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
    },
    buildingId: {
      // ✅ NAYA
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },
    buildingName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Building name must be at least 2 characters"],
      maxlength: [50, "Building name cannot exceed 50 characters"],
    },

    // =========================
    // UNIT
    // =========================
    unitNo: {
      type: String,
      required: true,
      trim: true,
      index: true,
    maxlength: [20, "Unit number cannot exceed 20 characters"]
    },

    shopName: {
      type: String,
      default: null,
      trim: true,
      minlength: [2, "Shop name must be at least 2 characters"],
      maxlength: [50, "Shop name cannot exceed 50 characters"],
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
      minlength: [2, "Owner name must be at least 2 characters"],
      maxlength: [50, "Owner name cannot exceed 50 characters"],
    },

    ownerPhone: {
      type: String,
      required: function () {
        return this.role === "primary"; // family ke liye required nahi
      },
      trim: true,
     minlength: [10, "Owner phone must be 10 digits"],
  maxlength: [10, "Owner phone cannot exceed 10 digits"],
    },

    // =========================
    // TENANT DETAILS
    // =========================
    renterName: {
      type: String,
      default: null,
      trim: true,
      minlength: [2, "renetr name must be at least 2 characters"],
      maxlength: [50, "renetr name cannot exceed 50 characters"],
    },

    renterPhone: {
      type: String,
      default: null,
      trim: true,
      minlength: [10, "renter phone must be 10 digits"],
  maxlength: [10, "renter phone cannot exceed 10 digits"],
    },

    // =========================
    // MEMBER DETAILS
    // =========================
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "fullName name must be at least 2 characters"],
      maxlength: [50, "fullName name cannot exceed 50 characters"],
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
    
      maxlength: [50, "email  cannot exceed 50 characters"],
    },

    password: {
      type: String,
      default: null,
      select: false,

    },

    // =========================
    // OTP
    // =========================
    otp: {
      type: String,
      default: null,
    },

    otpExpireAt: {
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
    partialFilterExpression: { role: "primary" }, // sirf primary pe enforce
  }
);
// export default mongoose.model("Member", memberSchema);
export default mongoose.models.Member || mongoose.model("Member", memberSchema);
