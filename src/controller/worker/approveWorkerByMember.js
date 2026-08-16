import WorkerProfile from "../../model/WorkerProfile.js";
import { notifyAdminToStaff } from "../notifcation/notifyMembers.js";

const approveWorkerByMember = async (req, res) => {
  try {
    const { workerId } = req.params;
    const buildingCode = req.buildingCode;
    const flatNo = String(req.member.unitNo || "").trim();
    const memberType = req.member.memberType; // ✅ NAYA

    const worker = await WorkerProfile.findOne({
      _id: workerId,
      buildingCode,
      workerType: "FlatStaff",
      flatNo,
      ...(memberType ? { memberType } : {}), // ✅ NAYA — sirf apne type ka worker approve kar sake
    });
    if (!worker) {
      return res
        .status(404)
        .json({ success: false, message: "Worker request nahi mila" });
    }
    if (worker.status !== "PendingApproval") {
      return res.status(400).json({
        success: false,
        message: `Ye request already ${worker.status} hai`,
      });
    }

    worker.status = "Approved";
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
        type: "WORKER_APPROVED",
        title: "Worker Approved",
        message: `${worker.name} (${worker.category}) approve ho gaya hai`,
        referenceId: worker._id,
        referenceModel: "WorkerProfile",
        data: { workerId: worker._id.toString(), status: "Approved" },
      });
      io.to(`guard_${buildingCode}`).emit("worker_status_updated", {
        workerId: worker._id,
        status: "Approved",
      });
    } catch (e) {
      console.error("notify error (non-fatal):", e.message);
    }

    return res.status(200).json({ success: true, worker });
  } catch (err) {
    console.error("approveWorkerByMember error:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};
export default approveWorkerByMember;
