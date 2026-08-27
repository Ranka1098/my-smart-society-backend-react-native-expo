import crypto from "crypto";
import StaffModel from "../../model/staff.js";
import sendOtpEmail from "../../utils/sendEmailOtp.js";

// ✅ FIX — generateOtp yahan missing thi, isliye har resend request crash (500) hoti thi
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

const resendStaffOtp = async (req, res) => {
  try {
    let { email } = req.body;

    // ✅ FIX — required check, warna email.toLowerCase() crash karta
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    email = String(email).trim().toLowerCase();

    const staff = await StaffModel.findOne({ email });
    if (!staff) {
      return res
        .status(404)
        .json({ success: false, message: "Staff not found" });
    }

    if (staff.isEmailVerified) {
      return res
        .status(400)
        .json({ success: false, message: "Email already verified" });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // ✅ variable banaya
    staff.otp = otp;
    staff.otpExpiry = otpExpiry;
    await staff.save();

    let emailSent = true;
    try {
      await sendOtpEmail(email, otp, "verify");
    } catch (e) {
      emailSent = false;
    }

    return res.status(200).json({
      success: true,
      message: emailSent ? "OTP resent successfully" : "OTP generated, but email failed to send",
      emailSent,
      otpExpireAt: otpExpiry,
    });
  } catch (error) {
    console.error("resendStaffOtp error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default resendStaffOtp;
