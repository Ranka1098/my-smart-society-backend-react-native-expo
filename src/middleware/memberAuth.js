// =========================
// Code Name: memberAuth.js
// =========================

import jwt from "jsonwebtoken";
import memberModel from "../model/member.js";

const memberAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.role !== "member") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const member = await memberModel
      .findOne({
        _id:          decoded.id,
        buildingCode: decoded.buildingCode,
      })
      .select("-password -otp -otpExpires -resetOtp -resetOtpExpiry -currentFcmToken");

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // =========================
    // APPROVAL CHECK — har request pe
    // =========================
    if (!member.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified",
      });
    }

    if (member.approvalStatus === "Pending") {
      return res.status(403).json({
        success: false,
        message: "Account pending admin approval",
      });
    }

    if (member.approvalStatus === "Rejected") {
      return res.status(403).json({
        success: false,
        message: "Account rejected. Contact admin",
      });
    }

    req.member       = member;
    req.buildingCode = decoded.buildingCode;

    next();
  } catch (error) {
    console.log("Member Auth Error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default memberAuth;