import WorkerProfile from "../../model/WorkerProfile.js";
import { notifyAdminToStaff } from "../notifcation/notifyMembers.js"; // ✅ NAYA import

const rejectWorkerByMember = async (req, res) => {
  try {
    const { workerId } = req.params;
    const buildingCode = req.buildingCode;
    const flatNo = String(req.member.unitNo || "").trim();

    const worker = await WorkerProfile.findOne({
      _id: workerId,
      buildingCode,
      workerType: "FlatStaff",
      flatNo,
    });
    if (!worker) {
      return res
        .status(404)
        .json({ success: false, message: "Worker request nahi mila" });
    }
    if (worker.status !== "PendingApproval") {
      return res
        .status(400)
        .json({
          success: false,
          message: `Ye request already ${worker.status} hai`,
        });
    }

    worker.status = "Rejected";
    worker.approvedBy = req.member._id;
    worker.approverModel = "Member";
    worker.approvedAt = new Date();
    await worker.save();

    try {
      const io = req.app.get("io");
      await notifyAdminToStaff({
        io,
        buildingCode,
        buildingId: worker.buildingId || null,
        type: "WORKER_REJECTED",
        title: "Worker Rejected",
        message: `${worker.name} (${worker.category}) ki request reject ho gayi hai`,
        referenceId: worker._id,
        referenceModel: "WorkerProfile",
        data: { workerId: worker._id.toString(), status: "Rejected" },
      });
      io.to(`guard_${buildingCode}`).emit("worker_status_updated", {
        workerId: worker._id,
        status: "Rejected",
      }); // ⛔ same rehne do
    } catch (e) {
      console.error("notify error (non-fatal):", e.message);
    }

    return res.status(200).json({ success: true, worker });
  } catch (err) {
    console.error("rejectWorkerByMember error:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};
export default rejectWorkerByMember;
