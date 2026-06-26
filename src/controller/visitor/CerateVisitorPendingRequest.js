const Visitor = require("../models/VisitorModel");
const Member = require("../models/Member"); // your Member/User model
const { sendFCMNotification } = require("../utils/fcm"); // your FCM helper

const NOTIFICATION_TTL_SECONDS = 60; // 1 minute

// ─────────────────────────────────────────────────────────────────
// POST /api/visitor/create-pending
// Guard fills form → sends FCM to member → creates Pending record
// Body: { buildingCode, name, mobile?, purpose, photoUrl?,
//         flatNo, memberId, guardId }
// ─────────────────────────────────────────────────────────────────
const createVisitorPendingRequest = async (req, res) => {
  try {
    const { buildingCode, name, photoUrl, flatNo, memberId, guardId } =
      req.body;

    // validation
    if (
      !buildingCode ||
      !name ||
      !photoUrl ||
      !flatNo ||
      !memberId ||
      !guardId
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    const members = await Member.find({
      buildingCode,
      flatNo,
      fcmToken: { $exists: true, $ne: null },
    }).select("name fcmToken");
    if (!members.length) {
      return res
        .status(404)
        .json({ message: "Flat mein koi member nahi mila" });
    }

    // sabko ek saath FCM bhejo
    await Promise.allSettled(
      members.map((m) =>
        sendFCMNotification({
          token: m.fcmToken,
          title: "Visitor is waiting at Gate",
          body: `${name} aaya hai. Approve ya Deny karo.`,
          data: {
            type: "VISITOR_APPROVAL",
            visitorId: visitor._id.toString(),
            flatNo,
            expiresAt,
          },
        })
      )
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + NOTIFICATION_TTL_SECONDS * 1000);

    // create record
    const visitor = await Visitor.create({
      buildingCode,
      name,
      photoUrl,
      flatNo,
      memberId,
      guardId,
      status: "Pending",
      notificationSentAt: now,
      notificationExpiresAt: expiresAt,
      entryTime: now,
    });

    // send FCM to member
    if (member.fcmToken) {
      await sendFCMNotification({
        token: member.fcmToken,
        title: `Visitor is waiting at Gate`,
        body: `${name} aaya hai aapke liye. Approve ya Deny karo.`,
        data: {
          type: "VISITOR_APPROVAL",
          visitorId: visitor._id.toString(),
          visitorName: name,
          flatNo,
          expiresAt: expiresAt.toISOString(),
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Visitor request created, member ko notification bheji",
      data: {
        visitorId: visitor._id,
        notificationExpiresAt: expiresAt,
        ttlSeconds: NOTIFICATION_TTL_SECONDS,
      },
    });
  } catch (error) {
    console.error("createVisitorPendingRequest error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default createVisitorPendingRequest;
