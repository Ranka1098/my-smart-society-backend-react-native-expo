import SuperAdmin from "../../model/superAdmin.js";
import sendEmailOtp from "../../utils/sendEmailOtp.js";

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const superAdminResendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email required" });
    }

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request" });
    }

    const otp = generateOtp();
    admin.otp = otp;
    admin.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 min validity
    await admin.save();

    await sendEmailOtp(admin.email, otp, "superadmin");

    return res.json({ success: true, message: "OTP resent to email" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default superAdminResendOtp;
