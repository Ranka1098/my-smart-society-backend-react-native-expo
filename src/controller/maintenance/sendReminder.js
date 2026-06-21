import Member from "../../model/member.js";
import Maintenance from "../../model/maintenance.js";
import Notification from "../../model/notification.js";
import { sendFCM } from "../notifcation/sendFcmNotification.js";

const sendReminder = async (req, res) => {
  try {
    const { memberId, month } = req.body;
    const buildingCode = req.buildingCode;
    const buildingId = req.admin?.buildingId; // ✅ admin token se, member me ye field nahi hai
    const io = req.app.get("io");

    if (!memberId || !month) {
      return res
        .status(400)
        .json({ success: false, message: "memberId and month required" });
    }

    if (!buildingId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }

    // Member find
    const member = await Member.findOne({ _id: memberId, buildingCode });
    if (!member) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    // Maintenance record find
    const maintenance = await Maintenance.findOne({
      memberId,
      buildingCode,
      month,
      status: "Pending",
    });
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: "No pending maintenance found for this month",
      });
    }

    const title = "Maintenance Reminder 🔔";
    const message = `Dear ${member.fullName}, your maintenance for ${month} of ₹${maintenance.amount} is pending. Please pay on time.`;
    const data = {
      month,
      amount: String(maintenance.amount),
      unitNo: String(member.unitNo),
    };

    // 1. DB save
    await Notification.create({
      buildingCode,
      buildingId, // ✅ fixed
      type: "MAINTENANCE_PAID",
      audience: "MEMBERS",
      title,
      message,
      referenceId: maintenance._id,
      referenceModel: "Maintenance",
      data,
    });

    // 2. Socket
    io.to(buildingCode).emit("notification", {
      type: "MAINTENANCE_PAID",
      title,
      message,
      data,
    });

    // 3. FCM
    if (member.fcmToken) {
      await sendFCM([member.fcmToken], title, message, data);
    }

    return res
      .status(200)
      .json({ success: true, message: "Reminder sent successfully" });
  } catch (error) {
    console.log("Send Reminder Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export default sendReminder;
