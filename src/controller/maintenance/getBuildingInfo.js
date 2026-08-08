// controller/admin/getBuildingInfo.js
import Building from "../../model/building.js";

export const getBuildingInfo = async (req, res) => {
  try {
    const building = await Building.findOne({
      buildingCode: req.buildingCode,
    }).select("createdAt registeredAt buildingName");

    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    return res.status(200).json({
      success: true,
      building: {
        createdAt: building.registeredAt || building.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};