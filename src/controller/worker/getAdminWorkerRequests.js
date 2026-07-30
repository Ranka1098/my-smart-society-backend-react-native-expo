import WorkerProfile from "../../model/WorkerProfile.js";
const getAdminWorkerRequests = async (req, res) => {
  try {
    const buildingCode = req.admin.buildingCode;
    const { status } = req.query; // optional filter: PendingApproval | Approved | Rejected

    const filter = { buildingCode, workerType: "SocietyStaff" };
    if (status) filter.status = status;
    else filter.status = "PendingApproval"; // default sirf pending

    const workers = await WorkerProfile.find(filter).sort({ createdAt: -1 });

    return res
      .status(200)
      .json({ success: true, count: workers.length, workers });
  } catch (err) {
    console.error("getAdminWorkerRequests error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getAdminWorkerRequests;
