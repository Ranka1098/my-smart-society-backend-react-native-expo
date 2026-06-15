// =========================
// Code Name: verifyMemberOtp.js
// =========================

import memberModel from "../../../model/member.js";

const verifyMemberOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // =========================
    // VALIDATION
    // =========================
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // =========================
    // FIND MEMBER
    // =========================
    const member = await memberModel.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // =========================
    // ALREADY VERIFIED
    // =========================
    if (member.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Member already verified",
      });
    }

    // =========================
    // OTP CHECK
    // =========================
    if (member.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // =========================
    // OTP EXPIRY CHECK
    // =========================
    if (!member.otpExpires || member.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    // =========================
    // UNIT DUPLICATE CHECK
    // buildingCode + unitNo se — verified primary members me
    // =========================
    const existingUnit = await memberModel.findOne({
      buildingCode: member.buildingCode,
      unitNo: member.unitNo,
      memberType: member.memberType, // add this
      role: "primary",
      isVerified: true,
      _id: { $ne: member._id },
    });

    if (existingUnit) {
      return res.status(400).json({
        success: false,
        message: "Primary member already exists for this unit",
      });
    }

    // =========================
    // MEMBER UPDATE
    // =========================
    member.isVerified = true;
    member.approvalStatus = "Pending";
    member.otp = null;
    member.otpExpires = null;

    await member.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. Waiting for admin approval.",
    });
  } catch (error) {
    console.log("Verify Member OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export default verifyMemberOtp;
