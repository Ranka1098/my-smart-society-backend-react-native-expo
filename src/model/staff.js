import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    buildingCode: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
      minlength: [2, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
    },

    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
      minlength: [2, "Role must be at least 2 characters"],
      maxlength: [50, "Role cannot exceed 50 characters"],
    },

    workerName: {
      type: String,
      required: [true, "Worker name is required"],
      trim: true,
      minlength: [3, "Worker name must be at least 3 characters"],
      maxlength: [50, "Worker name cannot exceed 50 characters"],
      validate: {
        validator: (v) => /^[A-Za-z\s]+$/.test(v),
        message: "Worker name must contain only letters and spaces",
      },
    },

    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },

    workerPhoneNumber: {
      type: String,
      required: [true, "Worker phone number is required"],
      trim: true,
      match: [/^[0-9]{10}$/, "Worker phone number must be 10 digits"],
    },

    workerAddress: {
      type: String,
      required: [true, "Worker address is required"],
      trim: true,
      minlength: [5, "Address must be at least 5 characters"],
      maxlength: [200, "Address cannot exceed 200 characters"],
    },

    workerPhoto: {
      type: String,
      required: [true, "Worker photo URL is required"],
      trim: true,
      maxlength: [500, "Worker photo URL cannot exceed 500 characters"],
    },

    workerIdProof: {
      type: String,
      required: [true, "Worker ID proof URL is required"],
      trim: true,
      maxlength: [500, "Worker ID proof URL cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true, // createdAt, updatedAt automatically
  }
);

// Index for faster queries by buildingCode and role
staffSchema.index({ buildingCode: 1, role: 1 });

const StaffModel = mongoose.model("Staff", staffSchema);

export default StaffModel;
