// scripts/seedSubscriptionPlans.js
// Run once: node scripts/seedSubscriptionPlans.js
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import dns from "dns";
import SubscriptionPlan from "../model/subscriptionPlanSchema.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const PLANS = [
  {
    planCode: "TRIAL",
    planName: "Free Trial",
    type: "trial",
    perFlatRate: 0,
    perShopRate: 0,
    durationDays: 30,
    graceDays: 2,
    isActive: true,
  },
  {
    planCode: "MONTHLY_STANDARD",
    planName: "Monthly Standard",
    type: "monthly",
    perFlatRate: 30,
    perShopRate: 30,
    durationDays: 30,
    graceDays: 2,
    isActive: true,
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGOURL);
  console.log("DB connected, seeding plans...");

  for (const plan of PLANS) {
    const existing = await SubscriptionPlan.findOne({
      planCode: plan.planCode,
    });
    if (existing) {
      // rate update ho sakta — upsert-like: existing rates refresh kardo
      existing.perFlatRate = plan.perFlatRate;
      existing.perShopRate = plan.perShopRate;
      existing.durationDays = plan.durationDays;
      existing.graceDays = plan.graceDays;
      existing.isActive = plan.isActive;
      await existing.save();
      console.log(`Updated: ${plan.planCode}`);
    } else {
      await SubscriptionPlan.create(plan);
      console.log(`Created: ${plan.planCode}`);
    }
  }

  console.log("Seeding done.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

// node src/scripts/seedSubscriptionPlans.js
