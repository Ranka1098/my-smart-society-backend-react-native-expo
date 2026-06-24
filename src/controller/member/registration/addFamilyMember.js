// FILE: controllers/member/addFamilyMember.js

import Member from "../../../model/member.js";
import bcrypt from "bcryptjs";

const addFamilyMember = async (req, res) => {
  try {
    const { buildingCode, member: primaryMember } = req;
    // req.member = primary logged-in member (auth middleware se)

    const { fullName, primaryPhone, email, relation, password } = req.body;

    // ── Validation ──
    if (!fullName || !primaryPhone || !relation || !password)
      return res.status(400).json({
        success: false,
        message: "fullName, primaryPhone, relation, password required",
      });

    if (!/^[0-9]{10}$/.test(primaryPhone))
      return res
        .status(400)
        .json({ success: false, message: "Phone must be 10 digits" });

    // ── Primary check ──
    if (primaryMember.role !== "primary")
      return res.status(403).json({
        success: false,
        message: "Only primary member can add family members",
      });

    // ── Duplicate phone check ──
    const existing = await Member.findOne({ primaryPhone });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: "Phone already registered" });

    // ── Hash password ──
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Create family member ──
    const familyMember = await Member.create({
      // Inherit from primary
      memberType: primaryMember.memberType,
      memberStatus: primaryMember.memberStatus,
      buildingCode: primaryMember.buildingCode,
      buildingName: primaryMember.buildingName,
      unitNo: primaryMember.unitNo,
      shopName: primaryMember.shopName,
      ownerName: primaryMember.ownerName,
      ownerPhone: primaryMember.ownerPhone,
      renterName: primaryMember.renterName,
      renterPhone: primaryMember.renterPhone,

      // Family specific
      fullName,
      primaryPhone,
      email: email || null,
      relation,
      password: hashedPassword,
      role: "family",
      approvalStatus: "Approved", // primary approve kar raha hai directly
      isVerified: true,
    });

    return res.status(201).json({
      success: true,
      message: "Family member added successfully",
      familyMember: {
        _id: familyMember._id,
        fullName: familyMember.fullName,
        relation: familyMember.relation,
        primaryPhone: familyMember.primaryPhone,
      },
    });
  } catch (error) {
    console.error("addFamilyMember Error:", error.message);
    if (error.code === 11000)
      return res
        .status(409)
        .json({ success: false, message: "Phone or email already registered" });
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default addFamilyMember;
