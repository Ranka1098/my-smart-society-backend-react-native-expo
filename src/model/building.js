// =========================
// Code Name: buildingModel.js
// =========================

import mongoose from "mongoose";

const buildingSchema = new mongoose.Schema(
  {
    buildingName: {
      type: String,
      required: true,
      trim: true,
    },

    buildingCode: {
      type: String,
      required: true,
      unique: true,
    },

    chairmanName: {
      type: String,
      required: true,
    },

    chairmanPhone: {
      type: String,
      required: true,
    },

    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    totalFlats: {
      type: Number,
      default: 0,
    },

    totalShops: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const buildingModel = mongoose.model("Building", buildingSchema);

export default buildingModel;