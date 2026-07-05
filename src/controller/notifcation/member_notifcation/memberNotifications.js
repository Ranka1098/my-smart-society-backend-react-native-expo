import NotificationModel from "../../../model/notification.js";

const memberNotifications = async (req, res) => {
  try {
    const memberId = req.member._id;
    const buildingCode = req.buildingCode;

    const notifications = await NotificationModel.find({
      buildingCode,
      $or: [
        { audience: "MEMBERS", receiverId: null }, // ✅ true broadcast — sab dekhein
        { audience: "STAFF" },
        { receiverId: memberId, receiverModel: "MEMBER" }, // ✅ apna targeted
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    // har notification mein isRead compute karo
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
