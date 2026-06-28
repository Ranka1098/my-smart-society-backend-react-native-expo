// controllers/member/addFamilyMember.js
import Member from "../../../model/member.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sendOtpEmail from "../../../utils/sendEmailOtp.js";

const addFamilyMember = async (req, res) => {
  try {
    const primaryMember = req.member;

    if (primaryMember.role !== "primary")
      return res.status(403).json({
        success: false,
        message: "Only primary member can add family",
      });

    const { fullName, primaryPhone, email, relation, password } = req.body;

    if (!fullName || !primaryPhone || !relation || !password || !email)
      return res.status(400).json({
        success: false,
        message: "fullName, primaryPhone, email, relation, password required",
      });

    if (!/^[0-9]{10}$/.test(primaryPhone))
      return res.status(400).json({
        success: false,
        message: "Phone 10 digits honi chahiye",
      });

    // =========================
    // UNVERIFIED → DELETE (retry support)
    // =========================
    const existingUnverified = await Member.findOne({
      $or: [{ primaryPhone }, { email: email.toLowerCase() }],
      isVerified: false,
      role: "family",
    });
    if (existingUnverified) {
      await Member.deleteOne({ _id: existingUnverified._id });
    }

    // =========================
    // VERIFIED DUPLICATE CHECK
    // =========================
    const verified = await Member.findOne({
      $or: [{ primaryPhone }, { email: email.toLowerCase() }],
      isVerified: true,
    });
    if (verified)
      return res.status(409).json({
        success: false,
        message: "Phone ya email already registered hai",
      });

    // =========================
    // UNIT FAMILY LIMIT
    // =========================
    const unitFamilyCount = await Member.countDocuments({
      buildingCode: primaryMember.buildingCode,
      unitNo: primaryMember.unitNo,
      role: "family",
      isVerified: true,
    });
    if (unitFamilyCount >= 5)
      return res.status(400).json({
        success: false,
        message: "Maximum 5 family members allowed per unit",
      });

    // =========================
    // OTP + PASSWORD
    // =========================
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);

    // =========================
    // CREATE FAMILY MEMBER
    // =========================
    const familyMember = await Member.create({
      memberType: primaryMember.memberType,
      memberStatus: primaryMember.memberStatus,
      buildingCode: primaryMember.buildingCode,
      buildingName: primaryMember.buildingName,
      unitNo: primaryMember.unitNo,
      shopName: primaryMember.shopName || null,
      ownerName: primaryMember.ownerName,
      ownerPhone: primaryMember.ownerPhone,
      renterName: primaryMember.renterName || null,
      renterPhone: primaryMember.renterPhone || null,
      fullName,
      primaryPhone,
      email: email.toLowerCase(),
      relation,
      password: hashedPassword,
      role: "family",
      approvalStatus: "Pending",
      isVerified: false,
      otp,
      otpExpires,
    });

    // =========================
    // SEND OTP EMAIL  ← fix here
    // =========================
    await sendOtpEmail(email.toLowerCase(), otp, "verify");

    return res.status(201).json({
      success: true,
      message: `OTP ${email} pe bheja gaya. Family member se verify karwao.`,
      familyMemberId: familyMember._id,
    });
  } catch (error) {
    console.error("addFamilyMember error:", error.message);
    if (error.code === 11000)
      return res.status(409).json({
        success: false,
        message: "Phone ya email already registered",
      });
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default addFamilyMember;