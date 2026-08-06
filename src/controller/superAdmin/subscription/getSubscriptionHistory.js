// controller/subscription/getSubscriptionHistory.js

import Building from "../../../model/building.js";

export const getSubscriptionHistory = async (req, res) => {
  try {
    const { buildingCode } = req.params;
    if (!buildingCode) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode required" });
    }

    const building = await Building.findOne({ buildingCode })
      .select(
        "buildingCode buildingName subscriptionStatus subscriptionExpiry subscriptionHistory"
      )
      .populate("subscriptionHistory.transactionId");
    console.log("buildingCode:", buildingCode, "found:", !!building);
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    // ✅ newest first
    const history = [...building.subscriptionHistory].sort(
      (a, b) => new Date(b.changedAt) - new Date(a.changedAt)
    );
console.log("history length:", building.subscriptionHistory.length);
    return res.status(200).json({
      success: true,
      buildingCode: building.buildingCode,
      buildingName: building.buildingName,
      currentStatus: building.subscriptionStatus,
      currentExpiry: building.subscriptionExpiry,
      history,
    });
  } catch (err) {
    console.error("getSubscriptionHistory error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
