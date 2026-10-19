import Visitor from "../../model/Visitor.js";

const LIMIT = 20;

const getMemberVisitorHistory = async (req, res) => {
  try {
    const { buildingCode, flatNo, memberType, status } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    if (!buildingCode || !flatNo) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode aur flatNo required" });
    }

    const filter = {
      buildingCode,
      flatNo,
      // Flat = Flat + missing + null (purane records)
      memberType: memberType === "Shop" ? "Shop" : { $ne: "Shop" },
      ...(status && status !== "All" ? { status } : {}),
    };

    const [list, total] = await Promise.all([
      Visitor.find(filter)
        .sort({ entryTime: -1, createdAt: -1 })
        .skip((page - 1) * LIMIT)
        .limit(LIMIT)
        .select(
          "name mobile purpose subType vehicleNo vehicleType status photoUrl exitPhotoUrl entryTime exitTime createdAt approvedAt rejectedAt rejectionReason forcedEntryReason verificationMethod isEmergencyExit guardId respondedBy",
        )
        .populate("guardId", "name")
        .populate("respondedBy", "fullName")
        .lean(),
      Visitor.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      hasMore: page * LIMIT < total,
      data: list,
    });
  } catch (e) {
    console.error("getMemberVisitorHistory error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getMemberVisitorHistory;
