import Notification from "../../../model/notification.js";
import Member from "../../../model/member.js";

const markSingleFamilyNotificationRead = async (req, res) => {
  try {
    const familyMember = req.member;
    const notifId = req.params.id;

    const primaryMember = await Member.findOne({
      buildingCode: req.buildingCode,
      unitNo: familyMember.unitNo,
      role: "primary",
    }).select("_id");

    const notif = await Notification.findOneAndUpdate(
      {
        _id: notifId,
        receiverId: primaryMember?._id, // ✅ ownership check — sirf apne unit ka notif
        "readBy.userId": { $ne: familyMember._id },
      },
      {
        $push: { readBy: { userId: familyMember._id, userModel: "MEMBER" } },
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

export default markSingleFamilyNotificationRead;