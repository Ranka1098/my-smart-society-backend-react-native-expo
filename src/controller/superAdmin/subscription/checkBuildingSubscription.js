// middleware/checkBuildingSubscription.js
import Building from "../model/building.js";

const isWriteMethod = (method) => !["GET", "HEAD", "OPTIONS"].includes(method);

/**
 * memberAuth/adminAuth ke baad lagao. lockLevel field (jo renew/block/cron
 * controllers already maintain karte hain) ko seedha check karta hai —
 * dobara status-se-lockLevel calculate nahi karta, single source of truth.
 *
 * none      -> sab allowed
 * read_only -> GET/HEAD allowed, write (POST/PUT/PATCH/DELETE) block
 * full_lock -> sab block (expired ya blocked dono isi me aate hain)
 */
const checkBuildingSubscription = async (req, res, next) => {
  try {
    const buildingCode =
      req.admin?.buildingCode || req.member?.buildingCode || req.buildingCode;

    if (!buildingCode) {
      return res.status(400).json({ success: false, message: "Building code missing on request" });
    }

    const building = await Building.findOne({ buildingCode });
    if (!building) {
      return res.status(404).json({ success: false, message: "Building not found" });
    }

    if (!building.isActive) {
      return res.status(403).json({
        success: false,
        code: "BUILDING_INACTIVE",
        message: "Building is inactive. Contact support.",
      });
    }

    // ✅ blocked — sirf superadmin ke unblock action se hatega, renewal se bhi nahi
    if (building.subscriptionStatus === "blocked") {
      return res.status(403).json({
        success: false,
        code: "BUILDING_BLOCKED",
        message: building.blockedReason
          ? `Building blocked by admin: ${building.blockedReason}`
          : "Building blocked. Contact support.",
      });
    }

    if (building.lockLevel === "full_lock") {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_EXPIRED",
        message: "Building subscription expired, please renew to continue.",
      });
    }

    if (building.lockLevel === "read_only" && isWriteMethod(req.method)) {
      return res.status(403).json({
        success: false,
        code: "SUBSCRIPTION_GRACE_READONLY",
        message: "Subscription in grace period — viewing allowed, new data entry locked until renewal.",
        graceEndsAt: building.graceEndsAt,
      });
    }

    req.buildingSubscription = {
      status: building.subscriptionStatus,
      lockLevel: building.lockLevel,
    };

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default checkBuildingSubscription;