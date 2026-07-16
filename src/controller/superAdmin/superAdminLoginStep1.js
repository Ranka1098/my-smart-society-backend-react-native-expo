import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import SuperAdmin from "../../model/superAdmin.js";
import sendEmailOtp from "../../utils/sendEmailOtp.js";

// OTP Generator
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const superAdminLoginStep1 = async (req, res) => {
  try {
    const { email, password, secretKey } = req.body;

    if (!email || !password || !secretKey) {
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isPassOk = await bcrypt.compare(password, admin.password);
    if (!isPassOk) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isKeyOk = await bcrypt.compare(secretKey, admin.secretKey);
    if (!isKeyOk) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid secret key" });
    }

    // sab sahi -> OTP generate & bhejo
    const otp = generateOtp();
    admin.otp = otp;
    admin.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 min
    await admin.save();

    await sendEmailOtp(
      admin.email,
      "Super Admin Login OTP",
      `Your OTP is: ${otp}`
    );

    return res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default superAdminLoginStep1;
