// =========================
// Code Name: memberRegister.js
// =========================

import bcrypt from "bcrypt";
import crypto from "crypto";

import memberModel from "../../../model/member.js";
import buildingModel from "../../../model/building.js";
import sendEmail from "../../../utils/sendEmailOtp.js";

const OTP_EXPIRY_TIME = 5 * 60 * 1000;

// ======================================================
// MEMBER REGISTER
// ======================================================
export const memberRegister = async (req, res) => {
  try {
    let {
      memberType,
      memberStatus,
      buildingCode,
      unitNo,
      shopName,
      ownerName,
      ownerPhone,
      renterName,
      renterPhone,
      email,
      password,
    } = req.body;

    // ======================================================
    // STEP 1 — NORMALIZE INPUTS
    // ======================================================
    email = email?.toLowerCase().trim();
    password = password?.trim();

    buildingCode = buildingCode?.trim();
    unitNo = unitNo?.trim();
    shopName = shopName?.trim();

    ownerName = ownerName?.trim();
    ownerPhone = ownerPhone?.trim();

    renterName = renterName?.trim();
    renterPhone = renterPhone?.trim();

    // ======================================================
    // STEP 2 — REQUIRED FIELDS
    // ======================================================
    if (
      !memberType ||
      !memberStatus ||
      !buildingCode ||
      !unitNo ||
      !email ||
      !password ||
      !ownerName ||
      !ownerPhone
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    // ======================================================
    // STEP 3 — VALID ENUMS
    // ======================================================
    const validMemberTypes = ["Flat", "Shop"];
    const validMemberStatuses = ["Owner", "Rent"];

    if (!validMemberTypes.includes(memberType)) {
      return res.status(400).json({
        success: false,
        field: "memberType",
        message: "Invalid member type",
      });
    }

    if (!validMemberStatuses.includes(memberStatus)) {
      return res.status(400).json({
        success: false,
        field: "memberStatus",
        message: "Invalid member status",
      });
    }

    // ======================================================
    // STEP 4 — REGEX VALIDATIONS
    // ======================================================
    const emailRegex =
      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(com|in|org|net|co|edu|gov|io|dev|app)$/i;

    const passwordRegex = /^.{4,20}$/;

    const phoneRegex = /^[0-9]{10}$/;
    const unitNoRegex = /^[A-Z0-9]+$/i;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "Invalid email format",
      });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        field: "password",
        message:
          "Password must contain uppercase, lowercase, number and special character",
      });
    }

    if (!unitNoRegex.test(unitNo)) {
      return res.status(400).json({
        success: false,
        field: "unitNo",
        message: "Unit/Shop number can only contain letters and numbers",
      });
    }

    // ======================================================
    // STEP 4.5 — GIBBERISH CHECK
    // ======================================================
    const gibberishRegex = /(.)\1{5,}|(..)\2{3,}/;

    if (gibberishRegex.test(ownerName)) {
      return res.status(400).json({
        success: false,
        field: "ownerName",
        message: "Owner name looks invalid — please enter a real name",
      });
    }
    if (renterName && gibberishRegex.test(renterName)) {
      return res.status(400).json({
        success: false,
        field: "renterName",
        message: "Renter name looks invalid — please enter a real name",
      });
    }
    if (shopName && gibberishRegex.test(shopName)) {
      return res.status(400).json({
        success: false,
        field: "shopName",
        message: "Shop name looks invalid — please enter a real name",
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
    // STEP 4.6 — LENGTH LIMITS
    // ======================================================
    if (ownerName.length > 50) {
      return res.status(400).json({
        success: false,
        field: "ownerName",
        message: "Owner name too long (max 50 characters)",
      });
    }
    if (renterName && renterName.length > 50) {
      return res.status(400).json({
        success: false,
        field: "renterName",
        message: "Renter name too long (max 50 characters)",
      });
    }
    if (shopName && shopName.length > 50) {
      return res.status(400).json({
        success: false,
        field: "shopName",
        message: "Shop name too long (max 50 characters)",
      });
    }
    if (unitNo.length > 20) {
      return res.status(400).json({
        success: false,
        field: "unitNo",
        message: "Unit number too long (max 20 characters)",
      });
    }
    if (email.length > 50) {
      return res
        .status(400)
        .json({ success: false, field: "email", message: "Email too long" });
    }

    // ======================================================
    // STEP 5 — OWNER VALIDATION
    // ======================================================
    if (!ownerName || !ownerPhone) {
      return res.status(400).json({
        success: false,
        message: "Owner details are required",
      });
    }

    if (!phoneRegex.test(ownerPhone)) {
      return res.status(400).json({
        success: false,
        field: "ownerPhone",
        message: "Invalid owner phone number",
      });
    }

    // ======================================================
    // STEP 6 — TENANT VALIDATION
    // ======================================================
    if (memberStatus === "Rent") {
      if (!renterName || !renterPhone) {
        return res.status(400).json({
          success: false,
          message: "Renter details are required",
        });
      }

      if (!phoneRegex.test(renterPhone)) {
        return res.status(400).json({
          success: false,
          field: "renterPhone",
          message: "Invalid renter phone number",
        });
      }
    }

    // ======================================================
    // STEP 7 — SHOP VALIDATION
    // ======================================================
    if (memberType === "Shop" && !shopName) {
      return res.status(400).json({
        success: false,
        field: "shopName",
        message: "Shop name is required",
      });
    }

    // ======================================================
    // STEP 8 — RESOLVE NAME + PHONE
    // ======================================================
    const fullName = memberStatus === "Owner" ? ownerName : renterName;
    const primaryPhone = memberStatus === "Owner" ? ownerPhone : renterPhone;

    // ======================================================
    // STEP 9 — BUILDING VALIDATION
    // ======================================================
    const building = await buildingModel.findOne({
      buildingCode,
      isActive: true,
    });

    if (!building) {
      return res.status(400).json({
        success: false,
        field: "buildingCode",
        message: "building code not exits plss enter correct building code",
      });
    }

    // ======================================================
    // STEP 10 — HASH PASSWORD
    // ======================================================
    const hashedPassword = await bcrypt.hash(password, 10);

    // ======================================================
    // STEP 11 — UNIT ALREADY REGISTERED? (approved or already occupied)
    // Ek unit ka sirf ek hi active record hona chahiye is building me
    // ======================================================
    const unitRecord = await memberModel.findOne({
      buildingCode,
      unitNo,
      memberType,
    });

    if (unitRecord) {
      // ---------- SAME UNIT + PENDING + SAME EMAIL/PHONE + UNVERIFIED ----------
      // ✅ RULE — OTP verify nahi kiya, wapas same credential se retry allowed
      const isSamePerson =
        unitRecord.approvalStatus === "Pending" &&
        !unitRecord.isVerified &&
        unitRecord.email === email &&
        unitRecord.primaryPhone === primaryPhone;

      if (!isSamePerson) {
        return res.status(400).json({
          success: false,
          field: "unitNo",
          message: `This ${
            memberType === "Flat" ? "flat" : "shop"
          } no ${unitNo} already has a registration for this building`,
        });
      }

      // ✅ RESEND OTP — same person, same unit, same email/phone, unverified
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpireAt = new Date(Date.now() + OTP_EXPIRY_TIME);

      unitRecord.memberStatus = memberStatus;
      unitRecord.shopName = shopName || null;
      unitRecord.ownerName = ownerName;
      unitRecord.ownerPhone = ownerPhone;
      unitRecord.renterName = renterName || null;
      unitRecord.renterPhone = renterPhone || null;
      unitRecord.fullName = fullName;
      unitRecord.password = hashedPassword;
      unitRecord.otp = otp;
      unitRecord.otpExpireAt = otpExpireAt;

      await unitRecord.save();

      const emailSent = await sendEmail(email, otp, "verify");
      return res.status(200).json({
        success: true,
        message: emailSent
          ? "OTP resent successfully."
          : "Details updated, but OTP email failed to send. Try Resend OTP.",
        memberId: unitRecord._id,
        otpExpireAt,
        emailSent,
      });
    }

    // ======================================================
    // STEP 12 — EMAIL ALREADY USED IN THIS BUILDING? (permanent, any status)
    // Ek email is building me sirf ek hi member ke liye use ho sakta hai — hamesha ke liye
    // ======================================================
    const emailUsed = await memberModel.findOne({ buildingCode, email });

    if (emailUsed) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "This email is already used in this society",
      });
    }

    // ======================================================
    // STEP 13 — PHONE ALREADY USED IN THIS BUILDING? (permanent, any status)
    // ======================================================
    const phoneUsed = await memberModel.findOne({
      buildingCode,
      primaryPhone,
    });

    if (phoneUsed) {
      return res.status(400).json({
        success: false,
        field: "primaryPhone",
        message: "This phone number is already used in this society",
      });
    }

    // ======================================================
    // STEP 14 — FRESH REGISTRATION (naya unit, naya email, naya phone)
    // ======================================================
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpireAt = new Date(Date.now() + OTP_EXPIRY_TIME);

    const member = await memberModel.create({
      memberType,
      memberStatus,

      buildingCode,
      buildingName: building.buildingName,
      buildingId: building._id,
      unitNo,
      shopName: shopName || null,

      ownerName,
      ownerPhone,

      renterName: renterName || null,
      renterPhone: renterPhone || null,

      fullName,
      primaryPhone,

      email,
      password: hashedPassword,

      otp,
      otpExpireAt,

      isVerified: false,
      approvalStatus: "Pending",

      role: "primary",
    });

    const emailSent = await sendEmail(email, otp, "verify");

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Registered successfully. Please verify OTP."
        : "Registered, but OTP email failed to send. Try Resend OTP.",
      memberId: member._id,
      otpExpireAt,
      emailSent,
    });
  } catch (error) {
    console.error("Member Register Error:", error);

    // ======================================================
    // DUPLICATE KEY ERROR (safety net — DB-level unique index)
    // ======================================================
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];

      const messages = {
        unitNo: "This flat/shop is already registered",
        email: "This email is already registered",
        primaryPhone: "This phone number is already registered",
      };

      return res.status(400).json({
        success: false,
        message: messages[field] || "Duplicate record found",
      });
    }

    // ======================================================
    // INTERNAL SERVER ERROR
    // ======================================================
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export default memberRegister;
