import Visitor from "../../model/Visitor.js";
import Member from "../../model/member.js";
import { sendFCM } from "../notifcation/sendFcmNotification.js";
import sharp from "sharp";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";
import NotificationModel from "../../model/notification.js";

const NOTIFICATION_TTL = 120;
const MEMBER_TYPES = ["Flat", "Shop"];
const PURPOSES = ["Guest", "Delivery", "Cab", "Service", "Other"];
const VEHICLE_TYPES = ["None", "2W", "3W", "4W"];
const MOBILE_RE = /^\d{10}$/;
const VEHICLE_RE = /^(\d{4}|[A-Z]{2}\d{2}[A-Z]{2}\d{4})$/;

// Frontend rules (TYPE_CONFIG) ka server-side copy. Frontend bypass hua to bhi data saaf rahe.
const RULES = {
  Guest: { mobile: "optional", vehicle: "optional", sub: false },
  Delivery: { mobile: "optional", vehicle: "optional", sub: true },
  Cab: { mobile: "optional", vehicle: "required", sub: false },
  Service: { mobile: "required", vehicle: "optional", sub: true },
  Other: { mobile: "optional", vehicle: "optional", sub: false },
};

const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const str = (v) => (typeof v === "string" ? v.trim() : "");

const createVisitorPendingRequest = async (req, res) => {
  try {
    const guardId = req.staff._id;
    const guardName = req.staff.workerName || "Guard";

    // Building token se. Confirm hone ke baad body fallback hata do.
    const buildingCode = req.staff?.buildingCode || req.body.buildingCode;
    const { name, purpose, flatNo, memberType } = req.body;

    // ── BASIC VALIDATION (string check = NoSQL injection se bachav) ──
    if (![buildingCode, name, purpose, flatNo].every(isStr)) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }
    if (!PURPOSES.includes(purpose)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid visitor type" });
    }
    if (memberType !== undefined && !MEMBER_TYPES.includes(memberType)) {
      return res
        .status(400)
        .json({ success: false, message: "memberType must be Flat or Shop" });
    }
    if (!req.file || !req.file.mimetype?.startsWith("image")) {
      return res
        .status(400)
        .json({ success: false, message: "Visitor ki photo zaroori hai" });
    }

    // ── TYPE-WISE VALIDATION ──
    const rule = RULES[purpose];
    const subType = str(req.body.subType).slice(0, 40);
    const mobile = str(req.body.mobile).replace(/\D/g, "").slice(-10);
    const vehicleNo = str(req.body.vehicleNo)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    let vehicleType = str(req.body.vehicleType);

    const bad = (message) => res.status(400).json({ success: false, message });

    if (rule.sub && !subType) {
      return bad(
        purpose === "Delivery" ? "Company chuno" : "Kaam ka type chuno",
      );
    }
    if (rule.mobile === "required" && !MOBILE_RE.test(mobile)) {
      return bad("Sahi 10 digit mobile number zaroori hai");
    }
    if (rule.mobile === "optional" && mobile && !MOBILE_RE.test(mobile)) {
      return bad("Sahi 10 digit mobile number daalo");
    }
    if (rule.vehicle === "required" && !VEHICLE_RE.test(vehicleNo)) {
      return bad("Gaadi ka number zaroori hai");
    }
    if (vehicleNo && !VEHICLE_RE.test(vehicleNo)) {
      return bad("Poora number (MH12RE1234) ya aakhri 4 digit daalo");
    }
    // safety net: purana app "2 Wheeler" / "4 Wheeler" bheje to map kar do
    if (vehicleType === "2 Wheeler") vehicleType = "2W";
    if (vehicleType === "3 Wheeler") vehicleType = "3W";
    if (vehicleType === "4 Wheeler") vehicleType = "4W";
    if (vehicleType && !VEHICLE_TYPES.includes(vehicleType)) {
      return bad("Invalid vehicleType");
    }

    const code = buildingCode.trim();
    const unit = flatNo.trim();
    const visitorName = name.trim().slice(0, 60);
    const type = memberType || "Flat";

    // ── MEMBERS PEHLE (photo upload se pehle) ──
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
    let photoUrl;
    try {
      const compressed = await sharp(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      photoUrl = (await uploadToCloudinary(compressed, "visitorPhotos"))
        .secure_url;
    } catch (e) {
      console.error("createVisitorPendingRequest photo error:", e);
      return res.status(502).json({
        success: false,
        message: "Photo upload nahi hui. Dobara try karo.",
      });
    }

    // ── CREATE ──
    const now = new Date();
    const expiresAt = new Date(now.getTime() + NOTIFICATION_TTL * 1000);

    const visitor = await Visitor.create({
      buildingCode: code,
      name: visitorName,
      mobile: mobile || null,
      purpose,
      subType: subType || undefined,
      vehicleNo: vehicleNo || undefined,
      vehicleType: vehicleNo ? vehicleType || undefined : "None",
      photoUrl,
      flatNo: unit,
      memberType: type,
      guardId,
      guardName,
      notifiedMembers: members.map((m) => m._id),
      status: "Pending",
      notificationSentAt: now,
      notificationExpiresAt: expiresAt,
      entryTime: now,
    });

    // ══════════════════════════════════════════════
    // NOTIFICATIONS: best-effort, har channel alag
    // ══════════════════════════════════════════════
    const io = req.app.get("io");
    const label = subType ? `${purpose} • ${subType}` : purpose;
    const vehicleTxt = vehicleNo ? ` | ${vehicleNo}` : "";

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
          message: `${visitorName} (${label})${vehicleTxt} aaya hai, approve/deny karo.`,
          referenceId: visitor._id,
          referenceModel: "Visitor",
          data: {
            flatNo: unit,
            purpose,
            subType: subType || "",
            vehicleNo: vehicleNo || "",
            photoUrl,
            guardName,
          },
        })),
      );
    } catch (e) {
      console.error("createVisitorPendingRequest db-notification error:", e);
    }

    // FCM (data values string hone chahiye)
    try {
      const tokens = members.map((m) => m.fcmToken).filter(Boolean);
      if (tokens.length > 0) {
        await sendFCM(
          tokens,
          "Visitor at Gate 🔔",
          `${visitorName} (${label})${vehicleTxt} aaya hai. Approve ya Deny karo.`,
          {
            type: "VISITOR_APPROVAL",
            visitorId: visitor._id.toString(),
            flatNo: unit,
            memberType: type,
            visitorName,
            purpose,
            subType: subType || "",
            vehicleNo: vehicleNo || "",
            vehicleType: visitor.vehicleType || "",
            guardName,
            photoUrl,
            expiresAt: expiresAt.toISOString(),
            serverTime: String(Date.now()),
          },
        );
      }
    } catch (e) {
      console.error("createVisitorPendingRequest fcm error:", e);
    }

    // Socket
    try {
      const visitorPayload = {
        visitorId: visitor._id.toString(),
        name: visitorName,
        purpose,
        subType: subType || "",
        vehicleNo: vehicleNo || "",
        vehicleType: visitor.vehicleType || "",
        mobile: mobile || "",
        guardName,
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
          createdAt: visitor.createdAt,   // ← add
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
