import Member from "../../model/member.js";
import { notifyAdminToMember } from "../notifcation/notifyMembers.js";

const rejectFamilyMemberRequest = async (req, res) => {
  try {
    const { buildingCode } = req.admin;
    const { id } = req.params;

    // ✅ reject = delete. Email/phone free ho jata hai, dobara add ho sakta hai
    const member = await Member.findOneAndDelete({
      _id: id,
      buildingCode,
      role: "family",
      approvalStatus: "Pending",
    });

    if (!member)
      return res
        .status(404)
        .json({ success: false, message: "Family member not found" });

    res.status(200).json({ success: true, message: "Family member rejected" });

    try {
      const primaryMember = await Member.findOne({
        buildingCode,
        unitNo: member.unitNo,
        memberType: member.memberType, // ✅ Flat A1 aur Shop A1 alag hote hain
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
          type: "FAMILY_MEMBER_REJECTED",
          title: "Family Member Rejected ❌",
          message: `${member.fullName} (${member.relation}) ki request reject ho gayi hai.`,
          referenceId: member._id,
          data: { familyMemberId: member._id.toString(), status: "Rejected" },
        });
      }
    } catch (notifErr) {
      console.error("notify primary error:", notifErr.message);
    }
  } catch (error) {
    console.error("rejectFamilyMemberRequest error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export default rejectFamilyMemberRequest;
