import Visitor from "../../model/Visitor.js";
import Notice from "../../model/notice.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LIST_LIMIT = 5;

const ENTERED_STATUSES = ["Approved", "ForcedEntry", "Exited"];
const INSIDE_STATUSES = ["Approved", "ForcedEntry"];

const WALK_IN_FILTER = {
  visitDate: null,
  verificationMethod: { $ne: "OTP" },
};

const todayIST = () =>
  new Date(Date.now() + IST_OFFSET_MS).toISOString().split("T")[0];

const isValidDateStr = (s) => {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000+05:30`);
  if (Number.isNaN(d.getTime())) return false;
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().startsWith(s);
};

const getDayRange = (dateStr) => ({
  $gte: new Date(`${dateStr}T00:00:00.000+05:30`),
  $lte: new Date(`${dateStr}T23:59:59.999+05:30`),
});

const getGuardDashboard = async (req, res) => {
  const guardId = req.staff._id;
  try {
    const { buildingCode, date } = req.query;
    if (!req.staff?._id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (typeof buildingCode !== "string" || !buildingCode.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode required" });
    }
    if (date !== undefined && date !== "" && !isValidDateStr(date)) {
      return res
        .status(400)
        .json({ success: false, message: "date must be YYYY-MM-DD" });
    }

    const code = req.staff.buildingCode || buildingCode.trim();
    const today = todayIST();
    const dateStr = date || today;
    const isToday = dateStr === today;
    const dayRange = getDayRange(dateStr);

    // Live: member ne respond kiya, entry abhi nahi hui (sab guards)
    const preApprovedFilter = {
      buildingCode: code,
      status: "Pending",
      respondedBy: { $ne: null },
    };

    // Us din ki walk-in requests (sab guards)
  const visitorsOnDay = {
  buildingCode: code,
  guardId, // sirf apni entries
  ...WALK_IN_FILTER,
  createdAt: dayRange,
};

    // Us din entry ho chuki (sab guards)
  const enteredOnDay = {
  buildingCode: code,
  guardId,
  status: { $in: ENTERED_STATUSES },
  entryTime: dayRange,
};

    const insideNowFilter = {
      buildingCode: code,
      status: { $in: INSIDE_STATUSES },
      exitTime: null,
    };

    const [
      visitorCount,
      currentlyInsideCount,
      preApprovedCount,
      preApproved,
      recentVisitors,
      notices,
    ] = await Promise.all([
      Visitor.countDocuments(visitorsOnDay),
      isToday ? Visitor.countDocuments(insideNowFilter) : 0,
      Visitor.countDocuments(preApprovedFilter),
      Visitor.find(preApprovedFilter)
        .sort({ createdAt: -1 })
        .limit(LIST_LIMIT)
        .lean(),
      Visitor.find(enteredOnDay)
        .sort({ entryTime: -1 })
        .limit(LIST_LIMIT)
        .lean(),
      Notice.find({ buildingCode: code })
        .sort({ createdAt: -1 })
        .limit(LIST_LIMIT)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        stats: { visitorCount, currentlyInsideCount, preApprovedCount },
        preApproved,
        recentVisitors,
        notices,
      },
    });
  } catch (error) {
    console.error("getGuardDashboard error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getGuardDashboard;
