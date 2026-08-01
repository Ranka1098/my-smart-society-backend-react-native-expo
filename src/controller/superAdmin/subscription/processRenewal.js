import Building from "../../../model/building.js";
import SubscriptionPlan from "../../../model/subscriptionPlanSchema.js";
import Transaction from "../../../model/transactionSchema.js";
import { checkIdempotent, assertRenewable } from "../../../middleware/subscriptionGuard.js";
import { countActiveUnits, calculateSubscriptionAmount } from "./calculateSubscriptionAmount.js";

/**
 * Core renewal logic — SHARED between:
 *   - admin renew (payment gateway, khud apna building renew karta hai)
 *   - superadmin renew (manual, kisi bhi building ke liye)
 * Dono routes isi function ko call karte hain, taaki logic ek hi jagah rahe.
 *
 * @param {Object} params
 * @param {String} params.buildingId
 * @param {String} params.planId
 * @param {String} params.method - upi|card|netbanking|cash|free|manual
 * @param {String} params.gatewayTxnId
 * @param {String} params.idempotencyKey - REQUIRED
 * @param {String} params.note
 * @param {Object} params.initiatedBy - { role: 'admin'|'superadmin', id }
 * @param {Object} params.io - socket.io instance (req.app.get('io'))
 */
export const processRenewal = async ({
  buildingId,
  planId,
  method,
  gatewayTxnId,
  idempotencyKey,
  note,
  initiatedBy,
  io,
}) => {
  // ✅ Step 4 se — idempotency check sabse pehle
  const existingTxn = await checkIdempotent(idempotencyKey);
  if (existingTxn) {
    const existingBuilding = await Building.findById(existingTxn.building);
    return {
      idempotent: true,
      message: "Already processed",
      building: existingBuilding,
      transaction: existingTxn,
    };
  }

  const building = await Building.findById(buildingId);
  if (!building) {
    const err = new Error("Building not found");
    err.statusCode = 404;
    throw err;
  }

  // ✅ Step 4 se — active/blocked building renew nahi kar sakta
  assertRenewable(building);

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || !plan.isActive) {
    const err = new Error("Invalid or inactive plan");
    err.statusCode = 400;
    throw err;
  }

  // ✅ Step 5 core — maintenance pe depend nahi, directly active count
  const { flatCount, shopCount } = await countActiveUnits(building.buildingCode);
  const amount = calculateSubscriptionAmount(plan, flatCount, shopCount);

  const now = new Date();
  const newExpiry = new Date(now);
  newExpiry.setDate(newExpiry.getDate() + plan.durationDays);

  // Transaction pending create -> building update -> success flip
  const txn = await Transaction.create({
    buildingCode: building.buildingCode,
    building: building._id,
    plan: plan._id,
    planCodeSnapshot: plan.planCode,
    type: plan.type === "trial" ? "free_trial" : "renew",
    billedFlats: flatCount,
    billedShops: shopCount,
    perFlatRate: plan.perFlatRate,
    perShopRate: plan.perShopRate,
    amount,
    method,
    gatewayTxnId: gatewayTxnId || null,
    idempotencyKey,
    status: "pending",
    initiatedBy,
    notes: note || null,
  });

  building.plan = plan._id;
  building.subscriptionType = plan.type;
  building.subscriptionStartDate = now;
  building.subscriptionExpiry = newExpiry;
  building.subscriptionStatus = "active";
  building.lockLevel = "none";
  building.blockedAt = null;
  building.blockedReason = null;
  building.graceEndsAt = null;
  building.lastBilledFlats = flatCount;
  building.lastBilledShops = shopCount;
  building.lastBilledAmount = amount;
  building.paymentStatus = amount > 0 ? "paid" : "paid"; // paid = txn success ho chuka
  building.isActive = true;
  building.remindersSent = [];

  building.subscriptionHistory.push({
    planCode: plan.planCode,
    subscriptionType: plan.type,
    billedFlats: flatCount,
    billedShops: shopCount,
    amount,
    subscriptionStartDate: now,
    subscriptionExpiry: newExpiry,
    subscriptionStatus: "active",
    paymentStatus: "paid",
    transactionId: txn._id,
    action: `Renewed (${plan.planCode}) — ${flatCount} flats + ${shopCount} shops = ₹${amount} by ${initiatedBy.role}${
      note ? ` — ${note}` : ""
    }`,
    changedBy: initiatedBy,
    changedAt: now,
  });

  await building.save();

  txn.status = "success";
  await txn.save();

  if (io) {
    io.to(building.buildingCode).emit("dashboard_update");
    io.to(building.buildingCode).emit("subscription_renewed", {
      buildingCode: building.buildingCode,
      subscriptionExpiry: newExpiry,
      subscriptionStatus: "active",
      amount,
    });
  }

  return { idempotent: false, building, transaction: txn };
};