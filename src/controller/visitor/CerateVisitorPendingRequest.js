import Visitor from "../../model/Visitor.js";
import Member from "../../model/Member.js";
import { sendFCM } from "../notifcation/sendFcmNotification.js";

const NOTIFICATION_TTL = 60;

const createVisitorPendingRequest = async (req, res) => {
  try {
    const { buildingCode, name, mobile, purpose, photoUrl, flatNo } = req.body;
    const guardId = req.staff._id; // staffAuth middleware se

    if (!buildingCode || !name || !purpose || !flatNo) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    // flat ke members fetch karo
    const members = await Member.find({
      buildingCode,
      flatNo,
      fcmToken: { $exists: true, $ne: null },
    }).select("_id fcmToken");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + NOTIFICATION_TTL * 1000);

    // PEHLE create karo (visitor._id chahiye FCM data mein)
    const visitor = await Visitor.create({
      buildingCode,
      name,
      mobile,
      purpose,
      photoUrl,
      flatNo,
      guardId,
      notifiedMembers: members.map((m) => m._id),
      status: "Pending",
      notificationSentAt: now,
      notificationExpiresAt: expiresAt,
      entryTime: now,
    });

    // PHIR FCM bhejo
    if (members.length > 0) {
      const tokens = members.map((m) => m.fcmToken);
      await sendFCM(
        tokens,
        "Visitor at Gate 🔔",
        `${name} aaya hai. Approve ya Deny karo.`,
        {
          type: "VISITOR_APPROVAL",
          visitorId: visitor._id.toString(),
          flatNo,
          visitorName: name,
          purpose,
          photoUrl: photoUrl || "",
          expiresAt: expiresAt.toISOString(),
        }
      );
    }

    // Guard ke socket room ko bhi emit (real-time tracking ke liye)
    const io = req.app.get("io");
    io.to(`guard_${guardId}`).emit("visitor_pending", {
      visitorId: visitor._id,
      name,
      flatNo,
      expiresAt,
    });

    return res.status(201).json({
      success: true,
      data: {
        visitorId: visitor._id,
        notificationExpiresAt: expiresAt,
        ttlSeconds: NOTIFICATION_TTL,
        membersNotified: members.length,
      },
    });
  } catch (error) {
    console.error("createVisitorPendingRequest error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
export default createVisitorPendingRequest;
