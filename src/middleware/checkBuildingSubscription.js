// middleware/checkBuildingSubscription.js
import Building from "../model/building.js";

const checkBuildingSubscription = async (req, res, next) => {
  try {
    const buildingCode =
      req.admin?.buildingCode || req.member?.buildingCode || req.buildingCode;

    const building = await Building.findOne({ buildingCode });
    if (!building)
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });

    if (building.subscriptionStatus === "blocked")
      return res.status(403).json({
        success: false,
        code: "BUILDING_BLOCKED",
        message: "Building blocked",
      });

    if (
      building.subscriptionStatus === "expired" ||
      (building.subscriptionExpiry && building.subscriptionExpiry < new Date())
    ) {
      building.subscriptionStatus = "expired";
      await building.save();
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_EXPIRED",
        message: "Building subscription expired, please renew",
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export default checkBuildingSubscription;
