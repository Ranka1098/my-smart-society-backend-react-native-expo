// jobs/autoExitStaleVisitors.js
import cron from "node-cron";
import Visitor from "../model/Visitor.js";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const autoExitStaleVisitors = async () => {
  const today = new Date(Date.now() + IST_OFFSET_MS).toISOString().split("T")[0];
  const startOfTodayIST = new Date(`${today}T00:00:00.000+05:30`);

  const result = await Visitor.updateMany(
    {
      status: { $in: ["Approved", "ForcedEntry"] },
      exitTime: null,
      entryTime: { $lt: startOfTodayIST },
    },
    { $set: { status: "Exited", exitTime: startOfTodayIST } },
  );
  console.log(`autoExitStaleVisitors: ${result.modifiedCount} closed`);
};

// roz 12:05 AM IST
export const startAutoExitJob = () =>
  cron.schedule("5 0 * * *", autoExitStaleVisitors, {
    timezone: "Asia/Kolkata",
  });