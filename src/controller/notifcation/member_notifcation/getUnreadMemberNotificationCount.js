import Notification from "../../../model/notification.js";

const getUnreadMemberNotificationCount = async (req, res) => {
  try {
    const memberId = req.member._id;
    const buildingCode = req.buildingCode;

    const count = await Notification.countDocuments({
      buildingCode,
      $or: [
        { audience: "MEMBERS" },
        { receiverId: memberId, receiverModel: "MEMBER" },
      ],
      "readBy.userId": { $ne: memberId }, // unread = not in readBy
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export default getUnreadMemberNotificationCount;
