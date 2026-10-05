import Visitor from "../../model/Visitor.js";
import Notice from "../../model/notice.js";

// ══════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LIST_LIMIT = 5;

// Entry ho chuki (guard ne allow kiya)
const ENTERED_STATUSES = ["Approved", "ForcedEntry", "Exited"];

// Abhi andar ho sakte hain (exit nahi hua)
const INSIDE_STATUSES = ["Approved", "ForcedEntry"];

// Member ne pre-approve kiya, visitor abhi aaya nahi
const PRE_APPROVED_STATUS = "Pending";

// Walk-in = guard ne banayi entry.
// Member ki pre-approved guest entry (visitDate set / OTP) isme NAHI aati,
// isliye wo Visitors aur Inside Now count me add nahi hoti.
const WALK_IN_FILTER = {
  visitDate: null, // null ya missing dono match
  verificationMethod: { $ne: "OTP" },
};

// ══════════════════════════════════════════════════════════
// DATE UTILS (IST)
// ══════════════════════════════════════════════════════════
const todayIST = () =>
  new Date(Date.now() + IST_OFFSET_MS).toISOString().split("T")[0];

// "YYYY-MM-DD" format + real calendar date (2026-02-31 reject)
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

// ══════════════════════════════════════════════════════════
// CONTROLLER
//
//  Date-wise (selected date):  visitorCount, recentVisitors
//  Live (date se independent): currentlyInsideCount, preApprovedCount, preApproved
// ══════════════════════════════════════════════════════════
const getGuardDashboard = async (req, res) => {
  try {
    const { buildingCode, date } = req.query;

    // string check: ?buildingCode[$ne]=x jaise NoSQL injection se bachav
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

    const code = buildingCode.trim();
    const dateStr = date || todayIST();
    const dayRange = getDayRange(dateStr);

    // Live: jab tak entry app me pending hai, date ka matlab nahi
    const preApprovedFilter = {
      buildingCode: code,
      visitDate: { $ne: null }, // member ne banayi pre-approved entry
      status: PRE_APPROVED_STATUS,
      otpVerifiedAt: null, // field missing bhi match hota hai
    };

    const [
      visitorCount,
      preApprovedCount,
      preApprovedList,
      recentVisitors,
      currentlyInsideCount,
      notices,
    ] = await Promise.all([
      // Date-wise: us din bani walk-in requests (pre-approved nahi)
      Visitor.countDocuments({
        buildingCode: code,
        ...WALK_IN_FILTER,
        createdAt: dayRange,
      }),

      // Live: real count (list sirf LIST_LIMIT hoti hai, count nahi)
      Visitor.countDocuments(preApprovedFilter),

      Visitor.find(preApprovedFilter)
        .populate("respondedBy", "fullName name")
        .sort({ createdAt: -1 })
        .limit(LIST_LIMIT)
        .lean(),

      // Date-wise
      Visitor.find({
        buildingCode: code,
        ...WALK_IN_FILTER,
        status: { $in: ENTERED_STATUSES },
        createdAt: dayRange,
      })
        .sort({ createdAt: -1 })
        .limit(LIST_LIMIT)
        .lean(),

      // Live: abhi andar kitne hain (date se independent, pre-approved nahi)
      Visitor.countDocuments({
        buildingCode: code,
        ...WALK_IN_FILTER,
        status: { $in: INSIDE_STATUSES },
        exitTime: null, // field missing bhi match hota hai
      }),

      Notice.find({ buildingCode: code })
        .sort({ createdAt: -1 })
        .limit(LIST_LIMIT)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          visitorCount,
          currentlyInsideCount,
          preApprovedCount,
        },
        preApproved: preApprovedList,
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
