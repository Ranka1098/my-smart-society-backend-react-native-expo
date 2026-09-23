import adminModel from "../../model/admin.js";
import memberModel from "../../model/member.js";
import StaffModel from "../../model/staff.js";
import sendEmailOtp from "../../utils/sendEmailOtp.js";

const OTP_TTL_MINUTES = 10;

const ROLE_MODELS = [
  { role: "admin", Model: adminModel },
  { role: "member", Model: memberModel },
  { role: "staff", Model: StaffModel },
];

export const getModelByRole = (role) => {
  const found = ROLE_MODELS.find((r) => r.role === role);
  return found ? found.Model : null;
};

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ── find user across all 3 models by email+buildingCode ──
const findUserAnyRole = async (buildingCode, email) => {
  for (const { role, Model } of ROLE_MODELS) {
    const user = await Model.findOne({
      buildingCode: buildingCode.trim(),
      email: email.toLowerCase().trim(),
    });
    if (user) return { role, user };
  }
  return null;
};

export const forgetPassword = async (req, res) => {
  try {
    const { buildingCode, email } = req.body;

    if (!buildingCode || !email) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const found = await findUserAnyRole(buildingCode, email);
    if (!found) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email in this building",
      });
    }

    const { role, user } = found;
    const otp = generateOtp();
    const expiryMs = Date.now() + OTP_TTL_MINUTES * 60 * 1000;

    if (role === "admin") {
      user.otp = otp;
      user.otpExpireAt = new Date(expiryMs);
    } else if (role === "member") {
      user.resetOtp = otp;
      user.resetOtpExpiry = expiryMs;
    } else {
      user.otp = otp;
      user.otpExpiry = new Date(expiryMs);
    }

    await user.save();

    const sent = await sendEmailOtp(user.email, otp, "forgot");
    if (!sent) {
      return res.status(500).json({ success: false, message: "Failed to send OTP email" });
    }

    // frontend ko role bhejo taki verifyOtp/reset-password screen use kar sake
    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      role, // ✅ important — reset karte waqt role chahiye hoga
    });
  } catch (error) {
    console.error("forgetPassword error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};