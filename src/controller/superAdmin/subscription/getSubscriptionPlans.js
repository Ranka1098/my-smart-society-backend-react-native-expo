// controller/superAdmin/subscription/getSubscriptionPlans.js
import SubscriptionPlan from "../../../model/subscriptionPlanSchema.js";

const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ type: 1 });
    return res.status(200).json({ success: true, plans });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default getSubscriptionPlans;