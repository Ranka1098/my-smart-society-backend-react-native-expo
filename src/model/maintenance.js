import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema(
  {
    buildingCode: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
      minlength: [2, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
      index: true,
    },

    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member ID is required"],
      index: true,
    },

    month: {
      type: String,
      required: [true, "Month is required"],
      trim: true,
      minlength: [3, "Month must be at least 3 characters"],
      maxlength: [20, "Month cannot exceed 20 characters"],
      index: true,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    status: {
      type: String,
      enum: {
        values: ["Pending", "Paid"],
        message: "Status must be either Pending or Paid",
      },
      default: "Pending",
    },

    paidDate: {
      type: Date,
      default: null,
      validate: {
        validator: function (v) {
          // paidDate cannot be before creation date
          return !v || v >= this.createdAt;
        },
        message: "Paid date cannot be before creation date",
      },
    },

    paymentMode: {
      type: String,
      trim: true,
      maxlength: [50, "Payment mode cannot exceed 50 characters"],
      default: null,
    },
    memberName: {
      type: String,
      required: true,
    },

    memberType: {
      type: String, // Flat / Shop
      required: true,
    },

    No: {
      type: String, // Flat No / Shop No
      required: true,
    },
  },
  { timestamps: true }
);

// Ensure unique maintenance entry per building-member-month
maintenanceSchema.index(
  { buildingCode: 1, memberId: 1, month: 1 },
  { unique: true }
);

export default mongoose.model("Maintenance", maintenanceSchema);
