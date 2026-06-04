import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    buildingCode: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
      minlength: [2, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
    },

    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member reference is required"],
    },

    unitType: {
      type: String,
      enum: {
        values: ["Flat", "Shop"],
        message: "Unit type must be either 'Flat' or 'Shop'",
      },
      required: [true, "Unit type is required"],
    },

    unitNo: {
      type: String,
      required: [true, "Unit number is required"],
      trim: true,
      minlength: [1, "Unit number must be at least 1 character"],
      maxlength: [10, "Unit number cannot exceed 10 characters"],
    },

    memberName: {
      type: String,
      required: [true, "Member name is required"],
      trim: true,
      minlength: [2, "Member name must be at least 2 characters"],
      maxlength: [50, "Member name cannot exceed 50 characters"],
      validate: {
        validator: (v) => /^[A-Za-z\s]+$/.test(v),
        message: "Member name must contain only letters and spaces",
      },
    },

    category: {
      type: String,
      enum: {
        values: [
          "Water",
          "Electricity",
          "Lift",
          "Cleaning",
          "Security",
          "Repair",
          "Event",
          "Other",
        ],
        message:
          "Category must be one of Water, Electricity, Lift, Cleaning, Security, Other",
      },
      required: [true, "Complaint category is required"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [5, "Description must be at least 5 characters"],
      maxlength: [50, "Description cannot exceed 50 characters"],
    },

    status: {
      type: String,
      enum: {
        values: ["PENDING", "IN_PROGRESS", "RESOLVED"],
        message: "Status must be PENDING, IN_PROGRESS, or RESOLVED",
      },
      default: "PENDING",
    },

    resolvedAt: {
      type: Date,
      default: null,
      validate: {
        validator: function (v) {
          return !v || v >= this.createdAt;
        },
        message: "Resolved date cannot be before complaint creation date",
      },
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries by building and status
complaintSchema.index({ buildingCode: 1, status: 1 });

const complaintModel = mongoose.model("Complaint", complaintSchema);
export default complaintModel;
