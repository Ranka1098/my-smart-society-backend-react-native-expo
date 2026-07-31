// =========================
// Code Name: staffLogin.js
// =========================

import dotenv from "dotenv";
dotenv.config();

import StaffModel from "../../model/staff.js";
import buildingModel from "../../model/building.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const staffLogin = async (req, res) => {
  try {
    let { buildingCode, email, password } = req.body;

    // =========================
    // 1️⃣ Required Fields
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
    // 2️⃣ Check Building Exists
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
        message: "Building is inactive",
      });
    }

// ✅ ADD THIS — missing check
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
    // 3️⃣ Check Staff Exists in That Building
    // =========================
    const staff = await StaffModel.findOne({ email, buildingCode });

    if (!staff) {
      const staffWithEmail = await StaffModel.findOne({ email });

      if (staffWithEmail) {
        return res.status(401).json({
          success: false,
          message: "This staff does not belong to this building",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid email",
      });
    }

    // =========================
    // 4️⃣ Email Verified Check
    // =========================
    if (!staff.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    if (staff.role !== "security") {
      return res.status(403).json({
        success: false,
        message: "Login access is only available for security guards",
      });
    }
    // =========================
    // 5️⃣ Approval Status Check
    // =========================
    if (staff.status === "pending") {
      return res.status(403).json({
        success: false,
        message: "Your account is pending admin approval",
      });
    }

    if (staff.status === "rejected") {
      return res.status(403).json({
        success: false,
        message: `Your account has been rejected${
          staff.rejectionReason ? `: ${staff.rejectionReason}` : ""
        }`,
      });
    }

    // =========================
    // 6️⃣ Password Check
    // =========================
    const isMatch = await bcrypt.compare(password, staff.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // =========================
    // 7️⃣ Generate Token
    // =========================
    const token = jwt.sign(
      {
        id: staff._id,
        role: staff.role,
        buildingId: building._id,
        buildingName: building.buildingName,
        buildingCode,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      staff: {
        _id: staff._id,
        workerName: staff.workerName,
        email: staff.email,
        role: staff.role,
        buildingCode: staff.buildingCode,
        buildingId: building._id,
        buildingName: building.buildingName,
        workerPhoto: staff.workerPhoto,
        joiningDate: staff.joiningDate,
        status: staff.status,
      },
    });
  } catch (error) {
    console.log("Staff Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default staffLogin;
