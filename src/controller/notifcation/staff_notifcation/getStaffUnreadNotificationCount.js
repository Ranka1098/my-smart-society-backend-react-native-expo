import Notification from "../../../model/notification.js";

const getStaffUnreadNotificationCount = async (req, res) => {
  try {
    const staffId = req.staff._id; // ⚠️ apna auth middleware check karo — id ya _id
    const buildingCode = req.buildingCode;

    const count = await Notification.countDocuments({
      buildingCode,
      $or: [
        { audience: "STAFF", receiverId: null }, // ✅ sab guards ke liye broadcast
        { receiverId: staffId, receiverModel: "STAFF" }, // ✅ agar kabhi specific staff ko bheja ho
      ],
      "readBy.userId": { $ne: staffId },
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getStaffUnreadNotificationCount;