// =========================
// Code Name: memberLogin.js
// =========================

import dotenv from "dotenv";
dotenv.config();

import memberModel from "../../../model/member.js";
import buildingModel from "../../../model/building.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const memberLogin = async (req, res) => {
  try {
    let { buildingCode, email, password, role } = req.body;

    // =========================
    // 1. ROLE VALIDATION
    // =========================
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Please select role",
      });
    }

    if (role !== "member") {
      return res.status(400).json({
        success: false,
        message: "Only member login is allowed",
      });
    }

    // =========================
    // 2. REQUIRED FIELDS
    // =========================
    if (!buildingCode || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    buildingCode = buildingCode.trim();
    email = email.trim().toLowerCase();

    // =========================
    // 3. BUILDING CHECK
    // =========================
    const building = await buildingModel.findOne({ buildingCode });

    if (!building) {
      return res.status(404).json({
        success: false,
        message: "Building code does not exist",
      });
    }

   if (!building.isActive) {
  return res.status(403).json({
    success: false,
    code: "BUILDING_INACTIVE",   // ✅ ADD
    message: "Building is inactive. Contact support.",
  });
}

    if (
      building.subscriptionStatus === "expired" ||
      building.subscriptionStatus === "blocked"
    ) {
      return res.status(403).json({
        success: false,
        code:
          building.subscriptionStatus === "blocked"
            ? "BUILDING_BLOCKED"
            : "SUBSCRIPTION_EXPIRED",
        message:
          building.subscriptionStatus === "blocked"
            ? "Building blocked. Contact support."
            : "Building subscription expired, please renew",
      });
    }

    // =========================
    // 4. MEMBER EXISTS CHECK
    // =========================
    const member = await memberModel
      .findOne({ email, buildingCode })
      .select("+password");

    if (!member) {
      // email hai but doosri building me
      const memberWithEmail = await memberModel.findOne({ email });

      if (memberWithEmail) {
        return res.status(401).json({
          success: false,
          message: "This member does not belong to this building",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid email",
      });
    }

    // =========================
    // 5. OTP VERIFICATION CHECK
    // =========================
    if (!member.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // =========================
    // 6. APPROVAL STATUS CHECK
    // =========================
    if (member.approvalStatus === "Pending") {
      return res.status(403).json({
        success: false,
        message: "Your account is pending admin approval",
      });
    }

    if (member.approvalStatus === "Rejected") {
      return res.status(403).json({
        success: false,
        message: "Your account has been rejected. Please contact admin",
      });
    }

    // =========================
    // 7. PASSWORD CHECK
    // =========================
    const isMatch = await bcrypt.compare(password, member.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // =========================
    // 8. GENERATE TOKEN
    // =========================
    const token = jwt.sign(
      {
        id: member._id,
        role: "member",
        buildingCode: member.buildingCode,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      member: {
        _id: member._id,
        fullName: member.fullName,
        email: member.email,
        primaryPhone: member.primaryPhone,
        memberType: member.memberType,
        memberStatus: member.memberStatus,
        buildingCode: member.buildingCode,
        buildingName: member.buildingName,
        unitNo: member.unitNo,
        role: member.role,
        approvalStatus: member.approvalStatus,
      },
    });
  } catch (error) {
    console.log("Member Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default memberLogin;
