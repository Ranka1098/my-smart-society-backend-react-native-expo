import Visitor from "../../model/Visitor.js";
import Member from "../../model/member.js";
import { sendFCM } from "../notifcation/sendFcmNotification.js";
import sharp from "sharp";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";
import NotificationModel from "../../model/notification.js";

const NOTIFICATION_TTL = 60;
const MEMBER_TYPES = ["Flat", "Shop"];

const isStr = (v) => typeof v === "string" && v.trim().length > 0;

const createVisitorPendingRequest = async (req, res) => {
  try {
    const guardId = req.staff._id;

    // Building token se lo. Body se lene par guard kisi bhi building ke liye request bana sakta hai.
    // NOTE: req.staff.buildingCode set na ho to body fallback chalega.
    // Confirm hone ke baad fallback hata do.
    const buildingCode = req.staff?.buildingCode || req.body.buildingCode;
    const { name, mobile, purpose, flatNo, memberType } = req.body;

    // ── VALIDATION (string check = NoSQL injection se bachav bhi) ──
    if (![buildingCode, name, purpose, flatNo].every(isStr)) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }
    if (memberType !== undefined && !MEMBER_TYPES.includes(memberType)) {
      return res
        .status(400)
        .json({ success: false, message: "memberType must be Flat or Shop" });
    }
    if (req.file && !req.file.mimetype.startsWith("image")) {
      return res
        .status(400)
        .json({ success: false, message: "Only image files allowed" });
    }

    const code = buildingCode.trim();
    const unit = flatNo.trim();
    const visitorName = name.trim();
    const type = memberType || "Flat";

    // ── MEMBERS PEHLE (photo upload se pehle) ──
    // Koi member nahi to request ka matlab nahi. Bhoot Pending entries "Visitors" count badhati thi.
    const members = await Member.find({
      buildingCode: code,
      unitNo: unit,
      memberType: type,
    }).select("_id fcmToken");

    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        message: `${type === "Shop" ? "Shop" : "Flat"} ${unit} me koi member nahi mila`,
      });
    }

    // ── PHOTO ──
    let photoUrl = null;
    if (req.file) {
      const compressed = await sharp(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      const uploaded = await uploadToCloudinary(compressed, "visitorPhotos");
      photoUrl = uploaded.secure_url;
    }

    // ── CREATE ──
    const now = new Date();
    const expiresAt = new Date(now.getTime() + NOTIFICATION_TTL * 1000);

    const visitor = await Visitor.create({
      buildingCode: code,
      name: visitorName,
      mobile: isStr(mobile) ? mobile.trim() : null,
      purpose,
      photoUrl,
      flatNo: unit,
      memberType: type,
      guardId,
      notifiedMembers: members.map((m) => m._id),
      status: "Pending",
      notificationSentAt: now,
      notificationExpiresAt: expiresAt,
      entryTime: now,
    });

    // ══════════════════════════════════════════════
    // NOTIFICATIONS: best-effort, har channel alag.
    // Visitor save ho chuka hai. Yahan fail hone par 500 gaya to guard retry karega
    // aur duplicate entry banegi (Visitors count bigadta hai).
    // ══════════════════════════════════════════════
    const io = req.app.get("io");

    // DB notification
    try {
      await NotificationModel.insertMany(
        members.map((m) => ({
          buildingCode: code,
          type: "VISITOR_ARRIVED",
          audience: "SPECIFIC_MEMBER",
          receiverId: m._id,
          receiverModel: "MEMBER",
          title: "Visitor at Gate",
          message: `${visitorName} aaya hai, approve/deny karo.`,
          referenceId: visitor._id,
          referenceModel: "Visitor",
          data: { flatNo: unit, purpose, photoUrl: photoUrl || "" },
        })),
      );
    } catch (e) {
      console.error("createVisitorPendingRequest db-notification error:", e);
    }

    // FCM: sirf jinke paas token hai
    try {
      const tokens = members.map((m) => m.fcmToken).filter(Boolean);
      if (tokens.length > 0) {
        await sendFCM(
          tokens,
          "Visitor at Gate 🔔",
          `${visitorName} aaya hai. Approve ya Deny karo.`,
          {
            type: "VISITOR_APPROVAL",
            visitorId: visitor._id.toString(),
            flatNo: unit,
            memberType: type,
            visitorName,
            purpose,
            photoUrl: photoUrl || "",
            expiresAt: expiresAt.toISOString(),
            serverTime: String(Date.now()),
          },
        );
      }
    } catch (e) {
      console.error("createVisitorPendingRequest fcm error:", e);
    }

    // Socket: flat members + guard
    try {
      const visitorPayload = {
        visitorId: visitor._id.toString(),
        name: visitorName,
        purpose,
        photoUrl,
        flatNo: unit,
        memberType: type,
        buildingCode: code,
        ttlSeconds: NOTIFICATION_TTL,
        expiresAt: expiresAt.toISOString(),
      };

      members.forEach((m) => {
        io?.to(`member_${m._id}`).emit("visitor_request", {
          ...visitorPayload,
          serverTime: Date.now(),
        });
      });

      io?.to(`guard_${code}`).emit("visitor_pending", {
        visitorId: visitor._id,
        name: visitorName,
        flatNo: unit,
        expiresAt,
      });
    } catch (e) {
      console.error("createVisitorPendingRequest socket error:", e);
    }

    return res.status(201).json({
      success: true,
      data: {
        visitorId: visitor._id,
        notificationExpiresAt: expiresAt,
        ttlSeconds: NOTIFICATION_TTL,
        membersNotified: members.length,
        photoUrl,
        serverTime: Date.now(),
      },
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("createVisitorPendingRequest error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default createVisitorPendingRequest;
