// markAllMemberNotificationsRead.js
import Notification from "../../../model/notification.js";

const markAllMemberNotificationsRead = async (req, res) => {
  try {
    const memberId = req.member._id;
    const buildingCode = req.buildingCode;
    const sinceDate = req.member.approvedAt || req.member.createdAt;

    await Notification.updateMany(
      {
        buildingCode,
        createdAt: { $gte: sinceDate },
        $or: [
          { audience: "MEMBERS", receiverId: null },
          { receiverId: memberId, receiverModel: "MEMBER" },
        ],
        "readBy.userId": { $ne: memberId },
      },
      {
        $push: { readBy: { userId: memberId, userModel: "MEMBER" } },
      }
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default markAllMemberNotificationsRead;