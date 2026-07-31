// cron/checkSubscriptionExpiry.js
import cron from "node-cron";
import Building from "../model/building.js";

// Runs every day at 12:01 AM
const checkSubscriptionExpiry = (io) => {
  cron.schedule("1 0 * * *", async () => {
    try {
      const now = new Date();

      const expiredBuildings = await Building.find({
        subscriptionStatus: "active",
        subscriptionExpiry: { $lte: now },
      });

      if (expiredBuildings.length === 0) return;

      for (const building of expiredBuildings) {
        building.subscriptionStatus = "expired";
        building.expiredNotified = true;

        building.subscriptionHistory.push({
          subscriptionType: building.subscriptionType,
          subscriptionStartDate: building.subscriptionStartDate,
          subscriptionExpiry: building.subscriptionExpiry,
          subscriptionStatus: "expired",
          paymentStatus: building.paymentStatus,
          changedAt: now,
        });

        await building.save();

        // force logout: emit to building room, frontend listens & clears auth + redirects to login
        if (io) {
          const payload = {
            buildingCode: building.buildingCode,
            message: "Building subscription expired, please renew",
          };
          io.to(building.buildingCode).emit("subscription_expired", payload);
          io.to(`admin_${building.buildingCode}`).emit(
            "subscription_expired",
            payload
          );
          io.to(`members_${building.buildingCode}`).emit(
            "subscription_expired",
            payload
          );
          io.to(`guard_${building.buildingCode}`).emit(
            "subscription_expired",
            payload
          );
        }

        console.log(`Subscription expired: ${building.buildingCode}`);
      }
    } catch (error) {
      console.error("checkSubscriptionExpiry cron error:", error.message);
    }
  });

  console.log("Subscription expiry cron scheduled (daily 12:01 AM)");
};

export default checkSubscriptionExpiry;
