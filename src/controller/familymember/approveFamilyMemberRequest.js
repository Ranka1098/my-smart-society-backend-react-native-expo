import Member from "../../model/member.js";
import { notifyAdminToMember } from "../notifcation/notifyMembers.js"; // ✅ ADD

const approveFamilyMemberRequest = async (req, res) => {
  try {
    const { buildingCode } = req.admin;
    const { id } = req.params;

    const member = await Member.findOneAndUpdate(
      { _id: id, buildingCode, role: "family", approvalStatus: "Pending" },
      { approvalStatus: "Approved" },
      { new: true }
    );

    if (!member)
      return res
        .status(404)
        .json({ success: false, message: "Family member not found" });

    res.status(200).json({ success: true, message: "Family member approved" }); // ✅ CHANGE — return hataya, notif ke liye response pehle

    // ✅ ADD — primary member ko notify (parent lookup unitNo+buildingCode se, role primary)
    try {
      const primaryMember = await Member.findOne({
        buildingCode,
        unitNo: member.unitNo,
        role: "primary",
      }).select("_id fcmToken buildingId");

      if (primaryMember) {
        const io = req.app.get("io");
        await notifyAdminToMember({
          io,
          buildingCode,
          buildingId: primaryMember.buildingId,
          memberId: primaryMember._id,
          memberFcmToken: primaryMember.fcmToken,
          type: "FAMILY_MEMBER_APPROVED",
          title: "Family Member Approved ✅",
          message: `${member.fullName} (${member.relation}) ko approve kar diya gaya hai.`,
          referenceId: member._id,
          data: { familyMemberId: member._id.toString(), status: "Approved" },
        });
      }
    } catch (notifErr) {
      console.error("notify primary error:", notifErr.message);
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default approveFamilyMemberRequest;
