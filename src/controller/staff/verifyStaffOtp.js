import StaffModel from "../../model/staff.js";
 const verifyStaffOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

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

    if (!staff.otp || staff.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (staff.otpExpiry < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired. Please resend." });
    }

    // Mark verified
    staff.isEmailVerified = true;
    staff.otp = null;
    staff.otpExpiry = null;
    await staff.save();

    // TODO: Notify admin via socket/FCM that new staff request is pending
    // notifyAdmin(staff.buildingCode, staff);

    return res.status(200).json({
      success: true,
      message:
        "Email verified. Your request has been sent to the admin for approval.",
    });
  } catch (error) {
    console.error("verifyStaffOtp error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default verifyStaffOtp
