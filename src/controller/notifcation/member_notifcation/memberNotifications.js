import NotificationModel from "../../../model/notification.js";

const MEMBER_VISIBLE_STAFF_TYPES = []; // ✅ NAYA — jo STAFF-type notifications members ko dikhne chahiye

const memberNotifications = async (req, res) => {
  try {
    const memberId = req.member._id;
    const buildingCode = req.buildingCode;

    const sinceDate = req.member.approvedAt || req.member.createdAt;

    const notifications = await NotificationModel.find({
      buildingCode,
      createdAt: { $gte: sinceDate },
      $or: [
        { audience: "MEMBERS", receiverId: null },
        { audience: "STAFF", type: { $in: MEMBER_VISIBLE_STAFF_TYPES } }, // ✅ CHANGE — blanket clause hataya
        { receiverId: memberId, receiverModel: "MEMBER" },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const result = notifications.map((n) => ({
      ...n.toObject(),
      isRead: n.readBy.some((r) => r.userId.toString() === memberId.toString()),
    }));

    return res.status(200).json({ success: true, notifications: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default memberNotifications;
