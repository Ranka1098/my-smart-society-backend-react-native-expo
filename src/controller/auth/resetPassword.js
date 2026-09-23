import bcrypt from "bcryptjs";
import { getModelByRole } from "./forgetPassword.js";

export const resetPassword = async (req, res) => {
  try {
    const { buildingCode, role, email, otp, newPassword } = req.body;

    if (!buildingCode || !role || !email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await Model.findOne({
      buildingCode: buildingCode.trim(),
      email: email.toLowerCase().trim(),
    }).select("+password +resetOtp");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    let storedOtp, expiry;
    if (role === "admin") {
      storedOtp = user.otp;
      expiry = user.otpExpireAt?.getTime();
    } else if (role === "member") {
      storedOtp = user.resetOtp;
      expiry = user.resetOtpExpiry;
    } else {
      storedOtp = user.otp;
      expiry = user.otpExpiry?.getTime();
    }

    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (!expiry || Date.now() > expiry) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired, request a new one" });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    if (role === "admin") {
      user.otp = null;
      user.otpExpireAt = null;
    } else if (role === "member") {
      user.resetOtp = null;
      user.resetOtpExpiry = null;
    } else {
      user.otp = null;
      user.otpExpiry = null;
    }

    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
