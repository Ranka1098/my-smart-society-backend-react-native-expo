import NotificationModel from "../../../model/notification.js";

const staffNotifications = async (req, res) => {
  try {
    const staffId = req.staff._id; // ⚠️ apna auth middleware check karo
    const buildingCode = req.buildingCode;

    const notifications = await NotificationModel.find({
      buildingCode,
      $or: [
        { audience: "STAFF", receiverId: null }, // ✅ broadcast — sab guard dekhein
        { receiverId: staffId, receiverModel: "STAFF" }, // ✅ apna targeted
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const result = notifications.map((n) => ({
      ...n.toObject(),
      isRead: n.readBy.some((r) => r.userId.toString() === staffId.toString()),
    }));

    return res.status(200).json({ success: true, notifications: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default staffNotifications;