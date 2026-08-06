// utils/applyRenewal.js

import {
  RATE_PER_UNIT,
  RENEWAL_DAYS,
  calculateAmount,
} from "../../../controller/superAdmin/subscription/Subscriptionconfig.js";
import { getActiveUnitCounts } from "../../../controller/superAdmin/subscription/getActiveUnitCounts.js";

/**
 * Building doc ko renew karta + subscriptionHistory me entry push karta.
 * Amount ACTIVE (approved) flats/shops se calculate hota, totalFlats/totalShops se nahi.
 * Save NAHI karta — caller khud building.save() kare.
 *
 * @param {Document} building
 * @param {Object} opts - { method, gateway, gatewayTxnId, payerAccount, transactionId, changedBy, notes }
 */
export const applyRenewal = async (building, opts) => {
  const {
    method,
    gateway = null,
    gatewayTxnId = null,
    payerAccount = null,
    transactionId = null,
    changedBy,
    notes = null,
  } = opts;

  const { activeFlats: billedFlats, activeShops: billedShops } =
    await getActiveUnitCounts(building.buildingCode);

  const amount = calculateAmount(billedFlats, billedShops); // (active flats+shops) * ₹30

  const now = new Date();
  const base =
    building.subscriptionExpiry && building.subscriptionExpiry > now
      ? building.subscriptionExpiry
      : now;

  const newExpiry = new Date(base);
  newExpiry.setDate(newExpiry.getDate() + RENEWAL_DAYS); // fix 30 din

  const billingMonth = newExpiry.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const actionText = `Renewed till ${billingMonth} — ${billedFlats} active flats + ${billedShops} active shops @ ₹${RATE_PER_UNIT} = ₹${amount} (by ${changedBy.role}, ${method})`;

  building.subscriptionType = "monthly";
  building.lastBilledFlats = billedFlats;
  building.lastBilledShops = billedShops;
  building.lastBilledAmount = amount;
  building.subscriptionStartDate =
    base > now ? building.subscriptionStartDate : now;
  building.subscriptionExpiry = newExpiry;
  building.subscriptionStatus = "active";
  building.blockedAt = null;
  building.blockedReason = null;
  building.paymentStatus = "paid";

  const historyEntry = {
    subscriptionType: "monthly",
    billedFlats,
    billedShops,
    amount,
    subscriptionStartDate: base,
    subscriptionExpiry: newExpiry,
    subscriptionStatus: "active",
    paymentStatus: "paid",
    billingMonth,
    method,
    gateway,
    gatewayTxnId,
    payerAccount,
    action: notes || actionText,
    transactionId,
    changedBy,
    changedAt: now,
  };

  building.subscriptionHistory.push(historyEntry);

  return { amount, newExpiry, historyEntry };
};
