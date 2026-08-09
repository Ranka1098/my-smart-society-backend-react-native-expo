import Notification from "../../../model/notification.js";

const getUnreadMemberNotificationCount = async (req, res) => {
  try {
    const memberId = req.member._id;
    const buildingCode = req.buildingCode;

    // getUnreadMemberNotificationCount.js
    const sinceDate = req.member.approvedAt || req.member.createdAt;

    const count = await Notification.countDocuments({
      buildingCode,
      createdAt: { $gte: sinceDate }, // ✅ NAYA
      $or: [
        { audience: "MEMBERS", receiverId: null },
        { receiverId: memberId, receiverModel: "MEMBER" },
      ],
      "readBy.userId": { $ne: memberId },
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export default getUnreadMemberNotificationCount;
