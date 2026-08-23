// controller/public/getPublicRenewalPreview.js
import Building from "../../../model/building.js";
import { getActiveUnitCounts } from "./getActiveUnitCounts.js";
import { RATE_PER_UNIT, calculateAmount } from "./Subscriptionconfig.js";

export const getPublicRenewalPreview = async (req, res) => {
  try {
    const { buildingCode } = req.params;

    const building = await Building.findOne({ buildingCode }).select(
      "buildingCode buildingName subscriptionStatus"
    );
    if (!building) {
      return res.status(404).json({ success: false, message: "Building not found" });
    }

    const { activeFlats, activeShops } = await getActiveUnitCounts(buildingCode);
    const amount = calculateAmount(activeFlats, activeShops);

    return res.status(200).json({
      success: true,
      buildingCode: building.buildingCode,
      buildingName: building.buildingName,
      activeFlats,
      activeShops,
      ratePerUnit: RATE_PER_UNIT,
      amount,
    });
  } catch (err) {
    console.error("getPublicRenewalPreview error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};