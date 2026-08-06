// controller/subscription/assignFreeTrialOnRegister.js
// Building create hone ke turant baad call kar (registration/OTP-verify flow me).
// Plan model ki zaroorat nahi — fix 30 din free.
// billedFlats/billedShops = registration ke waqt admin ne jo total daale the (totalFlats/totalShops),
// naya building hai isliye active-approved member count abhi 0 hoga — registration ka number dikhana sahi hai.

import { TRIAL_DAYS } from "../../../controller/superAdmin/subscription/Subscriptionconfig.js";

/**
 * @param {Document} building - already saved Building doc (has _id, buildingCode, totalFlats, totalShops)
 */
export const assignFreeTrialOnRegister = async (building) => {
  const now = new Date();
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + TRIAL_DAYS); // 30 days

  const billedFlats = building.totalFlats || 0;
  const billedShops = building.totalShops || 0;

  building.subscriptionType = "trial";
  building.lastBilledFlats = billedFlats;
  building.lastBilledShops = billedShops;
  building.lastBilledAmount = 0;
  building.subscriptionStartDate = now;
  building.subscriptionExpiry = expiry;
  building.subscriptionStatus = "active";
  building.paymentStatus = "free_trial";

  building.subscriptionHistory.push({
    subscriptionType: "trial",
    billedFlats,
    billedShops,
    amount: 0,
    subscriptionStartDate: now,
    subscriptionExpiry: expiry,
    subscriptionStatus: "active",
    paymentStatus: "free_trial",
    billingMonth: expiry.toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    }),
    method: "free",
    gateway: null,
    gatewayTxnId: null,
    payerAccount: null,
    action: `Auto free trial (${TRIAL_DAYS} days) on registration — ${billedFlats} flats + ${billedShops} shops`,
    transactionId: null,
    changedBy: { role: "system", id: null },
    changedAt: now,
  });

  await building.save();
  return building;
};
