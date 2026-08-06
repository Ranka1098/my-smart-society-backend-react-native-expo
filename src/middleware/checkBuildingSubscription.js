// middleware/checkBuildingSubscription.js
// adminAuth YA memberAuth, dono ke baad lagao.
// Expiry nikal chuki to lazy-update status="expired". expired/blocked ho to route block.

import Building from "../model/building.js";

const checkBuildingSubscription = async (req, res, next) => {
  try {
    // ✅ admin ke paas buildingId (ObjectId), member/staff ke paas buildingCode — teeno handle karo
    const buildingId = req.admin?.buildingId;
    const buildingCode =
      req.member?.buildingCode || req.staff?.buildingCode || req.buildingCode;

    if (!buildingId && !buildingCode) {
      return res
        .status(400)
        .json({ success: false, message: "No building linked" });
    }

    const query = buildingId ? { _id: buildingId } : { buildingCode };

    const building = await Building.findOne(query).select(
      "subscriptionStatus subscriptionExpiry blockedReason"
    );
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    const now = new Date();
    if (
      building.subscriptionExpiry &&
      building.subscriptionExpiry < now &&
      building.subscriptionStatus !== "expired" &&
      building.subscriptionStatus !== "blocked"
    ) {
      building.subscriptionStatus = "expired";
      await building.save();
    }

    if (
      building.subscriptionStatus === "expired" ||
      building.subscriptionStatus === "blocked"
    ) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_INACTIVE",
        status: building.subscriptionStatus,
        message:
          building.subscriptionStatus === "blocked"
            ? building.blockedReason || "Building blocked"
            : "Subscription expired. Renew to continue.",
      });
    }

    next();
  } catch (err) {
    console.error("checkBuildingSubscription error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default checkBuildingSubscription;
