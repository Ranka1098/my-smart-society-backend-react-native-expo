import Notification from "../../../model/notification.js";

const getUnreadMemberNotificationCount = async (req, res) => {
  try {
    const memberId = req.member._id;
    const buildingCode = req.buildingCode;

    const count = await Notification.countDocuments({
      buildingCode,
      $or: [
        { audience: "MEMBERS", receiverId: null }, // ✅ sirf true broadcast
        { receiverId: memberId, receiverModel: "MEMBER" }, // ✅ apna targeted
      ],
      "readBy.userId": { $ne: memberId },
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export default getUnreadMemberNotificationCount;
