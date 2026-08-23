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

    // createOrder.js me add karo
    if (
      building.subscriptionStatus === "active" &&
      building.subscriptionExpiry > new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Subscription already active, renewal not needed abhi.",
      });
    }

    const { activeFlats, activeShops } = await getActiveUnitCounts(
      buildingCode
    );
    const amount = calculateAmount(activeFlats, activeShops);
    if (amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be > 0" });
    }

    const options = {
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `renew_${building._id}_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);

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

    res.status(200).json({
      success: true,
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export default createOrder;
