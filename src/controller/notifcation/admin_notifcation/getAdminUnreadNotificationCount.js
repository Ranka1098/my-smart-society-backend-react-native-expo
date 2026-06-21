import Notification from "../../../model/notification.js";

 const getAdminUnreadNotificationCount = async (req, res) => {
  try {
    const adminId = req.admin.id; // ✅ id — not _id
    const buildingCode = req.buildingCode;

    const count = await Notification.countDocuments({
      buildingCode,
      audience: "ADMIN",
      "readBy.userId": { $ne: adminId },
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getAdminUnreadNotificationCount