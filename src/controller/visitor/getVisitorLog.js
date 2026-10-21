import Visitor from "../../model/Visitor.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LIMIT = 100;

const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

const getVisitorLog = async (req, res) => {
  try {
    const buildingCode = req.staff?.buildingCode ?? req.buildingCode;
    const guardId = req.staff?._id;
    if (!buildingCode || !guardId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { date, status, flatNo, memberType, confirmed } = req.query;
    const filter = { buildingCode };

    // CurrentlyInside (confirmed=true): sab guards ki entries.
    // VisitorHistory: sirf apni entries.
    if (confirmed === "true") {
      filter.awaitingGuardConfirm = { $ne: true };
    } else {
      filter.guardId = guardId;
    }

    const s = str(status);
    const f = str(flatNo);
    const m = str(memberType);
    if (s) filter.status = s;
    if (f) filter.flatNo = f;
    if (m) filter.memberType = m;

    const d = str(date);
    if (d) {
      const start = new Date(`${d}T00:00:00.000+05:30`);
      const end = new Date(`${d}T23:59:59.999+05:30`);
      if (!DATE_RE.test(d) || isNaN(start) || isNaN(end)) {
        return res
          .status(400)
          .json({ success: false, message: "date YYYY-MM-DD format me do" });
      }
      filter.createdAt = { $gte: start, $lte: end };
    }

    const visitors = await Visitor.find(filter)
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .populate("notifiedMembers", "fullName primaryPhone")
      .populate("respondedBy", "fullName")
      .populate("guardId", "workerName")
      .lean();

    return res
      .status(200)
      .json({ success: true, count: visitors.length, data: visitors });
  } catch (error) {
    console.error("getVisitorLog error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getVisitorLog;
