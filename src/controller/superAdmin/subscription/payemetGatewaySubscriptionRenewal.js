// controller/subscription/renewMySubscription.js
// Admin apni building khud renew kare — Cashfree order banata, checkout session_id return karta.
// Actual renewal (building update + history) sirf webhook confirm hone par hoga.

import axios from "axios";
import Building from "../../../model/building.js";
import Transaction from "../../../model/transectionRecord.js";
import { calculateAmount } from "../../../controller/superAdmin/subscription/Subscriptionconfig.js";
import { getActiveUnitCounts } from "../../../controller/superAdmin/subscription/getActiveUnitCounts.js";

const CASHFREE_BASE =
  process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

export const payemetGatewaySubscriptionRenewal = async (req, res) => {
  try {
    const buildingId = req.admin.buildingId;

    const building = await Building.findById(buildingId);
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    const { activeFlats, activeShops } = await getActiveUnitCounts(
      building.buildingCode
    );
    const amount = calculateAmount(activeFlats, activeShops);
    if (amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be > 0" });
    }

    const orderId = `order_${building._id}_${Date.now()}`;

    // ✅ pending transaction — webhook isi ko success karega
    const txn = await Transaction.create({
      building: building._id,
      buildingCode: building.buildingCode,
      amount,
      method: "upi", // placeholder, webhook actual method se overwrite karega
      gateway: "Cashfree",
      gatewayOrderId: orderId,
      status: "pending",
      initiatedBy: { role: "admin", id: req.admin._id },
      idempotencyKey: orderId,
    });

    const { data } = await axios.post(
      `${CASHFREE_BASE}/orders`,
      {
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: String(req.admin._id),
          customer_phone: req.admin.phone,
          customer_email: req.admin.email,
        },
        order_meta: {
          return_url: `${process.env.APP_BASE_URL}/payment/status?order_id={order_id}`,
          notify_url: `${process.env.SERVER_BASE_URL}/webhook/cashfree`,
        },
      },
      {
        headers: {
          "x-client-id": process.env.CASHFREE_CLIENT_ID,
          "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
          "x-api-version": "2023-08-01",
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json({
      success: true,
      orderId,
      amount,
      paymentSessionId: data.payment_session_id,
      transactionId: txn._id,
    });
  } catch (err) {
    console.error(
      "renewMySubscription error:",
      err?.response?.data || err.message
    );
    return res
      .status(500)
      .json({ success: false, message: "Order create failed" });
  }
};
