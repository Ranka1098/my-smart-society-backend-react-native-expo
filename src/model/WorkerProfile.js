import mongoose from "mongoose";
const {
  Schema,
  Types: { ObjectId },
} = mongoose;

const workerProfileSchema = new Schema(
  {
    buildingCode: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    workerType: {
      type: String,
      enum: ["SocietyStaff", "FlatStaff"],
      required: true,
    },
    category: {
      type: String,
      enum: ["Maid", "Cook", "Driver", "Cleaner", "Gardener", "Security"],
      required: true,
    },
    flatNo: { type: String, trim: true },
    memberType: { type: String, enum: ["Flat", "Shop"], trim: true },
    photoUrl: { type: String },
    idPhotoUrl: { type: String }, // worker ID proof (Aadhaar/Voter/DL)

    // ── kis guard ne, kis gate se request bheji ──
    requestedBy: { type: ObjectId, ref: "Staff" }, // staff.js ke mongoose.model("...") naam se match karo
    requestedByName: { type: String, trim: true }, // snapshot, populate na karna pade
    requestedGate: { type: String, trim: true },

    status: {
      type: String,
      enum: ["PendingApproval", "Approved", "Rejected"],
      default: "PendingApproval",
    },
    approvedBy: { type: ObjectId, refPath: "approverModel" },
    approverModel: { type: String, enum: ["Admin", "Member"] },
    approvedAt: { type: Date },
  },
  { timestamps: true },
);

workerProfileSchema.index({ buildingCode: 1, mobile: 1 }, { unique: true });
workerProfileSchema.index({ buildingCode: 1, status: 1 });
workerProfileSchema.index({ buildingCode: 1, flatNo: 1 });
workerProfileSchema.index({ buildingCode: 1, requestedBy: 1 });

export default mongoose.models.WorkerProfile ||
  mongoose.model("WorkerProfile", workerProfileSchema);
