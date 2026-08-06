// controller/webhook/cashfreeWebhook.js
// Cashfree yahi hit karega jab payment success/fail ho. Route auth-free hona chahiye (POST).
// Idempotent — same order_id dubara aaye to dubara renew nahi karega.

import crypto from "crypto";
import Building from "../../model/building.js";
import Transaction from "../../model/transaction.model.js";
import { applyRenewal } from "../../utils/applyRenewal.js";

const verifySignature = (rawBody, signature, timestamp) => {
  const payload = timestamp + rawBody;
  const expected = crypto
    .createHmac("sha256", process.env.CASHFREE_CLIENT_SECRET)
    .update(payload)
    .digest("base64");
  return expected === signature;
};

export const cashfreeWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    const rawBody = req.rawBody || JSON.stringify(req.body); // rawBody middleware me set kar rakhna

    if (!verifySignature(rawBody, signature, timestamp)) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid signature" });
    }

    const event = req.body;
    const orderId = event?.data?.order?.order_id;
    const paymentStatus = event?.data?.payment?.payment_status; // "SUCCESS" | "FAILED"
    const method = (event?.data?.payment?.payment_group || "upi").toLowerCase();
    const gatewayTxnId = event?.data?.payment?.cf_payment_id || null;
    const payerAccount =
      event?.data?.payment?.payment_method?.upi?.upi_id || null;

    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "order_id missing" });
    }

    const txn = await Transaction.findOne({ gatewayOrderId: orderId });
    if (!txn) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    // ✅ idempotent — already processed to seedha 200 bhej do
    if (txn.status === "success") {
      return res.status(200).json({ success: true, idempotent: true });
    }

    if (paymentStatus !== "SUCCESS") {
      txn.status = "failed";
      await txn.save();
      return res.status(200).json({ success: true, status: "failed" });
    }

    const building = await Building.findById(txn.building);
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    txn.status = "success";
    txn.method = method;
    txn.gatewayTxnId = gatewayTxnId;
    txn.payerAccount = payerAccount;
    await txn.save();

    await applyRenewal(building, {
      method,
      gateway: "Cashfree",
      gatewayTxnId,
      payerAccount,
      transactionId: txn._id,
      changedBy: { role: "admin", id: txn.initiatedBy.id },
    });

    await building.save();

    return res.status(200).json({
      success: true,
      buildingCode: building.buildingCode,
      amount: txn.amount,
    });
  } catch (err) {
    console.error("cashfreeWebhook error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
