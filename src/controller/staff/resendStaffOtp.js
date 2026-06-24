import StaffModel from "../../model/staff.js";
import sendOtpEmail from "../../utils/sendEmailOtp.js";
const resendStaffOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const staff = await StaffModel.findOne({ email: email.toLowerCase() });
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
    staff.otp = otp;
    staff.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await staff.save();

    await sendOtpEmail(email, otp, staff.workerName);

    return res
      .status(200)
      .json({ success: true, message: "OTP resent successfully" });
  } catch (error) {
    console.error("resendStaffOtp error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default resendStaffOtp;
