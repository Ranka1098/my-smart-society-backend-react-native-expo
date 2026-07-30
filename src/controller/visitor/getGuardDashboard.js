import Visitor from "../../model/Visitor.js";
import Notice from "../../model/notice.js"; // apna actual notice model

// ✅ aaj ki date IST calendar-day format me ("YYYY-MM-DD")
const todayIST = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // UTC + 5:30
  return ist.toISOString().split("T")[0];
};

const getGuardDashboard = async (req, res) => {
  try {
    const { buildingCode, date } = req.query;

    // ✅ "date" IST calendar-day hai (frontend se "YYYY-MM-DD" aata).
    // Naya Date(date) server timezone (UTC on Render) me midnight bana deta,
    // jo IST se 5:30 peeche shift ho jaata — isliye din ka data 1 din piche
    // dikhta tha. Explicit IST offset (+05:30) laga ke sahi UTC instant banao.
    const dateStr = date || todayIST();
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
        createdAt: { $gte: startOfDay, $lte: endOfDay }, // ✅ date-range filter
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
        createdAt: { $gte: startOfDay, $lte: endOfDay }, // ✅ date-range filter
      })
        .sort({ entryTime: -1 })
        .limit(5),
      // ✅ "currently inside" hamesha live state hai, purani date ke liye 0
      isToday
        ? Visitor.countDocuments({
            buildingCode,
            status: { $in: ["Approved", "ForcedEntry"] },
            exitTime: null,
          })
        : 0,
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
