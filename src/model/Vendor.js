import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    buildingCode: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
      minlength: [2, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
      index: true,
    },

    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      minlength: [2, "Company name must be at least 2 characters"],
      maxlength: [100, "Company name cannot exceed 100 characters"],
    },

    service: {
      type: String,
      required: [true, "Service description is required"],
      trim: true,
      minlength: [2, "Service must be at least 2 characters"],
      maxlength: [100, "Service cannot exceed 100 characters"],
    },

    rate: {
      type: Number,
      required: [true, "Rate is required"],
      min: [0, "Rate cannot be negative"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);



export default mongoose.model("Vendor", vendorSchema);
