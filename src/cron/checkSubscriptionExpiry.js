// cron/checkSubscriptionExpiry.js
// Roz raat 12:01 AM chalta. 2 kaam: (1) reminders bhejo (2) expiry cross ho gayi to status="expired" kar do.
// Grace/lockLevel/plan — kuch nahi, simple system.

import cron from "node-cron";
import Building from "../model/building.js";
// import sendFCM from "../utils/sendFCM.js"; // apna existing FCM helper yahan plug karo

const REMINDER_DAYS_BEFORE = [2, 1, 0]; // 2 din pehle, 1 din pehle, expiry wale din

const notify = async (building, event, message) => {
  console.log(`[notify] ${building.buildingCode} -> ${event}: ${message}`);
  // FCM call yahan: sendFCM(building.admin fcmToken, { title: event, body: message })
};

const checkSubscriptionExpiry = (io) => {
  cron.schedule("1 0 * * *", async () => {
    try {
      const now = new Date();

      /* ===== 1. REMINDERS — active buildings jinki expiry 7 din ke andar hai ===== */
      const upcomingWindow = new Date(now);
      upcomingWindow.setDate(upcomingWindow.getDate() + 2);

      const activeBuildings = await Building.find({
        subscriptionStatus: "active",
        subscriptionExpiry: { $lte: upcomingWindow },
      });

      for (const building of activeBuildings) {
        const daysLeft = Math.ceil(
          (building.subscriptionExpiry - now) / (1000 * 60 * 60 * 24)
        );

        for (const d of REMINDER_DAYS_BEFORE) {
          if (daysLeft === d && !building.remindersSent.includes(d)) {
            const expiryText = building.subscriptionExpiry.toLocaleString(
              "en-IN",
              {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }
            );

            const msg =
              d === 0
                ? `Aapka subscription aaj, ${expiryText} baje expire ho jayega. Turant renew karein.`
                : `Aapka subscription ${d} din baad, ${expiryText} ko expire ho jayega. Time rehte renew kar lein.`;

            await notify(building, "subscription_reminder", msg);
            if (io) {
              io.to(building.buildingCode).emit("subscription_reminder", {
                buildingCode: building.buildingCode,
                daysLeft: d,
                message: msg,
              });
            }
            building.remindersSent.push(d);
            await building.save();
          }
        }
      }

      /* ===== 2. active -> expired (expiry cross ho gayi) ===== */
      const justExpired = await Building.find({
        subscriptionStatus: "active",
        subscriptionExpiry: { $lte: now },
      });

      for (const building of justExpired) {
        building.subscriptionStatus = "expired";
        building.remindersSent = []; // reset, agla renewal fresh reminders bhejega

        building.subscriptionHistory.push({
          subscriptionType: building.subscriptionType,
          subscriptionStartDate: building.subscriptionStartDate,
          subscriptionExpiry: building.subscriptionExpiry,
          subscriptionStatus: "expired",
          paymentStatus: building.paymentStatus,
          action: "Subscription expired — system",
          changedBy: { role: "system", id: null },
          changedAt: now,
        });

        await building.save();

        const message =
          "Aapka subscription expire ho chuka hai. Chalu rakhne ke liye turant renew karein.";
        await notify(building, "subscription_expired", message);
        if (io) {
          const payload = { buildingCode: building.buildingCode, message };
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

        console.log(`Expired: ${building.buildingCode}`);
      }
    } catch (error) {
      console.error("checkSubscriptionExpiry cron error:", error.message);
    }
  });

  console.log("Subscription expiry cron scheduled (daily 12:01 AM)");
};

export default checkSubscriptionExpiry;
