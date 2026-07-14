import Visitor from "../../model/Visitor.js";

// Member apne flat ke saare visitor dekh sake — jo bhi guard ne entry ki
const getMemberVisitorHistory = async (req, res) => {
  try {
    const { buildingCode, flatNo } = req.query;

    if (!buildingCode || !flatNo) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode aur flatNo required" });
    }

    const list = await Visitor.find({ buildingCode, flatNo })
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
