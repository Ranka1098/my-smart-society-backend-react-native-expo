// =========================
// Code Name: getAllMembers.js (Correct Approval Filter)
// =========================

import memberModel from "../../../model/member.js";

const getAllMembers = async (req, res) => {
  try {
    const buildingCode = req.buildingCode;

    const members = await memberModel
      .find({ buildingCode, approvalStatus: "Approved", isVerified: true })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    console.log("Get All Members Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default getAllMembers;
