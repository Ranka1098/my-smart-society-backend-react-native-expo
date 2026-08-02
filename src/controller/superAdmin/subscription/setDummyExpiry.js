// controller/superAdmin/subscription/setDummyExpiry.js
import Building from "../../../model/building.js";
import { resolveStatusAfterBlock } from "../../../middleware/subscriptionGuard.js"; // apna actual path check karo
// controller/superAdmin/subscription/setDummyExpiry.js

const setDummyExpiry = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { daysFromNow = -1, setGrace = false, graceDays = 7 } = req.body;

    const building = await Building.findById(buildingId);
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(daysFromNow));
    building.subscriptionExpiry = expiryDate;

    if (setGrace) {
      const graceEnd = new Date(expiryDate);
      graceEnd.setDate(graceEnd.getDate() + Number(graceDays));
      building.graceEndsAt = graceEnd;
    } else {
      building.graceEndsAt = undefined;
    }

    building.blockedAt = undefined;
    building.blockedReason = undefined;

    const { status, lockLevel } = resolveStatusAfterBlock(building);
    building.subscriptionStatus = status;
    building.lockLevel = lockLevel;

    // ⚠️ Ye missing tha — history entry push karo
    building.subscriptionHistory = building.subscriptionHistory || [];
    building.subscriptionHistory.push({
      action: "dummy-expiry-test",
      subscriptionStatus: status,
      subscriptionType: building.subscriptionType,
      subscriptionExpiry: building.subscriptionExpiry,
      changedAt: new Date(),
    });

    await building.save();

    return res.status(200).json({
      success: true,
      message: "Dummy expiry set — testing ready",
      data: {
        buildingId: building._id,
        subscriptionStatus: building.subscriptionStatus,
        lockLevel: building.lockLevel,
        subscriptionExpiry: building.subscriptionExpiry,
        graceEndsAt: building.graceEndsAt || null,
      },
    });
  } catch (err) {
    console.error("setDummyExpiry error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export default setDummyExpiry;
