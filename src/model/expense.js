import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    billType: {
      type: String,
      required: [true, "Bill type is required"],
      trim: true,
      minlength: [2, "Bill type must be at least 2 characters"],
      maxlength: [50, "Bill type cannot exceed 50 characters"],
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [400, "Description cannot exceed 400 characters"], // ✅ ~50 words safety net (char-level; word check bhi controller me)
    },

    // ✅ ab required nahi — form se hata diya gaya, "N/A" default se aata hai
    paidTo: {
      type: String,
      trim: true,
      default: "N/A",
      maxlength: [100, "Paid to cannot exceed 100 characters"],
    },

    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      trim: true,
      enum: {
        values: ["Cash", "Bank Transfer", "UPI", "Online", "Cheque", "Other"],
        message:
          "Payment method must be Cash, Bank Transfer, UPI, Cheque, or Other",
      },
    },

    billProof: {
      type: String,
      required: [true, "Bill proof is required"],
      trim: true,
      maxlength: [500, "Bill proof URL cannot exceed 500 characters"],
    },

    buildingCode: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
      minlength: [2, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);
