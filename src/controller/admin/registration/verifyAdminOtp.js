// =========================
// Code Name: verifyAdminOtp.js
// =========================

import mongoose from "mongoose";
import adminModel from "../../../model/admin.js";
import buildingModel from "../../../model/building.js";
import sendBuildingCode from "../../../utils/sendBuildingCode.js";

// ==============================
// 🔹 Generate Unique Building Code
// ==============================
const generateBuildingCode = async (name, pincode) => {
  if (!name || !pincode) {
    throw new Error("Building name and pincode required");
  }

  const namePart = name.replace(/\s+/g, "").toUpperCase().slice(0, 2);
  const pinPart = String(pincode).slice(-3);

  let buildingCode;
  let attempt = 0;

  while (attempt < 10) {
    const now = new Date();

    const timePart =
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(Math.floor(Math.random() * 10));

    buildingCode = `${namePart}${pinPart}-${timePart}`;

    const exists = await buildingModel.findOne({ buildingCode });
    if (!exists) return buildingCode;

    attempt++;
  }

  throw new Error("Unable to generate unique building code");
};

// ==============================
// 🔹 VERIFY ADMIN OTP + CREATE BUILDING
// ==============================
const verifyAdminOtp = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let { email, otp } = req.body;

    // =========================
    // VALIDATION
    // =========================
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    email = email.trim().toLowerCase();
    otp = otp.trim();

    session.startTransaction();

    // =========================
    // FIND ADMIN
    // =========================
    const admin = await adminModel.findOne({ email }).session(session);

    if (!admin) throw new Error("Admin not found");

    if (admin.isVerified) throw new Error("Account already verified");

    if (!admin.otp || !admin.otpExpireAt) throw new Error("OTP not generated");

    if (admin.otp !== otp) throw new Error("Invalid OTP");

    if (Date.now() > new Date(admin.otpExpireAt).getTime()) {
      admin.otp = null;
      admin.otpExpireAt = null;
      await admin.save({ session });

      throw new Error("OTP expired");
    }

    // =========================
    // 🔥 GENERATE BUILDING CODE
    // =========================
    const buildingCode = await generateBuildingCode(
      admin.buildingName,
      admin.pincode
    );

    // =========================
    // 🏢 CREATE BUILDING
    // =========================
    const [buildingDoc] = await buildingModel.create(
      [
        {
          buildingCode,
          buildingName: admin.buildingName,
          chairmanName: admin.adminName,
          chairmanPhone: admin.phone,
          admin: admin._id,
          totalFlats: admin.pendingTotalFlats || 0,
          totalShops: admin.pendingTotalShops || 0,
          isActive: true,
        },
      ],
      { session }
    );

    // =========================
    // ✅ UPDATE ADMIN
    // =========================
    admin.isVerified = true;
    admin.isAdmin = true;

    admin.buildingId = buildingDoc._id;
    admin.buildingCode = buildingCode;

    admin.pendingTotalFlats = 0;
    admin.pendingTotalShops = 0;

    admin.otp = null;
    admin.otpExpireAt = null;

    await admin.save({ session });

    // =========================
    // ✅ COMMIT TRANSACTION
    // =========================
    await session.commitTransaction();
    session.endSession();

    // =========================
    // 📧 SEND BUILDING CODE EMAIL (NON BLOCKING)
    // =========================
    sendBuildingCode(admin.email, buildingCode).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. Building created.",
      buildingCode,
      buildingId: buildingDoc._id,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.log("Verify OTP Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Verification failed",
    });
  }
};

export default verifyAdminOtp;
