// FILE: controllers/member/getFamilyMembers.js

import Member from "../../../model/member.js";

const getFamilyMembers = async (req, res) => {
  try {
    const primaryMember = req.member;

    if (primaryMember.role !== "primary")
      return res
        .status(403)
        .json({
          success: false,
          message: "Only primary member can view family members",
        });

    const familyMembers = await Member.find({
      buildingCode: primaryMember.buildingCode,
      unitNo: primaryMember.unitNo,
      memberType: primaryMember.memberType,
      role: "family",
    }).select("fullName primaryPhone email relation approvalStatus createdAt");

    return res.status(200).json({
      success: true,
      count: familyMembers.length,
      familyMembers,
    });
  } catch (error) {
    console.error("getFamilyMembers Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getFamilyMembers;
