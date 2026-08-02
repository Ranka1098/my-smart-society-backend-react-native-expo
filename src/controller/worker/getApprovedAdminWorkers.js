import WorkerProfile from "../../model/WorkerProfile.js";

// ── ADMIN — approved workers list (SocietyStaff + FlatStaff dono, sabse recent pehle) ──
const getApprovedAdminWorkers = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;

    const workers = await WorkerProfile.find({
      buildingCode,
      status: "Approved",
    }).sort({ approvedAt: -1 });

    return res.status(200).json({
      success: true,
      count: workers.length,
      data: workers,
    });
  } catch (err) {
    console.error("getApprovedAdminWorkers error:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export default getApprovedAdminWorkers;
