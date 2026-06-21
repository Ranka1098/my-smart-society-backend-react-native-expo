import NotificationModel from "../../../model/notification.js";

const adminNotifications = async (req, res) => {
  try {
    const adminId = req.admin._id; // middleware se
    const buildingCode = req.buildingCode;

    const notifications = await NotificationModel.find({
      buildingCode,
      audience: "ADMIN",
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const result = notifications.map((n) => ({
      ...n.toObject(),
      isRead: n.readBy.some((r) => r.userId.toString() === adminId.toString()),
    }));

    return res.status(200).json({ success: true, notifications: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default adminNotifications;
