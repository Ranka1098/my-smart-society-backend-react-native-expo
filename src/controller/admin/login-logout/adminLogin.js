import dotenv from "dotenv";
dotenv.config();

import adminModel from "../../../model/admin.js";
import buildingModel from "../../../model/building.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const adminLogin = async (req, res) => {
  try {
    let { buildingCode, email, password, role } = req.body;

    // =========================
    // 1️⃣ Role Validation
    // =========================
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Please select role",
      });
    }

    if (role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Only admin login is allowed",
      });
    }

    // =========================
    // 2️⃣ Required Fields
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
    // 3️⃣ Check Building Exists
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

    // =========================
    // 4️⃣ Check Admin Exists in That Building
    // =========================
    const admin = await adminModel.findOne({ email, buildingCode });

    if (!admin) {
      // Check email exists but in different building
      const adminWithEmail = await adminModel.findOne({ email });

      if (adminWithEmail) {
        return res.status(401).json({
          success: false,
          message: "This admin does not belong to this building",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid email",
      });
    }

    // =========================
    // 5️⃣ Check Verification
    // =========================
    if (!admin.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // =========================
    // 6️⃣ Password Check
    // =========================
    const isMatch = await bcrypt.compare(password, admin.password);

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
        id: admin._id,
        role: "admin",
        buildingId: building._id,
        buildingCode,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        _id: admin._id,
        adminName: admin.adminName,
        email: admin.email,
        buildingCode: admin.buildingCode,
        buildingId: building._id,
      },
    });
  } catch (error) {
    console.log("Admin Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default adminLogin;
