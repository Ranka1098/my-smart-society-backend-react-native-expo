import crypto from "crypto";
import razorpayInstance from "../../config/rozarpay.js";
import Building from "../../model/building.js";
import Transaction from "../../model/transectionRecord.js";
import { applyRenewal } from "../../controller/superAdmin/subscription/applyForRenewal.js";

// ✅ NAYA — Razorpay se asli payment method + UPI ID / card detail nikalta
const getPaymentDetail = async (paymentId) => {
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    const method = payment.method; // "upi" | "card" | "netbanking" | "wallet"

    let payerAccount = null;
    if (method === "upi") {
      payerAccount = payment.vpa || null; // "ashok@okhdfc"
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
    return { method: "upi", payerAccount: null }; // fallback — verify fir bhi chalega
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid signature" });
    }

    const txn = await Transaction.findOne({
      gatewayOrderId: razorpay_order_id,
    });
    if (!txn) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }
    if (txn.status === "success") {
      return res
        .status(200)
        .json({ success: true, verified: true, idempotent: true });
    }

    const building = await Building.findById(txn.building);
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    // ✅ NAYA — asli method + UPI ID / card nikalo
    const { method, payerAccount } = await getPaymentDetail(
      razorpay_payment_id
    );

    txn.status = "success";
    txn.gatewayTxnId = razorpay_payment_id;
    txn.method = method;
    txn.payerAccount = payerAccount;
    await txn.save();

    await applyRenewal(building, {
      method,
      gateway: "Razorpay",
      gatewayTxnId: razorpay_payment_id,
      payerAccount,
      transactionId: txn._id,
      changedBy: { role: "admin", id: building.admin },
    });

    await building.save();

    return res.status(200).json({
      success: true,
      verified: true,
      buildingCode: building.buildingCode,
      amount: txn.amount,
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export default verifyPayment;
