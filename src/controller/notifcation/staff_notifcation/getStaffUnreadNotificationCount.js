import Notification from "../../../model/notification.js";

const getStaffUnreadNotificationCount = async (req, res) => {
  try {
    const staffId = req.staff._id; // ⚠️ apna auth middleware check karo — id ya _id
    const buildingCode = req.buildingCode;

// getStaffUnreadNotificationCount.js
const sinceDate = req.staff.approvedAt || req.staff.joiningDate || req.staff.createdAt;

const count = await Notification.countDocuments({
  buildingCode,
  createdAt: { $gte: sinceDate }, // ✅ NAYA
  $or: [
    { audience: "STAFF", receiverId: null },
    { receiverId: staffId, receiverModel: "STAFF" },
  ],
  "readBy.userId": { $ne: staffId },
});

    return res.status(200).json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getStaffUnreadNotificationCount;