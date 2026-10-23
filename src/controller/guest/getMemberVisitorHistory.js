import Visitor from "../../model/Visitor.js";

const LIMIT = 20;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

// "YYYY-MM-DD" (IST din) → { $gte, $lte } | null
const istDayRange = (d) => {
  if (!DATE_RE.test(d)) return null;
  const start = new Date(`${d}T00:00:00.000+05:30`);
  const end = new Date(`${d}T23:59:59.999+05:30`);
  if (isNaN(start) || isNaN(end)) return null;
  return { $gte: start, $lte: end };
};

// UI status → Mongo condition (guard history jaisa hi)
//  - Exited      : status Exited ya exitTime set
//  - Approved    : abhi andar (exit nahi hua)
//  - Rejected    : guard ka Rejected + member ka Denied
//  - ForcedEntry : status "Approved" rehta hai, method "ForcedEntry" hota hai
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

const getMemberVisitorHistory = async (req, res) => {
  try {
    // Building, flat, type token (memberAuth) se. Query se sirf status, date, page.
    const buildingCode = req.member?.buildingCode;
    const flatNo = req.member?.unitNo;
    const isShop = req.member?.memberType === "Shop";

    if (!buildingCode || !flatNo) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const and = [
      { buildingCode },
      { flatNo },
      // Flat = Flat + missing + null (purane records)
      { memberType: isShop ? "Shop" : { $ne: "Shop" } },
    ];

    const s = str(req.query.status);
    if (s && s !== "All") and.push(statusCondition(s));

    // Din ke andar create / entry / exit hua ho → record dikhe
    const d = str(req.query.date);
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

    const filter = { $and: and };

    const [list, total] = await Promise.all([
      Visitor.find(filter)
        .sort({ entryTime: -1, createdAt: -1 })
        .skip((page - 1) * LIMIT)
        .limit(LIMIT)
        .select(
          "name mobile purpose subType vehicleNo vehicleType status photoUrl exitPhotoUrl entryTime exitTime createdAt approvedAt rejectedAt rejectionReason forcedEntryReason verificationMethod isEmergencyExit guardId exitGuardId respondedBy",
        )
        .populate("guardId", "workerName")
        .populate("exitGuardId", "workerName")
        .populate("respondedBy", "fullName")
        .lean(),
      Visitor.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      hasMore: page * LIMIT < total,
      data: list,
    });
  } catch (e) {
    console.error("getMemberVisitorHistory error:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getMemberVisitorHistory;
