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
