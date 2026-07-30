
// ── MEMBER — FlatStaff approve ──
import WorkerProfile from "../../model/WorkerProfile.js";
 const approveWorkerByMember = async (req, res) => {
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
      return res.status(404).json({ success: false, message: "Worker request nahi mila" });
    }
    if (worker.status !== "PendingApproval") {
      return res.status(400).json({ success: false, message: `Ye request already ${worker.status} hai` });
    }

    worker.status = "Approved";
    worker.approvedBy = req.member._id;
    worker.approverModel = "Member";
    worker.approvedAt = new Date();
    await worker.save();

    try {
      const io = req.app.get("io");
      io.to(`guard_${buildingCode}`).emit("worker_status_updated", { workerId: worker._id, status: "Approved" });
    } catch (e) {
      console.error("notify error (non-fatal):", e.message);
    }

    return res.status(200).json({ success: true, worker });
  } catch (err) {
    console.error("approveWorkerByMember error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};
export default approveWorkerByMember