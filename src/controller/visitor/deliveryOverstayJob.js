import Visitor from "../../model/Visitor.js";
import Staff from "../../model/staff.js";
import { sendFCM } from "../notifcation/sendFcmNotification.js";

const INTERVAL_MS = 1000; // 1 sec check, alert exact time pe
const REPEAT_MS = 2 * 60 * 1000;
// const REPEAT_MS = 30 * 1000;

export const startDeliveryOverstayJob = (io) => {
  setInterval(async () => {
    try {
      const now = new Date();

      const due = await Visitor.find({
        purpose: { $in: ["Delivery", "Cab"] },
        status: { $in: ["Approved", "ForcedEntry"] },
        exitTime: null,
        nextOverstayAlertAt: { $lte: now },
      })
        .select("_id nextOverstayAlertAt")
        .limit(50)
        .lean();

      for (const d of due) {
        const scheduled = d.nextOverstayAlertAt;

        // atomic claim: wahi schedule match ho tabhi update, duplicate alert nahi
        const v = await Visitor.findOneAndUpdate(
          { _id: d._id, exitTime: null, nextOverstayAlertAt: scheduled },
          {
            $set: {
              overstayAlertedAt: now,
              nextOverstayAlertAt: new Date(now.getTime() + REPEAT_MS),
            },
            $inc: { overstayAlertCount: 1 },
          },
          { new: true },
        );
        if (!v) continue;

        const unit = `${v.memberType === "Shop" ? "Shop" : "Flat"} ${v.flatNo}`;
        const who = `${v.name}${v.subType ? ` (${v.subType})` : ""}`;

        io.to(`guard_${v.buildingCode}`).emit("delivery_overstay", {
          visitorId: v._id,
          purpose: v.purpose,
          name: v.name,
          subType: v.subType || "",
          vehicleNo: v.vehicleNo || "",
          flatNo: v.flatNo,
          memberType: v.memberType,
          exitDeadline: v.exitDeadline,
          alertNo: v.overstayAlertCount,
          minsInside: Math.floor((now - new Date(v.entryTime)) / 60000),
        });

        try {
          const guards = await Staff.find({
            buildingCode: v.buildingCode,
            fcmToken: { $exists: true, $ne: null },
          })
            .select("fcmToken")
            .lean();

          const mins = Math.floor((now - new Date(v.entryTime)) / 60000);
          const who =
            v.purpose === "Cab"
              ? `Cab${v.vehicleNo ? ` ${v.vehicleNo}` : ""}`
              : `${v.name}${v.subType ? ` (${v.subType})` : ""}`;
          await sendFCM(
            tokens,
            `${v.purpose} Overstay ⚠️`,
            `${who} ko ${unit} me ${mins} min ho gaye. Exit nahi hua.`,
            {
              type: "DELIVERY_OVERSTAY",
              purpose: v.purpose,
              visitorId: v._id.toString(),
              flatNo: v.flatNo,
              memberType: v.memberType || "Flat",
            },
          );
        } catch (e) {
          console.error("overstay fcm error:", e);
        }
      }
    } catch (e) {
      console.error("deliveryOverstayJob error:", e);
    }
  }, INTERVAL_MS);
};
