import mongoose from "mongoose";
const { Schema, Types: { ObjectId } } = mongoose;

const workerProfileSchema = new Schema(
  {
    buildingCode: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    workerType: { type: String, enum: ["SocietyStaff", "FlatStaff"], required: true },
    category: { type: String, enum: ["Maid", "Cook", "Driver", "Cleaner", "Gardener", "Security", "Other"], required: true },
    flatNo: { type: String, trim: true }, // sirf FlatStaff ke liye
    photoUrl: { type: String },
    status: { type: String, enum: ["PendingApproval", "Approved", "Rejected"], default: "PendingApproval" },
    approvedBy: { type: ObjectId, refPath: "approverModel" },
    approverModel: { type: String, enum: ["Admin", "Member"] },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

workerProfileSchema.index({ buildingCode: 1, mobile: 1 }, { unique: true }); // duplicate rokta
workerProfileSchema.index({ buildingCode: 1, status: 1 });
workerProfileSchema.index({ buildingCode: 1, flatNo: 1 });

export default mongoose.models.WorkerProfile || mongoose.model("WorkerProfile", workerProfileSchema);