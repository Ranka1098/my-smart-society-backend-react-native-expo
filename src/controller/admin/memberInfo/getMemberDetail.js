// =========================
// Code Name: getMemberFullDetails.js (Only Member Detail)
// =========================

import memberModel from "../../../model/member.js";

const getMemberFullDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const buildingCode = req.buildingCode;

    const member = await memberModel.findOne({
      _id: id,
      buildingCode,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.status(200).json({
      success: true,
      member,
    });
  } catch (error) {
    console.log("Get Member Full Details Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default getMemberFullDetails;