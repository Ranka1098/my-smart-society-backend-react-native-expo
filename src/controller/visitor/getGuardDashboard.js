import Visitor from "../../model/Visitor.js";
import Notice from "../../model/notice.js"; // apna actual notice model

const getGuardDashboard = async (req, res) => {
  try {
    const { buildingCode } = req.query;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      visitorCount,
      preApprovedList,
      recentVisitors,
      currentlyInsideCount,
      notices,
    ] = await Promise.all([
      Visitor.countDocuments({
        buildingCode,
        createdAt: { $gte: startOfDay },
      }),
      Visitor.find({
        buildingCode,
        status: "Pending",
        respondedBy: { $ne: null },
      })
        .populate("respondedBy", "name")
        .sort({ createdAt: -1 })
        .limit(5),
      Visitor.find({
        buildingCode,
        status: { $in: ["Approved", "ForcedEntry"] },
      })
        .sort({ entryTime: -1 })
        .limit(5),
      Visitor.countDocuments({
        buildingCode,
        status: { $in: ["Approved", "ForcedEntry"] },
        exitTime: null, // ✅ jo abhi tak exit nahi hue
      }),
      Notice.find({ buildingCode }).sort({ createdAt: -1 }).limit(5),
    ]);

    res.json({
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
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getGuardDashboard;
