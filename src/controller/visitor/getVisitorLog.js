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
      const start = new Date(`${date}T00:00:00.000+05:30`);
      const end = new Date(`${date}T23:59:59.999+05:30`);
      filter.createdAt = { $gte: start, $lte: end }; // entryTime -> createdAt
    }

    const visitors = await Visitor.find(filter)
      .sort({ createdAt: -1 }) // entryTime -> createdAt
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
