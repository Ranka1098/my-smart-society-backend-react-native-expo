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
import adminModel from "../../model/admin.js";
import memberModel from "../../model/member.js";
const generateOtp = () => crypto.randomInt(100000, 999999).toString();

// ✅ helper — compress + upload ek function mein, taaki Promise.all se
// dono photos (workerPhoto + workerIdProof) PARALLEL chal sakein
const compressAndUpload = async (file, maxWidth, folder) => {
  const compressed = await sharp(file.buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
  const uploaded = await uploadToCloudinary(compressed, folder);
  return uploaded.secure_url;
};

// ✅ helper — admin/member jaisa: util ka return value (true/false) use karo,
// throw ho to bhi false. Pehle fail par bhi emailSent: true ja sakta tha.
const trySendOtp = async (email, otp) => {
  try {
    return !!(await sendOtpEmail(email, otp, "verify"));
  } catch (e) {
    return false;
  }
};

// ✅ regex/validation constants — member/admin jaisa hi pattern
const emailRegex =
  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(com|in|org|net|co|edu|gov|io|dev|app)$/i;
const phoneRegex = /^[0-9]{10}$/;
const passwordRegex = /^.{4,20}$/;
const buildingCodeRegex = /^[A-Z0-9-]+$/i;
// naam ke liye (purana)
const gibberishRegex = /(.)\1{5,}|(..)\2{2,}|[^aeiou\s]{6,}/i;
// ✅ address ke liye — "1204/B-3" jaise valid address reject na ho
const addressGibberishRegex = /(.)\1{5,}|(..)\2{3,}/;
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
    // ✅ password trim HATAYA (login mein trim nahi hota)
    // ======================================================
    buildingCode = buildingCode?.trim();
    role = role?.trim().toLowerCase();
    workerName = workerName?.trim();
    email = email?.trim().toLowerCase();
    workerPhoneNumber = workerPhoneNumber?.trim();
    workerAddress = workerAddress?.trim();

    // ======================================================
    // STEP 2 — REQUIRED FIELDS
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
        message: "Password must be 4-20 characters",
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
    if (addressGibberishRegex.test(workerAddress)) {
      return res.status(400).json({
        success: false,
        field: "workerAddress",
        message: "Address looks invalid — please enter a real address",
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
    // STEP 6.5 — CROSS-ROLE: sirf VERIFIED admin/member block karega
    // ======================================================
    const [adminDup, memberDup] = await Promise.all([
      adminModel.findOne({
        isVerified: true,
        $or: [{ phone: workerPhoneNumber }, { email }],
      }),
      memberModel.findOne({
        isVerified: true,
        $or: [{ primaryPhone: workerPhoneNumber }, { email }],
      }),
    ]);

    if (adminDup || memberDup) {
      const dup = adminDup || memberDup;
      const dupRole = adminDup ? "admin" : "member";
      const isEmail = dup.email === email;
      return res.status(400).json({
        success: false,
        field: isEmail ? "email" : "workerPhoneNumber",
        message: `${isEmail ? "Email" : "Phone number"} is already registered as ${dupRole}`,
      });
    }

    // ✅ UNVERIFIED record hatao (pehle OTP verify karne wala jeete)
    await Promise.all([
      adminModel.deleteMany({
        isVerified: false,
        $or: [{ phone: workerPhoneNumber }, { email }],
      }),
      memberModel.deleteMany({
        isVerified: false,
        role: "primary",
        $or: [{ primaryPhone: workerPhoneNumber }, { email }],
      }),
      // dusre email ka unverified staff, wahi phone: unique index E11000 na de
      StaffModel.deleteMany({
        isEmailVerified: false,
        workerPhoneNumber,
        email: { $ne: email },
      }),
    ]);

    // ======================================================
    // STEP 7 — EMAIL UNIQUE (poori DB mein)
    // ✅ dusri building ka sirf VERIFIED staff block karega
    // ======================================================
    const existing = await StaffModel.findOne({ email });

    if (
      existing &&
      existing.isEmailVerified &&
      existing.buildingCode !== buildingCode.toUpperCase()
    ) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "This email is already registered",
      });
    }

    if (existing) {
      // ✅ rejected YA unverified — dono ek hi block: sab details naye se
      // (pehle unverified retry mein password/naam/address purane reh jate the)
      if (existing.status === "rejected" || !existing.isEmailVerified) {
        let workerPhotoUrl = existing.workerPhoto;
        let workerIdProofUrl = existing.workerIdProof;

        const [newPhotoUrl, newIdUrl] = await Promise.all([
          req.files?.workerPhoto?.[0]
            ? compressAndUpload(req.files.workerPhoto[0], 800, "staffPhotos")
            : Promise.resolve(null),
          req.files?.workerIdProof?.[0]
            ? compressAndUpload(
                req.files.workerIdProof[0],
                1200,
                "staffIdProofs",
              )
            : Promise.resolve(null),
        ]);
        if (newPhotoUrl) workerPhotoUrl = newPhotoUrl;
        if (newIdUrl) workerIdProofUrl = newIdUrl;

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOtp();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

        existing.buildingCode = buildingCode.toUpperCase();
        existing.buildingId = building._id;
        existing.role = role;
        existing.workerName = workerName;
        existing.workerPhoneNumber = workerPhoneNumber;
        existing.password = hashedPassword;
        existing.workerAddress = workerAddress;
        existing.workerPhoto = workerPhotoUrl;
        existing.workerIdProof = workerIdProofUrl;
        existing.otp = otp;
        existing.otpExpiry = otpExpiry;
        existing.isEmailVerified = false; // dobara verify karana hoga
        existing.status = "pending"; // reset
        existing.registeredAt = new Date(); // TTL reset
        await existing.save();

        const emailSent = await trySendOtp(email, otp);
        return res.status(200).json({
          success: true,
          message: emailSent
            ? "OTP resent to your email"
            : "OTP generated, but email failed to send",
          emailSent,
          otpExpireAt: otpExpiry,
        });
      }

      // verified + approved/pending, same building
      return res.status(409).json({
        success: false,
        message: "Staff already registered with this email",
      });
    }

    // ======================================================
    // STEP 8 — UPLOAD IMAGES (parallel)
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
    const emailSent = await trySendOtp(email, otp);
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
    // DUPLICATE KEY ERROR (unique index: email / workerPhoneNumber)
    // ======================================================
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      const fieldMessages = {
        email: "Staff already registered with this email",
        workerPhoneNumber: "Staff already registered with this phone number",
      };
      return res.status(400).json({
        success: false,
        field,
        message:
          fieldMessages[field] || "Duplicate entry — staff already exists",
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export default staffRegister;
