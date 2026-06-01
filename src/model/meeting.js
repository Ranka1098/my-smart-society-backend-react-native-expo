import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    buildingCode: {
      type: String,
      required: [true, "Building code is required"],
      trim: true,
      minlength: [2, "Building code must be at least 2 characters"],
      maxlength: [20, "Building code cannot exceed 20 characters"],
    },

    title: {
      type: String,
      required: [true, "Meeting title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    discussion: {
      type: String,
      required: [true, "Discussion is required"],
      trim: true,
      minlength: [3, "Discussion must be at least 3 characters"],
      maxlength: [1000, "Discussion cannot exceed 1000 characters"],
    },

    attendance: [
      {
        member: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Member",
          required: [true, "Member reference is required"],
        },
        present: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  { timestamps: true }
);

// Index for faster queries by building and meeting date
meetingSchema.index({ buildingCode: 1, meetingDate: 1 });

const meetingModel = mongoose.model("Meeting", meetingSchema);
export default meetingModel;
