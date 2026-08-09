import NotificationModel from "../../../model/notification.js";

const staffNotifications = async (req, res) => {
  try {
    const staffId = req.staff._id;
    const buildingCode = req.buildingCode;

    // ✅ NAYA — staff ka approval/join date — apna actual field name check karo
    // (approvedAt / joiningDate / createdAt — Staff model me jo bhi field hai)
    const sinceDate = req.staff.approvedAt || req.staff.joiningDate || req.staff.createdAt;

    const notifications = await NotificationModel.find({
      buildingCode,
      createdAt: { $gte: sinceDate }, // ✅ NAYA — sirf approval ke baad ke notifications
      $or: [
        { audience: "STAFF", receiverId: null },
        { receiverId: staffId, receiverModel: "STAFF" },
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