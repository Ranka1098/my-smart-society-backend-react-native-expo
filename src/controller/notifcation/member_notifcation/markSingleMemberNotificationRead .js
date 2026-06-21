import Notification from "../../../model/notification.js";

const markSingleMemberNotificationRead = async (req, res) => {
  try {
    const notifId = req.params.id;
    const memberId = req.member._id;

    const notif = await Notification.findOneAndUpdate(
      {
        _id: notifId,
        "readBy.userId": { $ne: memberId }, // already read nahi ho
      },
      {
        $push: {
          readBy: { userId: memberId, userModel: "MEMBER" },
        },
      },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ success: false, message: "Not found or already read" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default markSingleMemberNotificationRead;