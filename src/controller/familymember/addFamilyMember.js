// controllers/member/addFamilyMember.js
import Member from "../../model/member.js";
import adminModel from "../../model/admin.js";
import StaffModel from "../../model/staff.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sendOtpEmail from "../../utils/sendEmailOtp.js";

const emailRegex =
  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.(com|in|org|net|co|edu|gov|io|dev|app)$/i;
const phoneRegex = /^[0-9]{10}$/;
const passwordRegex = /^.{4,20}$/;

const addFamilyMember = async (req, res) => {
  try {
    const primaryMember = req.member;

    if (primaryMember.role !== "primary")
      return res.status(403).json({
        success: false,
        message: "Only primary member can add family",
      });

    let { fullName, primaryPhone, email, relation, password } = req.body;

    // =========================
    // NORMALIZE (password trim NAHI — login mein trim nahi hota)
    // =========================
    fullName = fullName?.trim();
    primaryPhone = primaryPhone?.trim();
    email = email?.trim().toLowerCase();
    relation = relation?.trim();

    if (!fullName || !primaryPhone || !relation || !password || !email)
      return res.status(400).json({
        success: false,
        message: "fullName, primaryPhone, email, relation, password required",
      });

    // =========================
    // VALIDATION
    // =========================
    if (!phoneRegex.test(primaryPhone))
      return res.status(400).json({
        success: false,
        message: "Phone 10 digits honi chahiye",
      });

    if (!emailRegex.test(email) || email.length > 100)
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });

    if (!passwordRegex.test(password))
      return res.status(400).json({
        success: false,
        message: "Password must be 4-20 characters",
      });

    if (fullName.length < 2 || fullName.length > 50)
      return res.status(400).json({
        success: false,
        message: "Name must be 2-50 characters",
      });

    // =========================
    // CROSS-ROLE: sirf VERIFIED member/admin/staff block karega
    // =========================
    const [memberDup, adminDup, staffDup] = await Promise.all([
      Member.findOne({
        isVerified: true,
        $or: [{ primaryPhone }, { email }],
      }),
      adminModel.findOne({
        isVerified: true,
        $or: [{ phone: primaryPhone }, { email }],
      }),
      StaffModel.findOne({
        isEmailVerified: true,
        $or: [{ workerPhoneNumber: primaryPhone }, { email }],
      }),
    ]);

    if (memberDup || adminDup || staffDup) {
      const dupRole = memberDup ? "member" : adminDup ? "admin" : "staff";
      return res.status(409).json({
        success: false,
        message: `Phone ya email already registered as ${dupRole}`,
      });
    }

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
    // UNVERIFIED → DELETE (retry support + last-registrant-wins)
    // member wala delete primary/family dono ko hatata hai, warna unverified
    // primary ke email/phone par unique index E11000 dega
    // =========================
    await Promise.all([
      Member.deleteMany({
        isVerified: false,
        $or: [{ primaryPhone }, { email }],
      }),
      adminModel.deleteMany({
        isVerified: false,
        $or: [{ phone: primaryPhone }, { email }],
      }),
      StaffModel.deleteMany({
        isEmailVerified: false,
        $or: [{ workerPhoneNumber: primaryPhone }, { email }],
      }),
    ]);

    // =========================
    // OTP + PASSWORD
    // =========================
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpireAt = new Date(Date.now() + 10 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);

    // =========================
    // CREATE FAMILY MEMBER
    // =========================
    const familyMember = await Member.create({
      memberType: primaryMember.memberType,
      memberStatus: primaryMember.memberStatus,
      buildingCode: primaryMember.buildingCode,
      buildingId: primaryMember.buildingId,
      buildingName: primaryMember.buildingName,
      unitNo: primaryMember.unitNo,
      shopName: primaryMember.shopName || null,
      ownerName: primaryMember.ownerName,
      ownerPhone: primaryMember.ownerPhone,
      renterName: primaryMember.renterName || null,
      renterPhone: primaryMember.renterPhone || null,
      fullName,
      primaryPhone,
      email,
      relation,
      password: hashedPassword,
      role: "family",
      approvalStatus: "Pending",
      isVerified: false,
      otp,
      otpExpireAt, // ✅ model ka field. Pehle `otpExpires` tha, schema mein hai hi nahi
    });

    // =========================
    // SEND OTP EMAIL
    // =========================
    const emailSent = await sendOtpEmail(email, otp, "verify");

    return res.status(201).json({
      success: true,
      message: emailSent
        ? `OTP ${email} pe bheja gaya. Family member se verify karwao.`
        : "Family member add hua, par OTP email fail hua. Resend OTP try karo.",
      emailSent,
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
