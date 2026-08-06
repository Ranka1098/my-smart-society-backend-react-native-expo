// controller/superAdmin/subscription/getRenewalPreview.js
// Renew se pehle amount preview dikhane ke liye — active flats/shops * rate

import Building from "../../../model/building.js";
import { getActiveUnitCounts } from "../../../controller/superAdmin/subscription/getActiveUnitCounts.js";
import {
  RATE_PER_UNIT,
  calculateAmount,
} from "../../../controller/superAdmin/subscription/Subscriptionconfig.js";

export const getRenewalPreview = async (req, res) => {
  try {
    const { buildingId } = req.params;

    const building = await Building.findById(buildingId).select(
      "buildingCode buildingName subscriptionStatus"
    );
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    const { activeFlats, activeShops } = await getActiveUnitCounts(
      building.buildingCode
    );
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
    console.error("getRenewalPreview error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
