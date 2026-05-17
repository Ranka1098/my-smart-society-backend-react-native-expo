// =========================
// Code Name: getMemberProfile.js
// =========================

import buildingModel from "../../../model/building.js";

const getMemberProfile = async (req, res) => {
  try {
    // buildingCode memberAuth middleware se aata hai
    const building = await buildingModel.findOne({
      buildingCode: req.buildingCode,
    });

    return res.status(200).json({
      success: true,
      message: "Member profile fetched successfully",
      member: {
        ...req.member._doc,
        building: building || null,
      },
    });

  } catch (error) {
    console.log("Get Member Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default getMemberProfile;