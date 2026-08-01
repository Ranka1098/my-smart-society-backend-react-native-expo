// controller/superadmin/renewSubscription.js
import crypto from "crypto";
import { processRenewal } from "./processRenewal.js";

/**
 * POST /superadmin/buildings/:id/renew
 * body: { planId, method, gatewayTxnId, note, idempotencyKey }
 *
 * Superadmin kisi bhi building ka manual renewal karta hai — payment gateway
 * ke bina (cash/manual settlement outside app), ya koi override case.
 * Same processRenewal() core use karta hai jo admin wala renewMySubscription.js
 * use karta — taaki rate calculation, transaction, history sab EK hi jagah se aaye.
 */
const renewSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { planId, method, gatewayTxnId, note } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Building id required" });
    }
    if (!planId) {
      return res
        .status(400)
        .json({ success: false, message: "planId required" });
    }

    // superadmin manual renewal me gateway nahi hota, isliye method default "manual"
    const finalMethod = method || "manual";

    // superadmin frontend se idempotencyKey na bheje to yahan generate kar do
    const idempotencyKey =
      req.body.idempotencyKey ||
      `superadmin-renew-${id}-${crypto.randomUUID()}`;

    const result = await processRenewal({
      buildingId: id,
      planId,
      method: finalMethod,
      gatewayTxnId: gatewayTxnId || null,
      idempotencyKey,
      note,
      initiatedBy: { role: "superadmin", id: req.superAdmin?._id || null }, // ⚠️ apne superadmin auth middleware ka actual field check kar lena
      io: req.app.get("io"),
    });

    return res.status(200).json({
      success: true,
      message: result.idempotent
        ? "Already processed"
        : "Subscription renewed by Super Admin",
      building: {
        buildingCode: result.building.buildingCode,
        subscriptionType: result.building.subscriptionType,
        subscriptionStatus: result.building.subscriptionStatus,
        subscriptionExpiry: result.building.subscriptionExpiry,
        lockLevel: result.building.lockLevel,
      },
      amount: result.transaction.amount,
      transactionId: result.transaction._id,
    });
  } catch (error) {
    console.error("Superadmin Renew Error:", error);
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      return res.status(409).json({
        success: false,
        message: "Duplicate request, retry status check",
      });
    }
    return res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message, code: error.code });
  }
};

export default renewSubscription;
