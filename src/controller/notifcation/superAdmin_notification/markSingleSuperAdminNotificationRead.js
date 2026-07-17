import Notification from "../../../model/notification.js";

const markSingleSuperAdminNotificationRead = async (req, res) => {
  try {
    const notifId = req.params.id;
    const superAdminId = req.superAdmin.id; // ✅ id — not _id

    const notif = await Notification.findOneAndUpdate(
      {
        _id: notifId,
        audience: "SUPERADMIN",
        "readBy.userId": { $ne: superAdminId },
      },
      {
        $push: { readBy: { userId: superAdminId, userModel: "SUPERADMIN" } },
      },
      { new: true }
    );

    if (!notif) {
      return res
        .status(404)
        .json({ success: false, message: "Not found or already read" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default markSingleSuperAdminNotificationRead;
