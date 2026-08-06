// config/subscriptionConfig.js
// SubscriptionPlan model ki zaroorat nahi — fix rate hardcode.

export const RATE_PER_UNIT = 30; // ₹30 per flat, ₹30 per shop
export const TRIAL_DAYS = 30;
export const RENEWAL_DAYS = 30;

export const calculateAmount = (totalFlats = 0, totalShops = 0) =>
  (totalFlats + totalShops) * RATE_PER_UNIT;
