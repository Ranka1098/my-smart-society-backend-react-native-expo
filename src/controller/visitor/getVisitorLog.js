import Visitor from "../../model/Visitor.js";
const getVisitorLog = async (req, res) => {
  try {
    const { buildingCode, date, status, flatNo, memberType } = req.query; // ✅ ADD memberType
    if (!buildingCode) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode required" });
    }

    const filter = { buildingCode };
    if (status) filter.status = status;
    if (flatNo) filter.flatNo = flatNo;
    if (memberType) filter.memberType = memberType; // ✅ NAYA
    if (date) {
      // ✅ FIX — IST calendar-day boundary explicit banao, UTC drift se bacho
      const start = new Date(`${date}T00:00:00.000+05:30`);
      const end = new Date(`${date}T23:59:59.999+05:30`);
      filter.entryTime = { $gte: start, $lte: end };
    }

    const visitors = await Visitor.find(filter)
      .sort({ entryTime: -1 })
      .limit(100)
      .populate("notifiedMembers", "fullName primaryPhone")
      .populate("respondedBy", "fullName")
      .populate("guardId", "name");

    return res
      .status(200)
      .json({ success: true, count: visitors.length, data: visitors });
  } catch (error) {
    console.error("getVisitorLog error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default getVisitorLog;
