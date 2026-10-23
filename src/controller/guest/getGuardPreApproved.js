import Visitor from "../../model/Visitor.js";

const getGuardPreApproved = async (req, res) => {
  try {
    const buildingCode = req.staff?.buildingCode ?? req.buildingCode;
    if (!buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const list = await Visitor.find({
      buildingCode,
      status: "Pending",
      respondedBy: { $ne: null },
    })
      .populate("respondedBy", "fullName")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: list });
  } catch (e) {
    console.error("getGuardPreApproved error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getGuardPreApproved;
