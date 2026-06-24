// =========================
// Code Name: staffController.js
// =========================

import StaffModel from "../../model/staff.js";
import BuildingModel from "../../model/building.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sharp from "sharp";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";
import sendOtpEmail from "../../utils/sendEmailOtp.js";

const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// ─────────────────────────────────────────────────────────
// @route  POST /staffRegister
// @access Public
// ─────────────────────────────────────────────────────────
const staffRegister = async (req, res) => {
  try {
    const {
      buildingCode,
      role,
      workerName,
      email,
      workerPhoneNumber,
      password,
      workerAddress,
    } = req.body;

    if (!req.files?.workerPhoto || !req.files?.workerIdProof) {
      return res
        .status(400)
        .json({ success: false, message: "Photos required" });
    }

    // 1. Building exists?
    const building = await BuildingModel.findOne({
      buildingCode: buildingCode.toUpperCase(),
    });
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building code not found" });
    }

    // 2. Email unique per building
    const existing = await StaffModel.findOne({
      email: email.toLowerCase(),
      buildingCode: buildingCode.toUpperCase(),
    });

    if (existing) {
      if (!existing.isEmailVerified) {
        // Upload photos if present
        if (req.files?.workerPhoto?.[0]) {
          const compressed = await sharp(req.files.workerPhoto[0].buffer)
            .resize({ width: 800, withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer();
          const uploaded = await uploadToCloudinary(compressed, "staffPhotos");
          existing.workerPhoto = uploaded.secure_url;
        }

        if (req.files?.workerIdProof?.[0]) {
          const compressed = await sharp(req.files.workerIdProof[0].buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer();
          const uploaded = await uploadToCloudinary(
            compressed,
            "staffIdProofs"
          );
          existing.workerIdProof = uploaded.secure_url;
        }

        const otp = generateOtp();
        existing.otp = otp;
        existing.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await existing.save();

        try {
          await sendOtpEmail(email, otp, workerName);
        } catch (e) {}
        return res
          .status(200)
          .json({ success: true, message: "OTP resent to your email" });
      }
      return res.status(409).json({
        success: false,
        message: "Staff already registered with this email",
      });
    }

    // 3. Upload images if present
    let workerPhotoUrl = null;
    let workerIdProofUrl = null;

    if (req.files?.workerPhoto?.[0]) {
      const compressed = await sharp(req.files.workerPhoto[0].buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      const uploaded = await uploadToCloudinary(compressed, "staffPhotos");
      workerPhotoUrl = uploaded.secure_url;
    }

    if (req.files?.workerIdProof?.[0]) {
      const compressed = await sharp(req.files.workerIdProof[0].buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      const uploaded = await uploadToCloudinary(compressed, "staffIdProofs");
      workerIdProofUrl = uploaded.secure_url;
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Generate OTP
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // 6. Save staff
    const staff = new StaffModel({
      buildingCode: buildingCode.toUpperCase(),
      role,
      workerName,
      email: email.toLowerCase(),
      workerPhoneNumber,
      password: hashedPassword,
      workerAddress,
      workerPhoto: workerPhotoUrl,
      workerIdProof: workerIdProofUrl,
      otp,
      otpExpiry,
      status: "pending",
    });

    await staff.save();

    // 7. Send OTP
    try {
      await sendOtpEmail(email, otp, workerName);
    } catch (mailErr) {
      console.error("OTP mail failed:", mailErr);
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful. OTP sent to your email.",
    });
  } catch (error) {
    console.error("staffRegister error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Server error" });
  }
};

export default staffRegister;
