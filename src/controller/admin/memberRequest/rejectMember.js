// =========================
// Code Name: rejectMember.js
// =========================

import memberModel from "../../../model/member.js";

const rejectMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const buildingCode = req.buildingCode; // adminAuth middleware se

    // =========================
    // MEMBER FIND
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
    // REJECT
    // =========================
    member.approvalStatus = "Rejected";
    await member.save();

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
