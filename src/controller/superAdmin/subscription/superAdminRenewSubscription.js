// controller/subscription/superAdminRenewSubscription.js
// Path 1 — admin superadmin ko keh ke renew karwaye (manual/cash, no gateway)

import Building from "../../../model/building.js";
import Transaction from "../../../model/transectionRecord.js";
import { applyRenewal } from "../../../controller/superAdmin/subscription/applyForRenewal.js";
import { calculateAmount } from "../../../controller/superAdmin/subscription/Subscriptionconfig.js";
import { getActiveUnitCounts } from "../../../controller/superAdmin/subscription/getActiveUnitCounts.js";

export const superAdminRenewSubscription = async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { method, notes } = req.body; // method: "cash" | "manual" | "upi" (offline collected)

    if (!method) {
      return res
        .status(400)
        .json({ success: false, message: "method required" });
    }

    const building = await Building.findById(buildingId);
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    const changedBy = { role: "superadmin", id: req.superAdmin._id };
    const { activeFlats, activeShops } = await getActiveUnitCounts(
      building.buildingCode
    );
    const amount = calculateAmount(activeFlats, activeShops);

    // ✅ transaction pehle likha, taki history me transactionId link ho sake
    const txn = await Transaction.create({
      building: building._id,
      buildingCode: building.buildingCode,
      amount,
      method,
      gateway: null, // manual, gateway nahi laga
      status: "success",
      initiatedBy: changedBy,
      idempotencyKey: `superadmin-renew-${building._id}-${Date.now()}`,
      notes: notes || null,
    });

    await applyRenewal(building, {
      method,
      gateway: null,
      transactionId: txn._id,
      changedBy,
      notes,
    });

    await building.save();

    return res.status(200).json({
      success: true,
      message: "Subscription renewed by superadmin",
      buildingCode: building.buildingCode,
      subscriptionExpiry: building.subscriptionExpiry,
      transaction: txn,
    });
  } catch (err) {
    console.error("superAdminRenewSubscription error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
