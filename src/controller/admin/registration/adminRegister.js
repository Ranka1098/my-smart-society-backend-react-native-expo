// =========================
// Code Name: adminRegister.js (Fixed Flats/Shops Save)
// =========================

import adminModel from "../../../model/admin.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import sendEmailOtp from "../../../utils/sendEmailOtp.js";
import memberModel from "../../../model/member.js";
import StaffModel from "../../../model/staff.js";

// OTP Generator
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// Password Regex
const passwordRegex = /^.{4,20}$/;

const adminRegister = async (req, res) => {
  try {
    let {
      adminName,
      email,
      phone,
      buildingName,
      address,
      pincode,
      password,
      totalFlats,
      totalShops,
    } = req.body;

    // =========================
    // ✅ NORMALIZE
    // =========================
    email = email?.trim().toLowerCase();
    adminName = adminName?.trim();
    phone = phone?.trim();
    buildingName = buildingName?.trim();
    address = address?.trim();
    pincode = pincode?.trim();

    totalFlats = Number(totalFlats);
    totalShops = Number(totalShops);

    // =========================
    // ✅ VALIDATION
    // =========================
    if (
      !adminName ||
      !email ||
      !phone ||
      !buildingName ||
      !address ||
      !pincode ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Repeated character pattern check (jaise "hshshshhshsh")
    // Same char 6+ baar YA 2-char pattern (jaise "hshshs") 4+ baar repeat
    const gibberishRegex = /(.)\1{5,}|(..)\2{3,}/;

    if (gibberishRegex.test(adminName)) {
      return res.status(400).json({
        success: false,
        message: "Chairman name looks invalid — please enter a real name",
      });
    }
    if (gibberishRegex.test(buildingName)) {
      return res.status(400).json({
        success: false,
        message:
          "Building/society name looks invalid — please enter a real name",
      });
    }
    if (gibberishRegex.test(address)) {
      return res.status(400).json({
        success: false,
        message: "Address looks invalid — please enter a real address",
      });
    }
    if (gibberishRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email looks invalid — please enter a real email",
      });
    }

    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|in|org|net|co|edu|gov|io|dev|app)$/i;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits",
      });
    }

    if (adminName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Chairman Name too long (max 50 characters)",
      });
    }
    if (buildingName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Building name too long (max 50 characters)",
      });
    }
    if (address.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Address too long (max 100 characters)",
      });
    }
    if (email.length > 100) {
      return res
        .status(400)
        .json({ success: false, message: "Email too long" });
    }
    if (totalFlats > 1000 || totalShops > 1000) {
      return res.status(400).json({
        success: false,
        message: "Flats/Shops count bohat jayda hai less than 1000",
      });
    }

    if (isNaN(totalFlats) || totalFlats < 0) {
      return res.status(400).json({
        success: false,
        message: "Total Flats must be a valid number",
      });
    }

    if (isNaN(totalShops) || totalShops < 0) {
      return res.status(400).json({
        success: false,
        message: "Total Shops must be a valid number",
      });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be 4-20 characters",
      });
    }

    const pincodeRegex = /^[0-9]{6}$/;
    if (!pincodeRegex.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be exactly 6 digits",
      });
    }

    // =========================
    // ✅ CHECK EXISTING ADMIN
    // =========================
    const existingAdmin = await adminModel.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingAdmin && existingAdmin.isVerified) {
      const field = existingAdmin.email === email ? "Email" : "Phone number";
      return res.status(400).json({
        success: false,
        message: `${field} already registered with another account`,
      });
    }

    // =========================
    // ✅ CROSS-ROLE — sirf VERIFIED member/staff block karega
    // =========================
    const [memberDup, staffDup] = await Promise.all([
      memberModel.findOne({
        isVerified: true,
        $or: [{ primaryPhone: phone }, { email }],
      }),
      StaffModel.findOne({
        isEmailVerified: true,
        $or: [{ workerPhoneNumber: phone }, { email }],
      }),
    ]);

    if (memberDup || staffDup) {
      const dup = memberDup || staffDup;
      const role = memberDup ? "member" : "staff";
      const field = dup.email === email ? "Email" : "Phone number";
      return res.status(400).json({
        success: false,
        message: `${field} is already registered as ${role}`,
      });
    }

    // ✅ dusre role ke UNVERIFIED record hatao (pehle OTP verify karne wala jeete)
    await Promise.all([
      memberModel.deleteMany({
        isVerified: false,
        role: "primary",
        $or: [{ primaryPhone: phone }, { email }],
      }),
      StaffModel.deleteMany({
        isEmailVerified: false,
        $or: [{ workerPhoneNumber: phone }, { email }],
      }),
    ]);

    // =========================
    // 🔥 OTP SETUP
    // =========================
    const otp = generateOtp();
    const otpExpireAt = new Date(Date.now() + 5 * 60 * 1000); // ✅ 60 sec se 5 min

    // =========================
    // 🔐 HASH PASSWORD
    // =========================
    const hashedPassword = await bcrypt.hash(password, 10);

    // =========================
    // 🔁 IF UNVERIFIED ADMIN EXISTS → UPDATE
    // =========================
    if (existingAdmin && !existingAdmin.isVerified) {
      existingAdmin.adminName = adminName;
      existingAdmin.email = email;
      existingAdmin.phone = phone;
      existingAdmin.buildingName = buildingName;
      existingAdmin.address = address;
      existingAdmin.pincode = pincode;
      existingAdmin.password = hashedPassword;

      // ✅ IMPORTANT FIX
      existingAdmin.pendingTotalFlats = totalFlats;
      existingAdmin.pendingTotalShops = totalShops;

      existingAdmin.otp = otp;
      existingAdmin.otpExpireAt = otpExpireAt;

      await existingAdmin.save();

      const emailSent = await sendEmailOtp(email, otp);
      return res.status(200).json({
        success: true,
        message: emailSent
          ? "OTP resent successfully"
          : "Registered, but OTP email failed to send. Try Resend OTP.",
        emailSent,
        otpExpireAt,
      });
    }

    // =========================
    // 🆕 CREATE NEW ADMIN
    // =========================
    await adminModel.create({
      adminName,
      email,
      phone,
      buildingName,
      address,
      pincode,
      password: hashedPassword,

      // ✅ IMPORTANT FIX
      pendingTotalFlats: totalFlats,
      pendingTotalShops: totalShops,

      otp,
      otpExpireAt,
      isVerified: false,
    });

    const emailSent = await sendEmailOtp(email, otp);

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "OTP sent successfully"
        : "Registered, but OTP email failed to send. Try Resend OTP.",
      emailSent,
      otpExpireAt,
    });
  } catch (error) {
    console.log("Admin Register Error:", error);

    // ✅ DUPLICATE KEY (email ek admin ka, phone dusre ka — findOne ek hi deta hai)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({
        success: false,
        message: `${field === "phone" ? "Phone number" : "Email"} already registered with another account`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default adminRegister;
