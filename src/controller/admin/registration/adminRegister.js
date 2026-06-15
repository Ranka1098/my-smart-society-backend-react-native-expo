// =========================
// Code Name: adminRegister.js (Fixed Flats/Shops Save)
// =========================

import adminModel from "../../../model/admin.js";
import bcrypt from "bcrypt";
import sendEmailOtp from "../../../utils/sendEmailOtp.js";

// OTP Generator
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Password Regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;

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
        message:
          "Password must contain uppercase, lowercase, number and special character",
      });
    }

    // =========================
    // ✅ CHECK EXISTING ADMIN
    // =========================
    const existingAdmin = await adminModel.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingAdmin && existingAdmin.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Admin already registered",
      });
    }

    // =========================
    // 🔥 OTP SETUP
    // =========================
    const otp = generateOtp();
    const otpExpireAt = new Date(Date.now() + 60 * 1000);

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

      sendEmailOtp(email, otp).catch(() => {});

      return res.status(200).json({
        success: true,
        message: "OTP resent successfully",
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

    sendEmailOtp(email, otp).catch(() => {});

    return res.status(201).json({
      success: true,
      message: "OTP sent successfully",
      otpExpireAt,
    });
  } catch (error) {
    console.log("Admin Register Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default adminRegister;
