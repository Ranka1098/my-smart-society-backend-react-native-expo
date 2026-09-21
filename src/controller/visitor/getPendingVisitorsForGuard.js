import Visitor from "../../model/Visitor.js";
import Member from "../../model/member.js";

const getPendingVisitorsForGuard = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;
    if (!buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const visitors = await Visitor.find({
      buildingCode,
      status: "Pending",
    }).select("name purpose photoUrl flatNo memberType notificationExpiresAt notifiedMembers");

    // ✅ NAYA — har visitor ke notifiedMembers se actual member details fetch karo
    const visitorIds = visitors.map((v) => v._id);
    const allMemberIds = [...new Set(visitors.flatMap((v) => v.notifiedMembers.map(String)))];
    const members = await Member.find({ _id: { $in: allMemberIds } }).select(
      "fullName primaryPhone role unitNo"
    );
    const memberMap = {};
    members.forEach((m) => (memberMap[m._id.toString()] = m));

    const result = visitors.map((v) => ({
      _id: v._id,
      name: v.name,
      purpose: v.purpose,
      photoUrl: v.photoUrl,
      flatNo: v.flatNo,
      memberType: v.memberType,
      notificationExpiresAt: v.notificationExpiresAt,
      members: v.notifiedMembers
        .map((mId) => memberMap[mId.toString()])
        .filter(Boolean), // ✅ NAYA — actual member list with primaryPhone
    }));

    return res.json({ success: true, visitors: result });
  } catch (error) {
    console.error("getPendingVisitorsForGuard error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getPendingVisitorsForGuard;