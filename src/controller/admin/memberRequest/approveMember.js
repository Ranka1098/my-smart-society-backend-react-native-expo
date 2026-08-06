// =========================
// Code Name: approveMember.js
// =========================

import memberModel from "../../../model/member.js";
import memberApprovalNotificationEmail from "../../../utils/memberApprovalNotificationEmail.js"; // apna actual path check kar

const approveMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const buildingCode = req.buildingCode; // adminAuth middleware se

    // =========================
    // MEMBER FIND
    // sirf apni building ka member approve kar sakta hai
    // =========================
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

    // =========================
    // APPROVE
    // =========================
    member.approvalStatus = "Approved";
    await member.save();

    // =========================
    // ✅ ADD — member ko approval email
    // =========================
    await memberApprovalNotificationEmail({
      memberEmail: member.email,
      memberName: member.fullName,
    });

    return res.status(200).json({
      success: true,
      message: "Member approved successfully",
    });
  } catch (error) {
    console.log("Approve Member Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export default approveMember;