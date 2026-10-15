import Visitor from "../../model/Visitor.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const todayRange = () => {
  const d = new Date(Date.now() + IST_OFFSET_MS).toISOString().split("T")[0];
  return {
    $gte: new Date(`${d}T00:00:00.000+05:30`),
    $lte: new Date(`${d}T23:59:59.999+05:30`),
  };
};

const count = (cond) => ({ $sum: { $cond: [cond, 1, 0] } });

const getVisitorEntryStats = async (req, res) => {
  try {
    const buildingCode = req.staff?.buildingCode ?? req.buildingCode;
    if (!buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const now = new Date();
    const [row] = await Visitor.aggregate([
      {
        $match: {
          buildingCode,
          notificationSentAt: { $ne: null }, // sirf guard ki walk-in requests
          createdAt: todayRange(),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: count({
            $and: [
              { $eq: ["$verificationMethod", "FCM"] },
              { $ne: ["$awaitingGuardConfirm", true] },
            ],
          }),
          denied: count({
            $and: [
              { $in: ["$status", ["Denied", "Rejected"]] },
              { $ne: [{ $type: "$respondedBy" }, "missing"] },
            ],
          }),
          noResponse: count({
            $or: [
              { $eq: ["$verificationMethod", "NoResponse"] },
              {
                $and: [
                  { $eq: ["$status", "Pending"] },
                  { $lt: ["$notificationExpiresAt", now] },
                ],
              },
            ],
          }),
          callAllowed: count({ $eq: ["$verificationMethod", "ManualCall"] }),
          forced: count({ $eq: ["$verificationMethod", "ForcedEntry"] }),
          cancelled: count({
            $and: [
              { $eq: ["$status", "Rejected"] },
              { $ne: ["$verificationMethod", "NoResponse"] },
              { $eq: [{ $type: "$respondedBy" }, "missing"] },
            ],
          }),
        },
      },
    ]);

    const { _id, ...stats } = row || {};
    return res.json({
      success: true,
      stats: {
        total: 0,
        approved: 0,
        denied: 0,
        noResponse: 0,
        callAllowed: 0,
        forced: 0,
        cancelled: 0,
        ...stats,
      },
    });
  } catch (error) {
    console.error("getVisitorEntryStats error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getVisitorEntryStats;
