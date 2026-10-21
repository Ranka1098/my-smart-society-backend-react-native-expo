import mongoose from "mongoose";
import Visitor from "../../model/Visitor.js";
import Member from "../../model/member.js";
import { sendFCM } from "../notifcation/sendFcmNotification.js";
import sharp from "sharp";
import NotificationModel from "../../model/notification.js";
import { emitGuardSync } from "../../utils/guardSync.js";
import uploadToCloudinary, {
  THUMB,
  thumbOf,
} from "../../cloudinary/uploadToCloudinary.js";
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
  Cab: { mobile: "optional", vehicle: "required", sub: true },
  Service: { mobile: "required", vehicle: "optional", sub: true },
  Other: { mobile: "optional", vehicle: "optional", sub: false },
};

const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const str = (v) => (typeof v === "string" ? v.trim() : "");

// ── ATOMIC UNIT LOCK ──
// Do guard ek saath bhejein to check-then-create race se dono pass ho jate the.
// Yahan Mongo khud ek hi guard ko lock deta hai (_id unique). Multi-server me bhi safe.
const LOCK_MS = 30 * 1000; // crash hone par bhi 30 sec baad khud khul jata hai
const UnitLock =
  mongoose.models.VisitorUnitLock ||
  mongoose.model(
    "VisitorUnitLock",
    new mongoose.Schema({
      _id: String,
      lockedUntil: Date,
      guardName: String,
    }),
  );

const acquireUnitLock = async (key, guardName) => {
  const now = new Date();
  try {
    // filter match = lock free/expired. Locked ho to upsert insert try karta hai
    // aur same _id par E11000 aata hai = koi aur guard ke paas lock hai.
    await UnitLock.findOneAndUpdate(
      { _id: key, lockedUntil: { $lte: now } },
      { $set: { lockedUntil: new Date(now.getTime() + LOCK_MS), guardName } },
      { upsert: true },
    );
    return { ok: true };
  } catch (e) {
    if (e?.code === 11000) {
      const cur = await UnitLock.findById(key).select("guardName").lean();
      return { ok: false, guardName: cur?.guardName };
    }
    throw e;
  }
};



const releaseUnitLock = (key) =>
  UnitLock.updateOne(
    { _id: key },
    { $set: { lockedUntil: new Date(0) } },
  ).catch((e) => console.error("releaseUnitLock error:", e));

const findPendingForUnit = (code, unit, type) =>
  Visitor.findOne({
    buildingCode: code,
    flatNo: unit,
    memberType: type,
    status: "Pending",
    verificationMethod: { $ne: "OTP" },
    notificationExpiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select("name guardName")
    .lean();

const createVisitorPendingRequest = async (req, res) => {
  let lockKey = null;
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
        purpose === "Service" ? "Kaam ka type chuno" : "Company chuno",
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
    const unitLabelTxt = `${type === "Shop" ? "Shop" : "Flat"} ${unit}`;

    // 1) ATOMIC LOCK: ek waqt me sirf ek guard is flat/shop par request bana sakta hai
    const key = `${code}:${type}:${unit}`;
    const lock = await acquireUnitLock(key, guardName);
    if (!lock.ok) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: `${unitLabelTxt} par ${
          lock.guardName || "dusra guard"
        } abhi request bhej raha hai. Visitor ko thodi der wait karne ko kaho.`,
      });
    }
    lockKey = key;

    // 2) Pehle se member ke paas pending request?
    const existing = await findPendingForUnit(code, unit, type);
    if (existing) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: `${unitLabelTxt} ke member ke paas ${
          existing.guardName || "dusre guard"
        } ki ${existing.name} wali request pehle se gayi hai. Visitor ko thodi der wait karne ko kaho.`,
      });
    }

    // ── PHOTO ──
    let photoUrl;
    try {
      const compressed = await sharp(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      // eager = thumb upload ke saath hi ban jaata hai (sync)
      const up = await uploadToCloudinary(compressed, "visitorPhotos", {
        eager: [THUMB],
      });
      photoUrl = up.secure_url;
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

    // CDN ready hone tak wait (max ~3 sec)
    const waitForImage = async (url, tries = 6) => {
      for (let i = 0; i < tries; i++) {
        try {
          const r = await fetch(url, { method: "HEAD" });
          if (r.ok) return true;
        } catch {}
        await new Promise((r) => setTimeout(r, 500));
      }
      return false;
    };
    await waitForImage(thumbOf(photoUrl), 4);

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

        // TIE-BREAK: race me dono create ho gaye ho to chhoti _id wala jeetega
    const winner = await Visitor.findOne({
      buildingCode: code,
      flatNo: unit,
      memberType: type,
      status: "Pending",
      verificationMethod: { $ne: "OTP" },
      notificationExpiresAt: { $gt: new Date() },
      _id: { $lt: visitor._id },
    })
      .select("name guardName")
      .lean();
    if (winner) {
      await Visitor.deleteOne({ _id: visitor._id });
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: `${unitLabelTxt} ke member ke paas ${
          winner.guardName || "dusre guard"
        } ki ${winner.name} wali request pehle se gayi hai. Visitor ko thodi der wait karne ko kaho.`,
      });
    }
    // Visitor "Pending" ban gaya: ab wahi block karega, lock chhod do
    await releaseUnitLock(lockKey);
    lockKey = null;
    emitGuardSync(req, code, { action: "CREATE", visitorId: visitor._id });
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
        const r = await sendFCM(
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
        if (r?.deadTokens?.length) {
          await Member.updateMany(
            { fcmToken: { $in: r.deadTokens } },
            { $unset: { fcmToken: "" } },
          );
        }
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
        createdAt: visitor.createdAt, // ← add
      },
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("createVisitorPendingRequest error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  } finally {
    // koi bhi early return/error ho, lock nahi atakna chahiye
    if (lockKey) await releaseUnitLock(lockKey);
  }
};

export default createVisitorPendingRequest;
