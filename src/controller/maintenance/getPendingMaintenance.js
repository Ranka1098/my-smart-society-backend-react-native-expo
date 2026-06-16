import memberModel from "../../model/member.js";
import maintenanceModel from "../../model/maintenance.js";

const getPendingMaintenance = async (req, res) => {
  try {
    const { no, memberType } = req.query;
    const buildingCode = req.admin.buildingCode;

    if (!no || !memberType)
      return res.status(400).json({ message: "no and memberType required" });

    const member = await memberModel.findOne({
      buildingCode,
      unitNo: no.trim(),
      memberType,
      role: "primary",
    });

    if (!member) return res.status(404).json({ message: "Member not found" });

    const pendingBills = await maintenanceModel
      .find({ memberId: member._id, buildingCode, status: "Pending" })
      .sort({ month: 1 })
      .select("_id month amount");

    const memberName =
      member.memberStatus === "Rent"
        ? member.renterName || member.ownerName || "—"
        : member.ownerName || "—";

    return res.json({
      success: true,
      memberName,
      pendingBills,
      totalPending: pendingBills.length,
    });
  } catch (err) {
    console.error("getPendingMaintenance:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

export default getPendingMaintenance;
