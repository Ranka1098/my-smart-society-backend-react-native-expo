// controller/superAdmin/subscription/dummyExpiryTest.js
// TEST ONLY — superadmin building ki expiry manually shift kar sakta (test ke liye)

import Building from "../../../model/building.js";

export const dummyExpiryTest = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { daysFromNow = -1, setGrace = false } = req.body;

    const building = await Building.findById(buildingId);
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    const now = new Date();
    const newExpiry = new Date(now);
    newExpiry.setDate(newExpiry.getDate() + Number(daysFromNow));

    building.subscriptionExpiry = newExpiry;

    if (setGrace) {
      building.subscriptionStatus = "active";
    } else {
      building.subscriptionStatus = "expired";
      building.paymentStatus = "pending";
    }

    // ✅ DUPLICATE GUARD — yahan add kiya
    const lastEntry =
      building.subscriptionHistory[building.subscriptionHistory.length - 1];
    const isDuplicate =
      lastEntry &&
      Date.now() - new Date(lastEntry.changedAt).getTime() < 3000;

    if (!isDuplicate) {
      building.subscriptionHistory.push({
        subscriptionType: building.subscriptionType,
        billedFlats: building.lastBilledFlats,
        billedShops: building.lastBilledShops,
        amount: 0,
        subscriptionStartDate: building.subscriptionStartDate,
        subscriptionExpiry: newExpiry,
        subscriptionStatus: building.subscriptionStatus,
        paymentStatus: building.paymentStatus,
        billingMonth: newExpiry.toLocaleString("en-IN", {
          month: "long",
          year: "numeric",
        }),
        method: "manual",
        action: `TEST: expiry set to ${daysFromNow} days from now (setGrace=${setGrace}) by superadmin`,
        changedBy: { role: "superadmin", id: req.superAdmin._id },
        changedAt: now,
      });
    }

    await building.save();

    return res.status(200).json({
      success: true,
      message: "Expiry updated for testing",
      buildingCode: building.buildingCode,
      subscriptionStatus: building.subscriptionStatus,
      subscriptionExpiry: building.subscriptionExpiry,
    });
  } catch (err) {
    console.error("dummyExpiryTest error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};