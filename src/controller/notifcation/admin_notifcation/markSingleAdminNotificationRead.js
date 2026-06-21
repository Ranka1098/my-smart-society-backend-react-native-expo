import Notification from "../../../model/notification.js";

const markSingleAdminNotificationRead = async (req, res) => {
  try {
    const notifId = req.params.id;
    const adminId = req.admin.id; // ✅ id — not _id

    const notif = await Notification.findOneAndUpdate(
      {
        _id: notifId,
        buildingCode: req.buildingCode,
        "readBy.userId": { $ne: adminId },
      },
      {
        $push: { readBy: { userId: adminId, userModel: "ADMIN" } },
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

export default markSingleAdminNotificationRead;
