import razorpayInstance from "../../config/rozarpay.js";
import Building from "../../model/building.js";
import Transaction from "../../model/transectionRecord.js";
import { calculateAmount } from "../../controller/superAdmin/subscription/Subscriptionconfig.js";
import { getActiveUnitCounts } from "../../controller/superAdmin/subscription/getActiveUnitCounts.js";

const createOrder = async (req, res) => {
  try {
    const { buildingCode } = req.body;
    if (!buildingCode) {
      return res
        .status(400)
        .json({ success: false, message: "buildingCode required" });
    }

    const building = await Building.findOne({ buildingCode });
    if (!building) {
      return res
        .status(404)
        .json({ success: false, message: "Building not found" });
    }

    // Blocked building payment se unblock nahi hogi, sirf Super Admin karega
    if (building.subscriptionStatus === "blocked") {
      return res.status(403).json({
        success: false,
        code: "BUILDING_BLOCKED",
        message: "Building blocked. Contact support.",
      });
    }

    if (
      building.subscriptionStatus === "active" &&
      building.subscriptionExpiry > new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Subscription already active, renewal not needed.",
      });
    }

    const { activeFlats, activeShops } =
      await getActiveUnitCounts(buildingCode);
    const amount = calculateAmount(activeFlats, activeShops);
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "No active flats or shops found to bill.",
      });
    }

    const order = await razorpayInstance.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `renew_${building._id}_${Date.now()}`,
    });

    await Transaction.create({
      building: building._id,
      buildingCode: building.buildingCode,
      amount,
      method: "upi",
      gateway: "Razorpay",
      gatewayOrderId: order.id,
      status: "pending",
      initiatedBy: { role: "admin", id: building.admin },
      idempotencyKey: order.id,
    });

    return res.status(200).json({
      success: true,
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export default createOrder;
