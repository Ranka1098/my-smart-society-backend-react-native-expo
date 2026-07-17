import Notification from "../../../model/notification.js";

const getSuperAdminUnreadNotificationCount = async (req, res) => {
  try {
    const superAdminId = req.superAdmin.id; // ✅ id — not _id

    const count = await Notification.countDocuments({
      audience: "SUPERADMIN",
      "readBy.userId": { $ne: superAdminId },
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getSuperAdminUnreadNotificationCount;