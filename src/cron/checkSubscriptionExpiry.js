import cron from "node-cron";
import Building from "../model/building.js";
import Admin from "../model/admin.js"; // ← apne Admin model ka sahi path
import { sendFCM } from "../controller/notifcation/sendFcmNotification.js"; // ← sahi path

const TZ = { timezone: "Asia/Kolkata" };
const REMINDER_DAYS_BEFORE = [2, 1, 0];
const DAY_MS = 1000 * 60 * 60 * 24;

const NOTIFY_TITLE = {
  subscription_reminder: "Subscription Reminder ⏰",
  subscription_expired: "Subscription Expired ❌",
};

const notify = async (building, event, message) => {
  console.log(`[notify] ${building.buildingCode} -> ${event}: ${message}`);

  // push fail hone par cron nahi tootna chahiye
  try {
    const admin = await Admin.findById(building.admin).select("fcmToken");
    const token = admin?.fcmToken;

    if (!token) {
      console.log(`[notify] no fcmToken for admin of ${building.buildingCode}`);
      return;
    }

    const res = await sendFCM(
      [token],
      NOTIFY_TITLE[event] || "Subscription",
      message,
      {
        type: event.toUpperCase(), // SUBSCRIPTION_REMINDER / SUBSCRIPTION_EXPIRED
        buildingCode: building.buildingCode,
      },
    );

    // dead token (app uninstall / token expire) DB se hata do
    if (res.deadTokens.includes(token)) {
      await Admin.updateOne(
        { _id: building.admin },
        { $unset: { fcmToken: "" } },
      );
      console.log(`[notify] dead token removed for ${building.buildingCode}`);
    }
  } catch (err) {
    console.error(
      `[notify] FCM failed for ${building.buildingCode}:`,
      err.message,
    );
  }
};

/* ===== 1. active -> expired (har 15 min) ===== */
const expireDueBuildings = async (io) => {
  const now = new Date();
  const due = await Building.find({
    subscriptionStatus: "active",
    subscriptionExpiry: { $lte: now },
  });

  for (const building of due) {
    try {
      building.subscriptionStatus = "expired";
      building.paymentStatus = "pending";
      building.remindersSent = [];

      building.subscriptionHistory.push({
        subscriptionType: building.subscriptionType,
        billedFlats: building.lastBilledFlats,
        billedShops: building.lastBilledShops,
        amount: 0,
        subscriptionStartDate: building.subscriptionStartDate,
        subscriptionExpiry: building.subscriptionExpiry,
        subscriptionStatus: "expired",
        paymentStatus: "pending",
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
        io.to(building.buildingCode).emit("dashboard_update");
        io.to(building.buildingCode).emit("subscription_status_changed", {
          buildingCode: building.buildingCode,
          subscriptionStatus: "expired",
        });
        for (const room of [
          building.buildingCode,
          `admin_${building.buildingCode}`,
          `members_${building.buildingCode}`,
          `guard_${building.buildingCode}`,
        ]) {
          io.to(room).emit("subscription_expired", payload);
        }
      }
      console.log(`Expired: ${building.buildingCode}`);
    } catch (err) {
      console.error("expire failed:", building.buildingCode, err.message);
    }
  }
};

/* ===== 2. Reminders (roz 12:01 AM IST) ===== */
const sendReminders = async (io) => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 3 * DAY_MS);

  const buildings = await Building.find({
    subscriptionStatus: "active",
    subscriptionExpiry: { $gt: now, $lte: windowEnd }, // sirf abhi expire nahi hui
  });

  for (const building of buildings) {
    try {
      const daysLeft = Math.floor((building.subscriptionExpiry - now) / DAY_MS);
      if (!REMINDER_DAYS_BEFORE.includes(daysLeft)) continue;
      if (building.remindersSent.includes(daysLeft)) continue;

      const expiryText = building.subscriptionExpiry.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const msg =
        daysLeft === 0
          ? `Aapka subscription aaj, ${expiryText} baje expire ho jayega. Turant renew karein.`
          : `Aapka subscription ${daysLeft} din baad, ${expiryText} ko expire ho jayega. Time rehte renew kar lein.`;

      await notify(building, "subscription_reminder", msg);
      if (io) {
        io.to(building.buildingCode).emit("subscription_reminder", {
          buildingCode: building.buildingCode,
          daysLeft,
          message: msg,
        });
      }
      building.remindersSent.push(daysLeft);
      await building.save();
    } catch (err) {
      console.error("reminder failed:", building.buildingCode, err.message);
    }
  }
};

const checkSubscriptionExpiry = (io) => {
  // server start par catch-up (miss hua run recover ho jayega)
  expireDueBuildings(io).catch((e) =>
    console.error("expiry startup:", e.message),
  );

  cron.schedule(
    "*/15 * * * *",
    () =>
      expireDueBuildings(io).catch((e) =>
        console.error("expiry cron:", e.message),
      ),
    TZ,
  );
  cron.schedule(
    "1 0 * * *",
    () =>
      sendReminders(io).catch((e) =>
        console.error("reminder cron:", e.message),
      ),
    TZ,
  );

  console.log(
    "Subscription cron scheduled (expiry every 15 min, reminders daily 12:01 AM IST)",
  );
};

export default checkSubscriptionExpiry;
