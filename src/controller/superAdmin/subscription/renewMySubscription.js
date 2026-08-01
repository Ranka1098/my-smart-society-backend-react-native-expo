// controller/admin/renewMySubscription.js
import { processRenewal } from "../../superAdmin/subscription/processRenewal.js";

/**
 * POST /admin/subscription/renew
 * body: { planId, method, gatewayTxnId, idempotencyKey, note }
 * Admin apne khud ke building ka subscription renew karta hai — payment
 * gateway se paisa cut hone ke baad ye call hota hai (gatewayTxnId gateway se aata hai).
 */
const renewMySubscription = async (req, res) => {
  try {
    const { planId, method, gatewayTxnId, idempotencyKey, note } = req.body;

    if (!planId) return res.status(400).json({ success: false, message: "planId required" });
    if (!method) return res.status(400).json({ success: false, message: "Payment method required" });

    const result = await processRenewal({
      buildingId: req.admin.buildingId, // ⚠️ adminAuth middleware me jo field hai wahi use karo
      planId,
      method,
      gatewayTxnId,
      idempotencyKey,
      note,
      initiatedBy: { role: "admin", id: req.admin._id },
      io: req.app.get("io"),
    });

    return res.status(200).json({
      success: true,
      message: result.idempotent ? "Already processed" : "Subscription renewed",
      building: {
        buildingCode: result.building.buildingCode,
        subscriptionStatus: result.building.subscriptionStatus,
        subscriptionExpiry: result.building.subscriptionExpiry,
      },
      amount: result.transaction.amount,
    });
  } catch (error) {
    console.error("Admin Renew Error:", error);
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      return res.status(409).json({ success: false, message: "Duplicate request, retry status check" });
    }
    return res.status(error.statusCode || 500).json({ success: false, message: error.message, code: error.code });
  }
};

export default renewMySubscription;