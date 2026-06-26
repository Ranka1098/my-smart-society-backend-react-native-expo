// ─────────────────────────────────────────────────────────────────
// GET /api/visitor/log?buildingCode=X&date=YYYY-MM-DD&status=Y
// Admin / guard — fetch visitor log with filters
// ─────────────────────────────────────────────────────────────────
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
      .populate("memberId", "name phone")
      .populate("guardId", "name");

    return res
      .status(200)
      .json({ success: true, count: visitors.length, data: visitors });
  } catch (error) {
    console.error("getVisitorLog error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};