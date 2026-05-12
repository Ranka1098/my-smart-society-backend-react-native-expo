import buildingModel from "../../../model/building.js";

const getAdminProfile = async (req, res) => {
  try {
    // ✅ buildingCode from middleware (decoded token)
    const building = await buildingModel.findOne({
      buildingCode: req.buildingCode,
    });

    return res.status(200).json({
      success: true,
      message: "Admin profile fetched successfully",
      admin: {
        ...req.admin._doc,
        building: building || null,
      },
    });
  } catch (error) {
    console.log("Get Admin Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export default getAdminProfile;