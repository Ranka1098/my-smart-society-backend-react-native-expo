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

    // 1. DB save — ✅ receiverId set karo, warna "MEMBERS"+receiverId:null = broadcast ban jata
    const notification = await Notification.create({
      buildingCode,
      buildingId,
      type: "MAINTENANCE_PENDING",
      audience: "MEMBERS",
      receiverId: member._id, // ✅ targeted — sirf isi member ka
      receiverModel: "MEMBER", // ✅
      title,
      message,
      referenceId: maintenance._id,
      referenceModel: "Maintenance",
      data,
    });

    // 2. Socket — ✅ sirf usi member ke room me emit, poore building me nahi
    const room = `member_${member._id.toString()}`;
    io.to(room).emit("notification", {
      _id: notification._id.toString(),
      type: "MAINTENANCE_PENDING",
      title,
      message,
      data,
      isRead: false,
      createdAt: notification.createdAt,
    });

    // 3. FCM
    if (member.fcmToken) {
      await sendFCM([member.fcmToken], title, message, {
        ...data,
        type: "MAINTENANCE_PENDING",
        _id: notification._id.toString(),
      });
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
