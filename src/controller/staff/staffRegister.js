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

// ✅ helper — compress + upload ek function mein, taaki Promise.all se
// dono photos (workerPhoto + workerIdProof) PARALLEL chal sakein
// (pehle sequential the — ek ke baad ek — isliye register slow tha)
const compressAndUpload = async (file, maxWidth, folder) => {
  const compressed = await sharp(file.buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
  const uploaded = await uploadToCloudinary(compressed, folder);
  return uploaded.secure_url;
};

// ✅ regex/validation constants — member/admin jaisa hi pattern
const emailRegex =
  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(com|in|org|net|co|edu|gov|io|dev|app)$/i;
const phoneRegex = /^[0-9]{10}$/;
const passwordRegex = /^.{6,20}$/; // model minlength:6 se match
const buildingCodeRegex = /^[A-Z0-9-]+$/i;
const gibberishRegex = /(.)\1{5,}|(..)\2{2,}|[^aeiou\s]{6,}/i;
const validRoles = [
  "security",
  "cleaner",
  "plumber",
  "electrician",
  "gardener",
  "other",
];

// ─────────────────────────────────────────────────────────
// @route  POST /staffRegister
// @access Public
// ─────────────────────────────────────────────────────────
const staffRegister = async (req, res) => {
  try {
    let {
      buildingCode,
      role,
      workerName,
      email,
      workerPhoneNumber,
      password,
      workerAddress,
    } = req.body;

    // ======================================================
    // STEP 1 — NORMALIZE
    // ======================================================
    buildingCode = buildingCode?.trim();
    role = role?.trim().toLowerCase();
    workerName = workerName?.trim();
    email = email?.trim().toLowerCase();
    workerPhoneNumber = workerPhoneNumber?.trim();
    password = password?.trim();
    workerAddress = workerAddress?.trim();

    // ======================================================
    // STEP 2 — REQUIRED FIELDS
    // ✅ FIX — pehle ye check hi nahi tha, isliye buildingCode.toUpperCase()
    // ya email.toLowerCase() jaisi lines undefined pe crash (500) karti thi
    // ======================================================
    if (
      !buildingCode ||
      !role ||
      !workerName ||
      !email ||
      !workerPhoneNumber ||
      !password ||
      !workerAddress
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    if (!req.files?.workerPhoto || !req.files?.workerIdProof) {
      return res
        .status(400)
        .json({ success: false, message: "Photos required" });
    }

    // ======================================================
    // STEP 3 — FORMAT VALIDATIONS
    // ======================================================
    if (!buildingCodeRegex.test(buildingCode)) {
      return res.status(400).json({
        success: false,
        field: "buildingCode",
        message: "Invalid building code format",
      });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        field: "role",
        message: "Invalid role",
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "Invalid email format",
      });
    }

    if (!phoneRegex.test(workerPhoneNumber)) {
      return res.status(400).json({
        success: false,
        field: "workerPhoneNumber",
        message: "Phone number must be 10 digits",
      });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message: "Password must be 6-20 characters",
      });
    }

    // ======================================================
    // STEP 4 — GIBBERISH CHECK
    // ======================================================
    if (gibberishRegex.test(workerName)) {
      return res.status(400).json({
        success: false,
        field: "workerName",
        message: "Worker name looks invalid — please enter a real name",
      });
    }
    if (gibberishRegex.test(workerAddress)) {
      return res.status(400).json({
        success: false,
        field: "workerAddress",
        message: "Address looks invalid — please enter a real address",
      });
    }
    if (gibberishRegex.test(email)) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "Email looks invalid — please enter a real email",
      });
    }

    // ======================================================
    // STEP 5 — LENGTH LIMITS
    // ======================================================
    if (workerName.length < 3 || workerName.length > 50) {
      return res.status(400).json({
        success: false,
        field: "workerName",
        message: "Worker name must be 3-50 characters",
      });
    }
    if (workerAddress.length < 3 || workerAddress.length > 200) {
      return res.status(400).json({
        success: false,
        field: "workerAddress",
        message: "Address must be 3-200 characters",
      });
    }

    // ======================================================
    // STEP 6 — BUILDING EXISTS?
    // ======================================================
    const building = await BuildingModel.findOne({
      buildingCode: buildingCode.toUpperCase(),
    });
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building code not found" });
    }

    // ======================================================
    // STEP 7 — EMAIL UNIQUE PER BUILDING
    // ======================================================
    const existing = await StaffModel.findOne({
      email,
      buildingCode: buildingCode.toUpperCase(),
    });

    if (existing) {
      // pehle reject ho chuka hai to fresh registration jaisa treat karo
      if (existing.status === "rejected") {
        let workerPhotoUrl = existing.workerPhoto;
        let workerIdProofUrl = existing.workerIdProof;

        // ✅ FIX — pehle sequential tha (photo upload khatam hone ka wait,
        // phir ID upload shuru), ab Promise.all se dono ek saath chalte hain
        const [newPhotoUrl, newIdUrl] = await Promise.all([
          req.files?.workerPhoto?.[0]
            ? compressAndUpload(req.files.workerPhoto[0], 800, "staffPhotos")
            : Promise.resolve(null),
          req.files?.workerIdProof?.[0]
            ? compressAndUpload(
                req.files.workerIdProof[0],
                1200,
                "staffIdProofs"
              )
            : Promise.resolve(null),
        ]);
        if (newPhotoUrl) workerPhotoUrl = newPhotoUrl;
        if (newIdUrl) workerIdProofUrl = newIdUrl;

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOtp();

        existing.role = role;
        existing.workerName = workerName;
        existing.workerPhoneNumber = workerPhoneNumber;
        existing.password = hashedPassword;
        existing.workerAddress = workerAddress;
        existing.workerPhoto = workerPhotoUrl;
        existing.workerIdProof = workerIdProofUrl;
        existing.otp = otp;
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // ✅ variable banaya taaki response mein bhej sake
        existing.otpExpiry = otpExpiry;
        existing.isEmailVerified = false; // dobara verify karana hoga
        existing.status = "pending"; // reset

        await existing.save();

        let emailSent = true;
        try {
          await sendOtpEmail(email, otp, "verify");
        } catch (e) {
          emailSent = false;
        }
        return res.status(200).json({
          success: true,
          message: emailSent
            ? "OTP resent to your email"
            : "OTP generated, but email failed to send",
          emailSent,
          otpExpireAt: otpExpiry,
        });
      }

      if (!existing.isEmailVerified) {
        // ✅ FIX — parallel upload (Promise.all), pehle sequential tha
        const [newPhotoUrl, newIdUrl] = await Promise.all([
          req.files?.workerPhoto?.[0]
            ? compressAndUpload(req.files.workerPhoto[0], 800, "staffPhotos")
            : Promise.resolve(null),
          req.files?.workerIdProof?.[0]
            ? compressAndUpload(
                req.files.workerIdProof[0],
                1200,
                "staffIdProofs"
              )
            : Promise.resolve(null),
        ]);
        if (newPhotoUrl) existing.workerPhoto = newPhotoUrl;
        if (newIdUrl) existing.workerIdProof = newIdUrl;

        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // ✅ variable banaya taaki response mein bhej sake
        existing.otp = otp;
        existing.otpExpiry = otpExpiry;
        await existing.save();

        let emailSent = true;
        try {
          await sendOtpEmail(email, otp, "verify");
        } catch (e) {
          emailSent = false;
        }
        return res.status(200).json({
          success: true,
          message: emailSent
            ? "OTP resent to your email"
            : "OTP generated, but email failed to send",
          emailSent,
          otpExpireAt: otpExpiry,
        });
      }

      return res.status(409).json({
        success: false,
        message: "Staff already registered with this email",
      });
    }

    // ======================================================
    // STEP 8 — UPLOAD IMAGES
    // ✅ FIX — parallel upload (Promise.all), pehle sequential tha
    // ======================================================
    const [workerPhotoUrl, workerIdProofUrl] = await Promise.all([
      req.files?.workerPhoto?.[0]
        ? compressAndUpload(req.files.workerPhoto[0], 800, "staffPhotos")
        : Promise.resolve(null),
      req.files?.workerIdProof?.[0]
        ? compressAndUpload(req.files.workerIdProof[0], 1200, "staffIdProofs")
        : Promise.resolve(null),
    ]);

    // ======================================================
    // STEP 9 — HASH PASSWORD
    // ======================================================
    const hashedPassword = await bcrypt.hash(password, 10);

    // ======================================================
    // STEP 10 — GENERATE OTP
    // ======================================================
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // ======================================================
    // STEP 11 — SAVE STAFF
    // ======================================================
    const staff = new StaffModel({
      buildingCode: buildingCode.toUpperCase(),
      buildingId: building._id,
      role,
      workerName,
      email,
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

    // ======================================================
    // STEP 12 — SEND OTP
    // ======================================================
    let emailSent = true;
    try {
      await sendOtpEmail(email, otp, "verify");
    } catch (e) {
      emailSent = false;
    }
    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Registration successful. OTP sent to your email."
        : "Registered, but OTP email failed to send. Try Resend OTP.",
      emailSent,
      otpExpireAt: otpExpiry,
    });
  } catch (error) {
    console.error("staffRegister error:", error);

    // ======================================================
    // DUPLICATE KEY ERROR (unique index: email + buildingCode)
    // ======================================================
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Staff already registered with this email",
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export default staffRegister;
