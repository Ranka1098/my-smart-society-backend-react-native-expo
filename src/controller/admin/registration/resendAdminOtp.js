import adminModel from "../../../model/admin.js";
import sendEmailOtp from "../../../utils/sendEmailOtp.js";

// OTP Generator
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const resendAdminOtp = async (req, res) => {
  try {
    let { email } = req.body;

    // =========================
    // VALIDATION
    // =========================
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    email = String(email).trim().toLowerCase();

    // =========================
    // FIND ADMIN
    // =========================
    const admin = await adminModel.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // =========================
    // CHECK VERIFIED
    // =========================
    if (admin.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account already verified",
      });
    }

    // =========================
    // CHECK IF OTP STILL VALID
    // =========================
    if (admin.otpExpireAt && admin.otpExpireAt > new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP already sent. Please wait until it expires.",
        otpExpireAt: admin.otpExpireAt,
      });
    }

    // =========================
    // GENERATE NEW OTP
    // =========================
    const newOtp = generateOtp();
  const otpExpireAt = new Date(Date.now() + 5 * 60 * 1000); // ✅ 60 sec se 5 min

    admin.otp = newOtp;
    admin.otpExpireAt = otpExpireAt;

    await admin.save();

    // =========================
    // SEND EMAIL
    // =========================
    sendEmailOtp(email, newOtp).catch(() => {}); // ✅ await hatao, non-blocking banao — jaisa adminRegister.js mein hai


    return res.status(200).json({
      success: true,
      message: "New OTP sent successfully",
      otpExpireAt,
    });
  } catch (error) {
    console.log("Resend OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default resendAdminOtp;
