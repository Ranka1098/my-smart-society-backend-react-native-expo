import WorkerProfile from "../../model/WorkerProfile.js";
import Visitor from "../../model/Visitor.js";
const quickWorkerEntry = async (req, res) => {
  try {
    const { workerId } = req.body;
    const buildingCode = req.buildingCode;
    const guardId = req.staff._id;

    if (!workerId) {
      return res
        .status(400)
        .json({ success: false, message: "workerId required" });
    }

    const worker = await WorkerProfile.findOne({
      _id: workerId,
      buildingCode,
      status: "Approved",
    });
    if (!worker) {
      return res
        .status(404)
        .json({ success: false, message: "Approved worker nahi mila" });
    }

    const visitor = await Visitor.create({
      buildingCode,
      name: worker.name,
      mobile: worker.mobile,
      purpose: worker.category,
      photoUrl: worker.photoUrl,
      flatNo: worker.workerType === "FlatStaff" ? worker.flatNo : "Society",
      guardId,
      status: "Approved",
      verificationMethod: "PreApprovedWorker",
      approvedAt: new Date(),
      entryTime: new Date(),
    });

    // ── same response me updated "currently inside" list bhi bhej do ──
    const insideList = await Visitor.find({
      buildingCode,
      status: "Approved",
      exitTime: null,
    })
      .sort({ entryTime: -1 })
      .limit(100);

    return res.status(201).json({ success: true, data: visitor, insideList });
  } catch (err) {
    console.error("quickWorkerEntry error:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export default quickWorkerEntry;
