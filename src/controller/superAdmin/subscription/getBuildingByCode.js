// controller/superAdmin/subscription/getBuildingByCode.js
// buildingCode se poori building detail nikalta — superadmin ya admin dono use kar sakte.

import Building from "../../../model/building.js";

const getBuildingByCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Building code required" });
    }

    const building = await Building.findOne({ buildingCode: code })
      .populate("admin", "adminName email phone") // admin ke sirf zaroori fields
      .populate("subscriptionHistory.transactionId");

    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    return res.status(200).json({
      success: true,
      building,
    });
  } catch (err) {
    console.error("getBuildingByCode error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default getBuildingByCode;
