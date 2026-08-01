// cron/checkSubscriptionExpiry.js
import cron from "node-cron";
import Building from "../model/building.js";
import SubscriptionPlan from "../model/subscriptionPlanSchema.js";
// import sendFCM from "../utils/sendFCM.js"; // apna existing FCM helper yahan plug karo

const REMINDER_DAYS_BEFORE = [7, 1, 0]; // 7 din pehle, 1 din pehle, expiry wale din

const notify = async (building, event, message) => {
  console.log(`[notify] ${building.buildingCode} -> ${event}: ${message}`);
  // FCM call yahan: sendFCM(building.admin fcmToken, { title: event, body: message })
};

/**
 * Daily 12:01 AM. Sirf active/grace buildings pe kaam karta hai.
 * "blocked" buildings ko ye cron KABHI touch nahi karta — wo sirf
 * superadmin ke unblock action se hi nikalti hain.
 */
const checkSubscriptionExpiry = (io) => {
  cron.schedule("1 0 * * *", async () => {
    try {
      const now = new Date();

      /* ===== 1. REMINDERS — active buildings jinki expiry paas hai ===== */
      const upcomingWindow = new Date(now);
      upcomingWindow.setDate(upcomingWindow.getDate() + 8);

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
            const msg =
              d === 0
                ? "Your building subscription expires today, please renew to avoid interruption"
                : `Your building subscription expires in ${d} day(s), please renew`;

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

      /* ===== 2. active -> grace (expiry cross ho gayi) ===== */
      const justExpired = await Building.find({
        subscriptionStatus: "active",
        subscriptionExpiry: { $lte: now },
      });

      for (const building of justExpired) {
        // graceDays plan se aata hai (agar plan na mile to 2 din default — aaj+kal)
        let graceDays = 2;
        if (building.plan) {
          const plan = await SubscriptionPlan.findById(building.plan);
          if (plan?.graceDays !== undefined) graceDays = plan.graceDays;
        }

        const graceEnd = new Date(now);
        graceEnd.setDate(graceEnd.getDate() + graceDays);

        building.subscriptionStatus = "grace";
        building.lockLevel = "read_only";
        building.graceEndsAt = graceEnd;

        building.subscriptionHistory.push({
          planCode: building.subscriptionType,
          subscriptionType: building.subscriptionType,
          subscriptionStartDate: building.subscriptionStartDate,
          subscriptionExpiry: building.subscriptionExpiry,
          subscriptionStatus: "grace",
          paymentStatus: building.paymentStatus,
          action: `Entered grace period (${graceDays} days) — system`,
          changedBy: { role: "system", id: null },
          changedAt: now,
        });

        await building.save();

        const message = `Subscription expired. ${graceDays} day(s) grace period — new data entry locked, existing data visible.`;
        await notify(building, "subscription_grace", message);
        if (io) {
          const payload = {
            buildingCode: building.buildingCode,
            message,
            graceEndsAt: graceEnd,
          };
          io.to(building.buildingCode).emit("subscription_grace", payload);
          io.to(`admin_${building.buildingCode}`).emit(
            "subscription_grace",
            payload
          );
        }

        console.log(`Entered grace: ${building.buildingCode}`);
      }

      /* ===== 3. grace -> expired (grace bhi khatam) -> FULL LOCK ===== */
      const graceOver = await Building.find({
        subscriptionStatus: "grace",
        graceEndsAt: { $lte: now },
      });

      for (const building of graceOver) {
        building.subscriptionStatus = "expired";
        building.lockLevel = "full_lock";

        building.subscriptionHistory.push({
          planCode: building.subscriptionType,
          subscriptionType: building.subscriptionType,
          subscriptionStartDate: building.subscriptionStartDate,
          subscriptionExpiry: building.subscriptionExpiry,
          subscriptionStatus: "expired",
          paymentStatus: building.paymentStatus,
          action: "Grace period ended — fully locked (system)",
          changedBy: { role: "system", id: null },
          changedAt: now,
        });

        await building.save();

        // force logout: frontend socket listen karke auth clear + login redirect kare
        const message =
          "Grace period ended. Subscription expired, please renew to continue.";
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

        console.log(`Fully expired (locked): ${building.buildingCode}`);
      }
    } catch (error) {
      console.error("checkSubscriptionExpiry cron error:", error.message);
    }
  });

  console.log("Subscription expiry cron scheduled (daily 12:01 AM)");
};

export default checkSubscriptionExpiry;
