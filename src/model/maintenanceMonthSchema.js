import mongoose from "mongoose";

const maintenanceMonthSchema = new mongoose.Schema(
  {
    buildingCode: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
      minlength: [2, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
      index: true,
    },

    month: {
      type: String,
      required: [true, "Month is required"],
      trim: true,
      minlength: [3, "Month must be at least 3 characters"],
      maxlength: [20, "Month cannot exceed 20 characters"],
    },

    totalFlatExpense: {
      type: Number,
      required: [true, "Total flat expense is required"],
      min: [0, "Total flat expense cannot be negative"],
    },

    totalShopExpense: {
      type: Number,
      required: [true, "Total shop expense is required"],
      min: [0, "Total shop expense cannot be negative"],
    },

    perFlat: {
      type: Number,
      min: [0, "Per flat amount cannot be negative"],
      default: null,
    },

    perShop: {
      type: Number,
      min: [0, "Per shop amount cannot be negative"],
      default: null,
    },

    totalFlats: {
      type: Number,
      min: [0, "Total flats cannot be negative"],
      default: null,
    },

    totalShops: {
      type: Number,
      min: [0, "Total shops cannot be negative"],
      default: null,
    },

    totalExpectedAmount: {
      type: Number,
      min: [0, "Total expected amount cannot be negative"],
      default: null,
    },
  },
  { timestamps: true }
);

// Ensure unique entry per building and month
maintenanceMonthSchema.index({ buildingCode: 1, month: 1 }, { unique: true });

export default mongoose.model("MaintenanceMonth", maintenanceMonthSchema);
