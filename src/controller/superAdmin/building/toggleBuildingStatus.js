// controller/superAdmin/building/toggleBuildingStatus.js
import Building from "../../../model/building.js";
import {
  assertBlockable,
  assertUnblockable,
  resolveStatusAfterBlock,
} from "../../../middleware/subscriptionGuard.js";

/**
 * body: { action: "block" | "unblock", reason }  // reason sirf block ke liye
 *
 * BLOCK   — kisi bhi status (active/grace/expired) se laga sakte, manual +
 *           time-bound NAHI. lockLevel = full_lock turant.
 * UNBLOCK — sirf blocked se hi chalta. Wapas jaane wala status subscriptionExpiry
 *           aur graceEndsAt se decide hota (resolveStatusAfterBlock) — block ke
 *           dauraan expiry date change nahi hui thi, isliye asli state wapas milta.
 */
const toggleBuildingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!["block", "unblock"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action must be 'block' or 'unblock'",
      });
    }

    const building = await Building.findById(id);
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    const now = new Date();

    if (action === "block") {
      assertBlockable(building); // already blocked hai to error

      building.subscriptionStatus = "blocked";
      building.lockLevel = "full_lock";
      building.blockedAt = now;
      building.blockedReason = reason || null;

      building.subscriptionHistory.push({
        subscriptionType: building.subscriptionType,
        subscriptionStartDate: building.subscriptionStartDate,
        subscriptionExpiry: building.subscriptionExpiry,
        subscriptionStatus: "blocked",
        paymentStatus: building.paymentStatus,
        action: `Blocked by Super Admin${reason ? ` — ${reason}` : ""}`,
        changedBy: { role: "superadmin", id: req.superAdmin?._id || null }, // ⚠️ apna actual field check karo
        changedAt: now,
      });
    } else {
      assertUnblockable(building); // blocked nahi hai to error

      // ✅ expiry/graceEndsAt se asli status wapas nikalo — guess nahi karte
      const { status, lockLevel } = resolveStatusAfterBlock(building, now);

      building.subscriptionStatus = status;
      building.lockLevel = lockLevel;
      building.blockedAt = null;
      building.blockedReason = null;

      building.subscriptionHistory.push({
        subscriptionType: building.subscriptionType,
        subscriptionStartDate: building.subscriptionStartDate,
        subscriptionExpiry: building.subscriptionExpiry,
        subscriptionStatus: status,
        paymentStatus: building.paymentStatus,
        action: `Unblocked by Super Admin — reverted to "${status}"`,
        changedBy: { role: "superadmin", id: req.superAdmin?._id || null },
        changedAt: now,
      });
    }

    await building.save();

    // Real-time — admin/member turant block/unblock, force logout agar full_lock
    const io = req.app.get("io");
    if (io) {
      io.to(building.buildingCode).emit("dashboard_update");
      io.to(building.buildingCode).emit("subscription_status_changed", {
        buildingCode: building.buildingCode,
        subscriptionStatus: building.subscriptionStatus,
        lockLevel: building.lockLevel,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Building ${action}ed`,
      subscriptionStatus: building.subscriptionStatus,
      lockLevel: building.lockLevel,
      blockedAt: building.blockedAt,
      blockedReason: building.blockedReason,
    });
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message, code: error.code });
  }
};

export default toggleBuildingStatus;
