import Notification from "../../../model/notification.js";

const markSingleStaffNotificationRead = async (req, res) => {
  try {
    const notifId = req.params.id;
    const staffId = req.staff._id; // ⚠️ apna auth middleware check karo

    const notif = await Notification.findOneAndUpdate(
      {
        _id: notifId,
        buildingCode: req.buildingCode,
        "readBy.userId": { $ne: staffId },
      },
      {
        $push: { readBy: { userId: staffId, userModel: "STAFF" } },
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

export default markSingleStaffNotificationRead;