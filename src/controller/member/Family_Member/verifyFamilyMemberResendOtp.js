// =========================
// Code Name: verifyFamilyResendOtp.js
// =========================

import crypto from "crypto";
import memberModel from "../../../model/member.js"; // ← same model
import sendEmail from "../../../utils/sendEmailOtp.js";

const verifyFamilyMemberResendOtp = async (req, res) => {
  try {
    const { familyMemberId } = req.body;

    if (!familyMemberId) {
      return res.status(400).json({
        success: false,
        message: "familyMemberId is required",
      });
    }

    // FIND — role:family ensure karo
    const familyMember = await memberModel
      .findOne({ _id: familyMemberId, role: "family" })
      .select("+otp +otpExpires +password");

    if (!familyMember) {
      return res.status(404).json({
        success: false,
        message: "Family member not found",
      });
    }

    if (familyMember.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Family member already verified",
      });
    }

    // GENERATE OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    familyMember.otp = otp;
    familyMember.otpExpires = otpExpires;
    await familyMember.save();

    // SEND
    await sendEmail(familyMember.email, otp, "verify");

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      otpExpires,
    });
  } catch (error) {
    console.log("verifyFamilyMemberResendOtp Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export default verifyFamilyMemberResendOtp;