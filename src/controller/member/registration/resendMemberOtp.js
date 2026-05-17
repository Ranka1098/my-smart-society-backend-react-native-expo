// =========================
// Code Name: resendMemberOtp.js
// =========================

import crypto from "crypto";

import memberModel from "../../../model/member.js";
import sendEmail from "../../../utils/sendEmailOtp.js";

const resendMemberOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // =========================
    // VALIDATION
    // =========================
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // =========================
    // FIND MEMBER
    // =========================
    // verifyMemberOtp.js
    const member = await memberModel
      .findOne({ email: email.toLowerCase().trim() })
      .select("+otp +otpExpires"); // ← yeh add karo  // ← explicitly mangao

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
    // GENERATE NEW OTP
    // =========================
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // =========================
    // UPDATE MEMBER
    // =========================
    member.otp = otp;
    member.otpExpires = otpExpires;

    await member.save();

    // =========================
    // SEND EMAIL
    // =========================
    await sendEmail({
      to: email,
      subject: "Verify OTP",
      text: `Your OTP is ${otp}`,
    });

    // BAAD
    await sendEmail(email, otp, "verify");

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      otpExpires,
    });
  } catch (error) {
    console.log("Resend OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export default resendMemberOtp;
