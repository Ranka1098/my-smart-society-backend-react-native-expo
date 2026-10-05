import Visitor from "../../model/Visitor.js";
import Member from "../../model/member.js";

// Isse purani Pending entries guard ko dobara restore nahi hongi
const MAX_PENDING_AGE_MS = 24 * 60 * 60 * 1000;

const getPendingVisitorsForGuard = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    if (!buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Expired (notificationExpiresAt beet chuki) entries bhi aati hain.
    // Guard ko "no response" stage me call/force karna hota hai.
    const visitors = await Visitor.find({
      buildingCode,
      status: "Pending",
      // Member ki pre-approved (OTP) entry walk-in nahi hai.
      // Uska notificationExpiresAt hota hi nahi, timer NaN ban jata tha.
      verificationMethod: { $ne: "OTP" },
      createdAt: { $gte: new Date(Date.now() - MAX_PENDING_AGE_MS) },
    })
      .select(
        "name purpose photoUrl flatNo memberType notificationExpiresAt notifiedMembers",
      )
      .sort({ createdAt: -1 })
      .lean();

    // Har visitor ke notifiedMembers ki actual member details
    const memberIds = [
      ...new Set(
        visitors.flatMap((v) => (v.notifiedMembers ?? []).map(String)),
      ),
    ];

    const members = memberIds.length
      ? await Member.find({ _id: { $in: memberIds } })
          .select("fullName primaryPhone role unitNo")
          .lean()
      : [];

    const memberMap = new Map(members.map((m) => [String(m._id), m]));

    const result = visitors.map((v) => ({
      _id: v._id,
      name: v.name,
      purpose: v.purpose,
      photoUrl: v.photoUrl,
      flatNo: v.flatNo,
      memberType: v.memberType,
      notificationExpiresAt: v.notificationExpiresAt,
      members: (v.notifiedMembers ?? [])
        .map((id) => memberMap.get(String(id)))
        .filter(Boolean),
    }));

    return res.json({ success: true, visitors: result });
  } catch (error) {
    console.error("getPendingVisitorsForGuard error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getPendingVisitorsForGuard;
