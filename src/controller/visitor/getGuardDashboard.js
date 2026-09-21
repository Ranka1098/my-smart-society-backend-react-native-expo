import Visitor from "../../model/Visitor.js";
import Notice from "../../model/notice.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const todayIST = () => {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return ist.toISOString().split("T")[0];
};

const isValidDateStr = (s) => DATE_RE.test(s);

const getGuardDashboard = async (req, res) => {
  try {
    const { buildingCode, date } = req.query;

    if (!buildingCode) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode required" });
    }

    const dateStr = isValidDateStr(date) ? date : todayIST();
    const startOfDay = new Date(`${dateStr}T00:00:00.000+05:30`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);
    const isToday = dateStr === todayIST();

    const [
      visitorCount,
      preApprovedList,
      recentVisitors,
      currentlyInsideCount,
      notices,
    ] = await Promise.all([
      Visitor.countDocuments({
        buildingCode,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }),
      Visitor.find({
        buildingCode,
        status: "Pending",
        respondedBy: { $ne: null },
      })
        .populate("respondedBy", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Visitor.find({
        buildingCode,
        status: { $in: ["Approved", "ForcedEntry"] },
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      })
        .sort({ entryTime: -1 })
        .limit(5)
        .lean(),
      isToday
        ? Visitor.countDocuments({
            buildingCode,
            status: { $in: ["Approved", "ForcedEntry"] },
            entryTime: { $gte: startOfDay, $lte: endOfDay }, // fix: aaj ka entry hi count ho
            exitTime: null,
          })
        : 0,
      Notice.find({ buildingCode }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        stats: {
          visitorCount,
          currentlyInsideCount,
          preApprovedCount: preApprovedList.length,
        },
        preApproved: preApprovedList,
        recentVisitors,
        notices,
      },
    });
  } catch (e) {
    console.error("getGuardDashboard error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getGuardDashboard;
