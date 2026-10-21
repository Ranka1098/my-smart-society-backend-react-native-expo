import Visitor from "../../model/Visitor.js";
import Member from "../../model/member.js";

const MAX_PENDING_AGE_MS = 30 * 60 * 1000;

const getPendingVisitorsForGuard = async (req, res) => {
  try {
    const buildingCode = req.staff?.buildingCode || req.buildingCode;
    const guardId = req.staff?._id;
    if (!buildingCode || !guardId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const visitors = await Visitor.find({
      buildingCode,
      guardId, // sirf apni entries
      status: "Pending",
      verificationMethod: { $ne: "OTP" },
      createdAt: { $gte: new Date(Date.now() - MAX_PENDING_AGE_MS) },
    })
      .select(
        "name purpose subType vehicleNo photoUrl flatNo memberType notificationExpiresAt notifiedMembers createdAt guardId",
      )
      .sort({ createdAt: -1 })
      .lean();

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
      subType: v.subType,
      vehicleNo: v.vehicleNo,
      createdAt: v.createdAt,
      guardId: v.guardId,
    }));

    return res.json({ success: true, visitors: result });
  } catch (error) {
    console.error("getPendingVisitorsForGuard error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getPendingVisitorsForGuard;
