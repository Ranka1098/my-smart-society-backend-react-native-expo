import Visitor from "../../model/Visitor.js";
import Member from "../../model/Member.js";
import { sendFCM } from "../notifcation/sendFcmNotification.js";
import sharp from "sharp";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";

const NOTIFICATION_TTL = 60;

const createVisitorPendingRequest = async (req, res) => {
  try {
    const { buildingCode, name, mobile, purpose, flatNo } = req.body;
    const guardId = req.staff._id;

    if (!buildingCode || !name || !purpose || !flatNo) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }

    let photoUrl = null;
    if (req.file) {
      if (!req.file.mimetype.startsWith("image")) {
        return res
          .status(400)
          .json({ success: false, message: "Only image files allowed" });
      }
      const compressed = await sharp(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      const uploaded = await uploadToCloudinary(compressed, "visitorPhotos");
      photoUrl = uploaded.secure_url;
    }

    // Fetch ALL members of flat (FCM token optional — socket needs _id)
    const members = await Member.find({
      buildingCode,
      unitNo: flatNo,
    }).select("_id fcmToken");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + NOTIFICATION_TTL * 1000);

    const visitor = await Visitor.create({
      buildingCode,
      name,
      mobile: mobile || null,
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

    const io = req.app.get("io");

    // ── FCM: sirf jinke paas token hai ──
    const membersWithToken = members.filter((m) => m.fcmToken);
    if (membersWithToken.length > 0) {
      const tokens = membersWithToken.map((m) => m.fcmToken);
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

    // ── SOCKET: saare flat members ko visitor_request emit karo ──
    const visitorPayload = {
      visitorId: visitor._id.toString(),
      name,
      purpose,
      photoUrl: photoUrl || null,
      flatNo,
      buildingCode,
      ttlSeconds: NOTIFICATION_TTL,
      expiresAt: expiresAt.toISOString(),
    };

    members.forEach((m) => {
      io.to(`member_${m._id}`).emit("visitor_request", visitorPayload);
    });

    // ── Guard ko pending confirm ──
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
        photoUrl,
      },
    });
  } catch (error) {
    console.error("createVisitorPendingRequest error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default createVisitorPendingRequest;
