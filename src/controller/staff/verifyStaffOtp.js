import StaffModel from "../../model/staff.js";
import { notifyStaffToAdmin } from "../notifcation/notifyMembers.js";

const verifyStaffOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;

    // ✅ FIX — required check, warna email.toLowerCase() crash karta
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required" });
    }

    email = String(email).trim().toLowerCase();
    otp = String(otp).trim();

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

    // notify apne try-catch me wrap kiya taaki notification fail ho to bhi
    // verification response sahi jaye
    try {
      const io = req.app.get("io");
      await notifyStaffToAdmin({
        io,
        buildingCode: staff.buildingCode,
        buildingId: staff.buildingId,
        type: "STAFF_APPROVAL_PENDING",
        title: "New Staff Request 🧑‍🔧",
        message: `${staff.workerName} (${staff.role}) registered — approval pending`,
        referenceId: staff._id,
        referenceModel: "Staff",
        data: {
          staffId: staff._id.toString(),
          workerName: staff.workerName,
          role: staff.role,
        },
        senderId: staff._id,
      });
    } catch (notifyErr) {
      console.error(
        "Admin notify failed (staff still verified):",
        notifyErr.message
      );
    }

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
export default verifyStaffOtp;
