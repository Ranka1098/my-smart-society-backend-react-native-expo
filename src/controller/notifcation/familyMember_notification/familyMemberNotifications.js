import NotificationModel from "../../../model/notification.js";

const VISITOR_NOTIF_TYPES = [
  "VISITOR_ARRIVED",
  "GUEST_APPROVED",
  "GUEST_REJECTED",
  "GUEST_DENIED",
  "GUEST_EXIT",
]; // ✅ sirf visitor-related types

const familyMemberNotifications = async (req, res) => {
  try {
    const familyMember = req.member;
    const buildingCode = req.buildingCode;

    if (familyMember.role !== "family")
      return res
        .status(403)
        .json({ success: false, message: "Family members only" });

    // ✅ primary member dhundo (jisko visitor notif jaate hain)


    const sinceDate = familyMember.approvedAt || familyMember.createdAt;

    const notifications = await NotificationModel.find({
      buildingCode,
      createdAt: { $gte: sinceDate },
      type: { $in: VISITOR_NOTIF_TYPES }, // ✅ sirf visitor types
      receiverId: familyMember._id, // ✅ primaryMember._id ki jagah ye
      receiverModel: "MEMBER",
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const result = notifications.map((n) => ({
      ...n.toObject(),
      isRead: n.readBy.some(
        (r) => r.userId.toString() === familyMember._id.toString()
      ),
    }));

    return res.status(200).json({ success: true, notifications: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default familyMemberNotifications;
