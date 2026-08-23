import crypto from "crypto";
import razorpayInstance from "../../config/rozarpay.js";
import Building from "../../model/building.js";
import Transaction from "../../model/transectionRecord.js";
import { applyRenewal } from "../../controller/superAdmin/subscription/applyForRenewal.js";

// ✅ verifyPayment.js jaisa hi — dono jagah consistent data aaye
const getPaymentDetail = async (paymentId) => {
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    const method = payment.method;

    let payerAccount = null;
    if (method === "upi") {
      payerAccount = payment.vpa || null;
    } else if (method === "card") {
      payerAccount = payment.card
        ? `${payment.card.network} **** ${payment.card.last4}`
        : null;
    } else if (method === "netbanking") {
      payerAccount = payment.bank || null;
    } else if (method === "wallet") {
      payerAccount = payment.wallet || null;
    }

    return { method, payerAccount };
  } catch (err) {
    console.error("getPaymentDetail fetch error:", err.message);
    return { method: "upi", payerAccount: null };
  }
};

const webhookHandler = async (req, res) => {
  try {
    const shasum = crypto.createHmac(
      "sha256",
      process.env.RAZORPAY_WEBHOOK_SECRET
    );
    shasum.update(req.body);
    const digest = shasum.digest("hex");
    const signature = req.headers["x-razorpay-signature"];

    if (digest !== signature) {
      console.log("Webhook signature mismatch");
      return res.status(400).json({ success: false });
    }

    const event = JSON.parse(req.body);

    if (event.event === "payment.captured") {
      const orderId = event.payload.payment.entity.order_id;
      const paymentId = event.payload.payment.entity.id;

      const txn = await Transaction.findOne({ gatewayOrderId: orderId });
      if (txn && txn.status !== "success") {
        const building = await Building.findById(txn.building);
        if (building) {
          // ✅ NAYA — yaha bhi asli method + UPI/card nikalo
          const { method, payerAccount } = await getPaymentDetail(paymentId);

          txn.status = "success";
          txn.gatewayTxnId = paymentId;
          txn.method = method;
          txn.payerAccount = payerAccount;
          await txn.save();

          await applyRenewal(building, {
            method,
            gateway: "Razorpay",
            gatewayTxnId: paymentId,
            payerAccount,
            transactionId: txn._id,
            changedBy: { role: "admin", id: building.admin },
          });
          await building.save();
        }
      }
    }

    if (event.event === "payment.failed") {
      const orderId = event.payload.payment.entity.order_id;
      await Transaction.findOneAndUpdate(
        { gatewayOrderId: orderId },
        { status: "failed" }
      );
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ success: false });
  }
};

export default webhookHandler;
