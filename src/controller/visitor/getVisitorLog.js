import Visitor from "../../model/Visitor.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LIMIT = 100;

const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

// "YYYY-MM-DD" (IST din) → { $gte, $lte } | null
const istDayRange = (d) => {
  if (!DATE_RE.test(d)) return null;
  const start = new Date(`${d}T00:00:00.000+05:30`);
  const end = new Date(`${d}T23:59:59.999+05:30`);
  if (isNaN(start) || isNaN(end)) return null;
  return { $gte: start, $lte: end };
};

// UI status → Mongo condition (DB status aur UI label alag hain)
//  - Exited      : status Exited (logExit/emergencyExit) ya exitTime set
//  - Approved    : abhi andar (exit nahi hua)
//  - Rejected    : guard ka Rejected + member ka Denied dono
//  - ForcedEntry : finalizeEntry status "Approved" rakhta hai, method "ForcedEntry" hota hai
const statusCondition = (s) => {
  switch (s) {
    case "Exited":
      return { $or: [{ status: "Exited" }, { exitTime: { $ne: null } }] };
    case "Approved":
      return { status: "Approved", exitTime: null };
    case "Rejected":
      return { status: { $in: ["Rejected", "Denied"] } };
    case "ForcedEntry":
      return {
        verificationMethod: "ForcedEntry",
        isEmergencyExit: { $ne: true },
      };
    default:
      return { status: s };
  }
};

const getVisitorLog = async (req, res) => {
  try {
    const buildingCode = req.staff?.buildingCode ?? req.buildingCode;
    const guardId = req.staff?._id;
    if (!buildingCode || !guardId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { date, status, flatNo, memberType, confirmed } = req.query;
    const and = [{ buildingCode }];

    // CurrentlyInside (confirmed=true): sab guards ki entries.
    // VisitorHistory: jis guard ne entry YA exit kiya, dono ko dikhe.
    if (confirmed === "true") {
      and.push({ awaitingGuardConfirm: { $ne: true } });
    } else {
      and.push({ $or: [{ guardId }, { exitGuardId: guardId }] });
    }

    const s = str(status);
    const f = str(flatNo);
    const m = str(memberType);

    if (s) and.push(statusCondition(s));
    if (f) and.push({ flatNo: f });
    if (m) and.push({ memberType: m });

    // Din ke andar create / entry / exit hua ho → record dikhe
    const d = str(date);
    if (d) {
      const range = istDayRange(d);
      if (!range) {
        return res
          .status(400)
          .json({ success: false, message: "date YYYY-MM-DD format me do" });
      }
      and.push({
        $or: [{ createdAt: range }, { entryTime: range }, { exitTime: range }],
      });
    }

    const visitors = await Visitor.find({ $and: and })
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .populate("notifiedMembers", "fullName primaryPhone")
      .populate("respondedBy", "fullName")
      .populate("guardId", "workerName")
      .populate("exitGuardId", "workerName") // schema me field add hone ke BAAD
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