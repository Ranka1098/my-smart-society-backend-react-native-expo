// =========================
// Code Name: rejectMember.js
// =========================

import memberModel from "../../../model/member.js";
import memberRejectionNotificationEmail from "../../../utils/memberRejectionNotificationEmail.js"; // apna actual path check kar

const rejectMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const buildingCode = req.buildingCode; // adminAuth middleware se

    const member = await memberModel.findOne({
      _id: memberId,
      buildingCode,
      isVerified: true,
      approvalStatus: "Pending",
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found or already processed",
      });
    }

    member.approvalStatus = "Rejected";
    await member.save();

    try {
      await memberRejectionNotificationEmail({
        memberEmail: member.email,
        memberName: member.fullName,
        reason: null,
      });
    } catch (emailErr) {
      console.log("Rejection email failed:", emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Member rejected successfully",
    });
  } catch (error) {
    console.log("Reject Member Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
export default rejectMember;
