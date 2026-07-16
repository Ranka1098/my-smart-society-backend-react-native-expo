import SuperAdmin from "../../model/superAdmin.js";
import jwt from "jsonwebtoken"
const superAdminLoginStep2 = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email & OTP required" });
    }

    const admin = await SuperAdmin.findOne({ email: email.toLowerCase() });
    if (!admin || !admin.otp || !admin.otpExpiry) {
      return res
        .status(400)
        .json({ success: false, message: "OTP not requested" });
    }

    if (admin.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (admin.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    admin.otp = null;
    admin.otpExpiry = null;
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, role: "superadmin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      superAdmin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default superAdminLoginStep2;
