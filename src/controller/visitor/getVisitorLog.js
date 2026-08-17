import Visitor from "../../model/Visitor.js";
const getVisitorLog = async (req, res) => {
  try {
    const { buildingCode, date, status, flatNo } = req.query;
    if (!buildingCode) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode required" });
    }

    const filter = { buildingCode };
    if (status) filter.status = status;
    if (flatNo) filter.flatNo = flatNo;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.entryTime = { $gte: start, $lt: end };
    }

    const visitors = await Visitor.find(filter)
      .sort({ entryTime: -1 })
      .limit(100)
      .populate("notifiedMembers", "fullName primaryPhone") // ✅ FIX — sahi field names
      .populate("respondedBy", "fullName") // ✅ FIX — ye hi missing tha, isliye approve karne wale ka naam nahi aa raha tha
      .populate("guardId", "name"); // ✅ NAYA — guard ka naam bhi chahiye ho to (Staff schema me workerName field hai, check kar lena)

    return res
      .status(200)
      .json({ success: true, count: visitors.length, data: visitors });
  } catch (error) {
    console.error("getVisitorLog error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default getVisitorLog;
