import Visitor from "../../model/Visitor.js";

const memberPendingVisitor = async (req, res) => {
  try {
    const memberId = req.member._id;

    const visitor = await Visitor.findOne({
      notifiedMembers: memberId,
      status: "Pending",
      notificationExpiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!visitor) {
      return res.status(200).json({ success: true, data: null });
    }

    return res.status(200).json({
      success: true,
  data: {
  visitorId: visitor._id,
  name: visitor.name,
  purpose: visitor.purpose,
  subType: visitor.subType || "",
  photoUrl: visitor.photoUrl,
  flatNo: visitor.flatNo,
  memberType: visitor.memberType || "Flat",
  ttlSeconds: Math.max(
    0,
    Math.floor((visitor.notificationExpiresAt - new Date()) / 1000),
  ),
  expiresAt: visitor.notificationExpiresAt,
},
    });
  } catch (error) {
    console.error("memberPendingVisitor error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default memberPendingVisitor;