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
    // STEP 11 — FETCH EXISTING MEMBERS
    // ======================================================
    const existingMembers = await memberModel.find({
      buildingCode,
      $or: [{ email }, { primaryPhone }, { unitNo, memberType }],
    });

    // ======================================================
    // HELPER FUNCTION
    // ======================================================
    const findMember = (field, value, extraFilters = {}) => {
      return existingMembers.find((member) => {
        if (member[field] !== value) return false;
        return Object.entries(extraFilters).every(
          ([key, val]) => member[key] === val
        );
      });
    };

    // ======================================================
    // STEP 12 — APPROVED VALIDATIONS
    // ======================================================
    const approvedUnit = findMember("unitNo", unitNo, {
      memberType,
      isVerified: true,
      approvalStatus: "Approved",
    });

    if (approvedUnit) {
      return res.status(400).json({
        success: false,
        field: "unitNo",
        message: `This ${
          memberType === "Flat" ? "flat" : "shop"
        } no ${unitNo} is already registered`,
      });
    }

    const approvedEmail = findMember("email", email, {
      isVerified: true,
      approvalStatus: "Approved",
    });

    if (approvedEmail) {
      return res.status(400).json({
        success: false,
        field: "email",
        message: "This email is already registered",
      });
    }

    const approvedPhone = findMember("primaryPhone", primaryPhone, {
      isVerified: true,
      approvalStatus: "Approved",
    });

    if (approvedPhone) {
      return res.status(400).json({
        success: false,
        field: "primaryPhone",
        message: "This phone number is already registered",
      });
    }

    // ======================================================
    // STEP 13 — VERIFIED + PENDING VALIDATIONS
    // ======================================================
    const pendingVerifiedUnit = findMember("unitNo", unitNo, {
      memberType,
      isVerified: true,
      approvalStatus: "Pending",
    });

    if (pendingVerifiedUnit) {
      return res.status(400).json({
        success: false,
        field: "unitNo",
        message:
          "This flat/shop is already verified and waiting for admin approval",
      });
    }

    const pendingVerifiedEmail = findMember("email", email, {
      isVerified: true,
      approvalStatus: "Pending",
    });

    if (pendingVerifiedEmail) {
      return res.status(400).json({
        success: false,
        field: "email",
        message:
          "This email is already verified and waiting for admin approval",
      });
    }

    const pendingVerifiedPhone = findMember("primaryPhone", primaryPhone, {
      isVerified: true,
      approvalStatus: "Pending",
    });

    if (pendingVerifiedPhone) {
      return res.status(400).json({
        success: false,
        field: "primaryPhone",
        message:
          "This phone number is already verified and waiting for admin approval",
      });
    }

    // ======================================================
    // STEP 14 — UNVERIFIED PENDING VALIDATIONS
    // ======================================================

    // ---------- UNIT ----------
    const pendingUnverifiedUnit = findMember("unitNo", unitNo, {
      memberType,
      isVerified: false,
      approvalStatus: "Pending",
    });

    if (pendingUnverifiedUnit) {
      // SAME UNIT + DIFFERENT PHONE
      if (pendingUnverifiedUnit.primaryPhone !== primaryPhone) {
        return res.status(400).json({
          success: false,
          field: "unitNo",
          message: "This flat/shop already has a pending registration request",
        });
      }

      // SAME UNIT + SAME PHONE → UPDATE EXISTING REQUEST
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpireAt = new Date(Date.now() + OTP_EXPIRY_TIME); // ✅ variable

      pendingUnverifiedUnit.email = email;
      pendingUnverifiedUnit.password = hashedPassword;
      pendingUnverifiedUnit.ownerName = ownerName;
      pendingUnverifiedUnit.ownerPhone = ownerPhone;
      pendingUnverifiedUnit.renterName = renterName || null;
      pendingUnverifiedUnit.renterPhone = renterPhone || null;
      pendingUnverifiedUnit.fullName = fullName;
      pendingUnverifiedUnit.primaryPhone = primaryPhone;
      pendingUnverifiedUnit.shopName = shopName || null;
      pendingUnverifiedUnit.otp = otp;
      pendingUnverifiedUnit.otpExpireAt = otpExpireAt; // ✅ same variable use

      await pendingUnverifiedUnit.save();

      const emailSent = await sendEmail(email, otp, "verify");
      return res.status(200).json({
        success: true,
        message: emailSent
          ? "Details updated successfully. OTP sent to new email."
          : "Details updated, but OTP email failed to send. Try Resend OTP.",
        memberId: pendingUnverifiedUnit._id,
        otpExpireAt,
        emailSent,
      });
    }

    // ---------- EMAIL ----------
    const pendingUnverifiedEmail = findMember("email", email, {
      isVerified: false,
      approvalStatus: "Pending",
    });

    if (pendingUnverifiedEmail) {
      // SAME EMAIL + DIFFERENT PHONE
      if (pendingUnverifiedEmail.primaryPhone !== primaryPhone) {
        return res.status(400).json({
          success: false,
          field: "primaryPhone",
          message:
            "This email already has a pending request with another phone number",
        });
      }

      // SAME EMAIL + SAME PHONE → RESEND OTP FLOW
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpireAt = new Date(Date.now() + OTP_EXPIRY_TIME); // ✅ variable

      pendingUnverifiedEmail.password = hashedPassword;
      pendingUnverifiedEmail.otp = otp;
      pendingUnverifiedEmail.otpExpireAt = otpExpireAt; // ✅ same variable use

      await pendingUnverifiedEmail.save();

      const emailSent = await sendEmail(email, otp, "verify");
      return res.status(200).json({
        success: true,
        message: emailSent
          ? "OTP resent successfully. Please verify your email."
          : "Registered, but OTP email failed to send. Try Resend OTP.",
        memberId: pendingUnverifiedEmail._id,
        otpExpireAt,
        emailSent,
      });
    }

    // ---------- PHONE ----------
    const pendingUnverifiedPhone = findMember("primaryPhone", primaryPhone, {
      isVerified: false,
      approvalStatus: "Pending",
    });

    if (pendingUnverifiedPhone) {
      return res.status(400).json({
        success: false,
        field: "primaryPhone",
        message:
          "This phone number already has a pending request with another email",
      });
    }

    // ======================================================
    // STEP 15 — GENERATE OTP
    // ======================================================
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpireAt = new Date(Date.now() + OTP_EXPIRY_TIME);

    // ======================================================
    // STEP 16 — CREATE MEMBER
    // ======================================================
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

    // ======================================================
    // STEP 17 — SEND EMAIL
    // ======================================================
    const emailSent = await sendEmail(email, otp, "verify");

    // ======================================================
    // SUCCESS RESPONSE
    // ======================================================
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
    // DUPLICATE KEY ERROR
    // ======================================================
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];

      const messages = {
        unitNo: "This flat/shop  is already registered",
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
