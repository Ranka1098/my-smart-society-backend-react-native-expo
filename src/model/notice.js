import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notice title is required"],
      trim: true,
      minlength: [1, "Title must be at least 2 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [1, "Description must be at least 2 characters"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    buildingCode: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
      minlength: [2, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
    },

    role: {
      type: String,
      enum: {
        values: ["Admin"],
        message: "Role must be 'Admin'",
      },
      default: "Admin",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Optional: Index for faster queries by buildingCode and active notices
noticeSchema.index({ buildingCode: 1, isActive: 1 });

// export default mongoose.model("Notice", noticeSchema);
// ✅ sahi — pehle se compiled ho to wahi use karo
export default mongoose.models.Notice || mongoose.model("Notice", noticeSchema);
