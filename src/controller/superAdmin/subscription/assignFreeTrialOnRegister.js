import SubscriptionPlan from "../../../model/subscriptionPlanSchema.js";
import Transaction from "../../../model/transactionSchema.js";

/**
 * Building create hone ke turant baad ye call karo (registerBuilding controller me,
 * building.save() ke baad). Ek "TRIAL" planCode wala plan pehle se DB me hona chahiye
 * (seed script se ek baar bana lena — perFlatRate/perShopRate: 0, durationDays: 30).
 *
 * Usage in registerBuilding.js:
 *   const building = await Building.create({...});
 *   await assignFreeTrialOnRegister(building, req.app.get("io"));
 */
export const assignFreeTrialOnRegister = async (building, io) => {
  const trialPlan = await SubscriptionPlan.findOne({
    type: "trial",
    isActive: true,
  });
  if (!trialPlan) {
    console.error(
      "❌ No active trial plan found — seed a TRIAL plan first (type:'trial', isActive:true)"
    );
    throw new Error("TRIAL_PLAN_NOT_SEEDED"); // silent fail band, ab error visible hoga
  }

  const now = new Date();
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + trialPlan.durationDays);

  // ✅ registration ke waqt admin ne jo count declare kiya, wahi dikhao
  const declaredFlats = building.totalFlats || 0;
  const declaredShops = building.totalShops || 0;

  building.plan = trialPlan._id;
  building.subscriptionType = "trial";
  building.subscriptionStartDate = now;
  building.subscriptionExpiry = expiry;
  building.subscriptionStatus = "active";
  building.lockLevel = "none";
  building.paymentStatus = "paid";
  building.lastBilledFlats = declaredFlats; // ✅ 0 nahi
  building.lastBilledShops = declaredShops; // ✅ 0 nahi
  building.lastBilledAmount = 0; // amount hamesha 0 rahega — trial free hai

  const txn = await Transaction.create({
    buildingCode: building.buildingCode,
    building: building._id,
    plan: trialPlan._id,
    planCodeSnapshot: trialPlan.planCode,
    type: "free_trial",
    billedFlats: declaredFlats, // ✅
    billedShops: declaredShops, // ✅
    perFlatRate: 0,
    perShopRate: 0,
    amount: 0,
    method: "free",
    idempotencyKey: `trial-${building._id}`,
    status: "success",
    initiatedBy: { role: "system", id: null },
    notes: "Auto free trial on registration",
  });

  building.subscriptionHistory.push({
    planCode: trialPlan.planCode,
    subscriptionType: "trial",
    billedFlats: declaredFlats, // ✅
    billedShops: declaredShops, // ✅
    amount: 0,
    subscriptionStartDate: now,
    subscriptionExpiry: expiry,
    subscriptionStatus: "active",
    paymentStatus: "paid",
    transactionId: txn._id,
    billingMonth: now.toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    }),
    method: "free",
    gateway: null,
    gatewayTxnId: null,
    payerAccount: null,
    action: `Auto Free Trial (${trialPlan.durationDays} days) on Registration`,
    changedBy: { role: "system", id: null },
    changedAt: now,
  });

  await building.save();

  if (io) {
    io.to(building.buildingCode).emit("subscription_trial_started", {
      buildingCode: building.buildingCode,
      subscriptionExpiry: expiry,
    });
  }

  return building;
};