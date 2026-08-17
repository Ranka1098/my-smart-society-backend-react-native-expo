import Visitor from "../../model/Visitor.js";

const getMemberVisitorHistory = async (req, res) => {
  try {
    const { buildingCode, flatNo, memberType } = req.query;

    if (!buildingCode || !flatNo) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode aur flatNo required" });
    }

    const list = await Visitor.find({
      buildingCode,
      flatNo,
      ...(memberType === "Shop"
        ? { memberType: "Shop" }
        : {
            $or: [
              { memberType: "Flat" },
              { memberType: { $exists: false } },
              { memberType: null },
            ],
          }), // ✅ FIX — purane records (missing memberType) bhi match ho, sab purpose/type ke liye
    })
      .sort({ entryTime: -1, createdAt: -1 })
      .limit(100)
      .populate("guardId", "name")
      .populate("respondedBy", "fullName");

    return res
      .status(200)
      .json({ success: true, count: list.length, data: list });
  } catch (e) {
    console.error("getMemberVisitorHistory error:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getMemberVisitorHistory;
