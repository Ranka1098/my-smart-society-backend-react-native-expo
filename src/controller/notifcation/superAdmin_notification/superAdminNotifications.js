import NotificationModel from "../../../model/notification.js";

const superAdminNotifications = async (req, res) => {
  try {
    const superAdminId = req.superAdmin.id; // middleware se

    const notifications = await NotificationModel.find({
      audience: "SUPERADMIN",
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const result = notifications.map((n) => ({
      ...n.toObject(),
      isRead: n.readBy.some(
        (r) => r.userId.toString() === superAdminId.toString()
      ),
    }));

    return res.status(200).json({ success: true, notifications: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default superAdminNotifications;