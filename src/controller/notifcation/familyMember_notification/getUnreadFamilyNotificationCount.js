import Notification from "../../../model/notification.js";
import Member from "../../../model/member.js";

const VISITOR_NOTIF_TYPES = [
  "VISITOR_ARRIVED",
  "GUEST_APPROVED",
  "GUEST_REJECTED",
  "GUEST_DENIED",
  "GUEST_EXIT",
];

const getUnreadFamilyNotificationCount = async (req, res) => {
  try {
    const familyMember = req.member;
    const buildingCode = req.buildingCode;

    const primaryMember = await Member.findOne({
      buildingCode,
      unitNo: familyMember.unitNo,
      role: "primary",
    }).select("_id");

    const sinceDate = familyMember.approvedAt || familyMember.createdAt;

    const count = await Notification.countDocuments({
      buildingCode,
      createdAt: { $gte: sinceDate },
      type: { $in: VISITOR_NOTIF_TYPES },
      receiverId: primaryMember?._id,
      receiverModel: "MEMBER",
      "readBy.userId": { $ne: familyMember._id },
    });

    return res.status(200).json({ success: true, count });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getUnreadFamilyNotificationCount;
