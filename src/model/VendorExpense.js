import mongoose from "mongoose";

const vendorExpenseSchema = new mongoose.Schema(
  {
    buildingCode: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
      minlength: [1, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Creator ID is required"],
      refPath: "createdByModel", // ✅ dynamic — Admin ya Staff dono resolve hote
    },
    createdByModel: {
      type: String,
      required: true,
      enum: ["Admin", "Staff"], // ✅ exact model-name match zaroori — confirm karo
      default: "Admin",
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor ID is required"],
    },

    vendorName: {
      type: String,
      required: [true, "Vendor name snapshot is required"],
      trim: true,
      minlength: [2, "Vendor name must be at least 2 characters"],
      maxlength: [100, "Vendor name cannot exceed 100 characters"],
    },

    service: {
      type: String,
      required: [true, "Service snapshot is required"],
      trim: true,
      minlength: [2, "Service must be at least 2 characters"],
      maxlength: [100, "Service cannot exceed 100 characters"],
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: null,
    },
    photoUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("VendorExpense", vendorExpenseSchema);
