// =========================
// Code Name: memberRegisterController.js
// =========================

import bcrypt from "bcrypt";
import crypto from "crypto";

import memberModel from "../../../model/member.js";
import buildingModel from "../../../model/building.js";
import sendEmail from "../../../utils/sendEmailOtp.js";

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

    // =========================
    // NORMALIZE DATA
    // =========================
    email = email?.toLowerCase().trim();
    ownerPhone = ownerPhone?.trim();
    renterPhone = renterPhone?.trim();
    unitNo = unitNo?.trim();
    buildingCode = buildingCode?.trim();

    // =========================
    // REQUIRED FIELD CHECK
    // =========================
    if (
      !memberType ||
      !memberStatus ||
      !buildingCode ||
      !unitNo ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    // =========================
    // VALID COMBINATION CHECK
    // =========================
    const validCombinations = [
      { memberType: "Flat", memberStatus: "Owner" },
      { memberType: "Flat", memberStatus: "Tenant" },
      { memberType: "Shop", memberStatus: "Owner" },
      { memberType: "Shop", memberStatus: "Tenant" },
    ];

    const isValidCombination = validCombinations.some(
      (item) =>
        item.memberType === memberType && item.memberStatus === memberStatus
    );

    if (!isValidCombination) {
      return res.status(400).json({
        success: false,
        message: "Invalid member type or member status",
      });
    }

    // =========================
    // BUILDING CHECK
    // =========================
    const building = await buildingModel.findOne({
      buildingCode,
      isActive: true,
    });

    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Building not found",
      });
    }

    // =========================
    // SHOP VALIDATION
    // =========================
    if (memberType === "Shop" && !shopName) {
      return res.status(400).json({
        success: false,
        message: "Shop name is required",
      });
    }

    // =========================
    // OWNER VALIDATION
    // =========================
    if (!ownerName || !ownerPhone) {
      return res.status(400).json({
        success: false,
        message: "Owner details are required",
      });
    }

    // =========================
    // TENANT VALIDATION
    // =========================
    if (memberStatus === "Tenant" && (!renterName || !renterPhone)) {
      return res.status(400).json({
        success: false,
        message: "Renter details are required",
      });
    }

    // =========================
    // EMAIL VALIDATION
    // =========================
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // =========================
    // PASSWORD VALIDATION
    // =========================
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,20}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain uppercase, lowercase, number and special character",
      });
    }

    // =========================
    // PHONE VALIDATION
    // =========================
    const phoneRegex = /^[0-9]{10}$/;

    if (!phoneRegex.test(ownerPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid owner phone number",
      });
    }

    if (memberStatus === "Tenant" && !phoneRegex.test(renterPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid renter phone number",
      });
    }

    // =========================
    // FULL NAME + PRIMARY PHONE
    // =========================
    const fullName = memberStatus === "Owner" ? ownerName : renterName;
    const primaryPhone = memberStatus === "Owner" ? ownerPhone : renterPhone;

    // =========================
    // EMAIL ALREADY EXISTS
    // =========================
    const existingEmail = await memberModel.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // =========================
    // PHONE ALREADY EXISTS
    // =========================
    const existingPhone = await memberModel.findOne({ primaryPhone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone already registered",
      });
    }

    // =========================
    // HASH PASSWORD
    // =========================
    const hashedPassword = await bcrypt.hash(password, 10);

    // =========================
    // GENERATE OTP
    // =========================
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    // =========================
    // CREATE MEMBER
    // buildingId nahi — OTP verify pe unit check hoga
    // =========================
    const member = await memberModel.create({
      memberType,
      memberStatus,

      buildingCode,
      buildingName: building.buildingName,

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
      otpExpires,

      isVerified: false,
      approvalStatus: "Pending",
      role: "primary",
    });

    // =========================
    // SEND OTP
    // =========================
  await sendEmail({
  to: email,
  subject: "Verify OTP",
  text: `Your OTP is ${otp}`,
});

// BAAD
await sendEmail(email, otp, "verify");

    return res.status(201).json({
      success: true,
      message: "Member registered successfully. Please verify OTP.",
      memberId: member._id,
    });
  } catch (error) {
    // memberRegisterController.js — catch block me
    console.log("Member Register Error FULL:", JSON.stringify(error, null, 2));
    console.log("Error Message:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export default memberRegister;
