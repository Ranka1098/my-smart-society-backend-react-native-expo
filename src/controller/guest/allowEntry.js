import crypto from "crypto";
import mongoose from "mongoose";
import sharp from "sharp";
import Visitor from "../../model/Visitor.js";
import Staff from "../../model/staff.js";
import Member from "../../model/member.js";
import uploadToCloudinary from "../../cloudinary/uploadToCloudinary.js";
import { notifyStaffToMember } from "../notifcation/notifyMembers.js";

// ══════════════════════════════════════════════════════════
// CONFIG + HELPERS
// ══════════════════════════════════════════════════════════
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const OTP_RE = /^\d{4}$/;
const MAX_OTP_ATTEMPTS = 5;
const VEHICLE_TYPES = ["None", "2W", "4W"];
const VEHICLE_RE = /^(\d{4}|[A-Z]{2}\d{2}[A-Z]{2}\d{4})$/; // aakhri 4 digit (1234) ya poora number (MH12RE1234)

const MONTH_INDEX = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const todayIST = () =>
  new Date(Date.now() + IST_OFFSET_MS).toISOString().split("T")[0];

// Visitor.visitDate String hai: "2026-10-05" ya "05 Oct 2026" -> "2026-10-05"
// Parse na ho to null (guard ko rokna nahi hai)
const visitDateToISO = (raw) => {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (DATE_RE.test(s)) return s;

  const m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})$/);
  if (!m) return null;

  const monthIdx = MONTH_INDEX[m[2].toLowerCase()];
  if (monthIdx === undefined) return null;

  return `${m[3]}-${String(monthIdx + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};

// Constant-time compare (timing se OTP guess na ho)
const otpMatches = (stored, given) => {
  if (typeof stored !== "string" || typeof given !== "string") return false;
  const a = Buffer.from(stored);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// otpAttempts purane documents me missing ho sakta hai, $lt us par match nahi karta
const ATTEMPTS_LEFT = {
  $or: [
    { otpAttempts: { $lt: MAX_OTP_ATTEMPTS } },
    { otpAttempts: { $exists: false } },
  ],
};

// ══════════════════════════════════════════════════════════
// CONTROLLER: pre-approved guest ko OTP + photo + gaadi detail se andar aane do
// Route par multer (upload.single("photo")) lagana zaroori hai.
// ══════════════════════════════════════════════════════════
const allowEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

    const guardId = req.staff?._id ?? req.user?._id;
    // JWT wali building sabse pehle (staffAuth req.buildingCode set karta hai)
    const buildingCode =
      req.buildingCode ?? req.staff?.buildingCode ?? req.user?.buildingCode;

    if (!guardId || !buildingCode) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid visitor id" });
    }
    if (!OTP_RE.test(otp)) {
      return res
        .status(400)
        .json({ success: false, message: "4 digit OTP daalo" });
    }

    // ── GAADI + PHOTO: server par bhi mandatory ──
    const vehicleType = req.body?.vehicleType;
    const vehicleNo =
      typeof req.body?.vehicleNo === "string"
        ? req.body.vehicleNo.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
        : "";

    if (!VEHICLE_TYPES.includes(vehicleType)) {
      return res
        .status(400)
        .json({ success: false, message: "Paidal ya gaadi chuno" });
    }
    if (vehicleType !== "None" && !VEHICLE_RE.test(vehicleNo)) {
      return res.status(400).json({
        success: false,
        message: "Poora number (MH12RE1234) ya aakhri 4 digit daalo",
      });
    }
    if (!req.file || !req.file.mimetype?.startsWith("image")) {
      return res
        .status(400)
        .json({ success: false, message: "Visitor ki photo zaroori hai" });
    }

    // ── CHECKS (galat din ya galat state par OTP attempt kharch nahi hota) ──
    const visitor = await Visitor.findOne({ _id: id, buildingCode })
      .select("verificationMethod status visitDate")
      .lean();
    if (!visitor) {
      return res.status(404).json({ success: false, message: "Nahi mila" });
    }
    if (visitor.verificationMethod !== "OTP") {
      return res.status(400).json({
        success: false,
        message: "Ye pre-approved entry nahi hai",
      });
    }
    if (visitor.status !== "Pending") {
      return res
        .status(409)
        .json({ success: false, message: "Already actioned" });
    }

    const visitISO = visitDateToISO(visitor.visitDate);
    if (visitISO && visitISO !== todayIST()) {
      return res.status(403).json({
        success: false,
        message: `Ye pre-approval ${visitor.visitDate} ke liye hai, aaj ke liye nahi`,
      });
    }

    // ── OTP ATTEMPT: pehle atomic count, phir compare ──
    // Parallel guesses bhi MAX_OTP_ATTEMPTS se zyada nahi ho sakte.
    const attempt = await Visitor.findOneAndUpdate(
      { _id: id, buildingCode, status: "Pending", ...ATTEMPTS_LEFT },
      { $inc: { otpAttempts: 1 } },
      { new: true },
    )
      .select("+otp otpAttempts")
      .lean();

    if (!attempt) {
      return res.status(429).json({
        success: false,
        message:
          "OTP ke bahut galat attempt ho gaye. Member se naya pre-approval banwao.",
      });
    }

    if (!otpMatches(attempt.otp, otp)) {
      const left = Math.max(0, MAX_OTP_ATTEMPTS - (attempt.otpAttempts || 0));
      return res.status(403).json({
        success: false,
        message:
          left > 0
            ? `OTP galat hai. ${left} attempt bache hain.`
            : "OTP galat hai. Attempt khatam, member se naya pre-approval banwao.",
      });
    }

    // ── PHOTO UPLOAD (OTP sahi hone ke baad hi) ──
    let photoUrl;
    try {
      const compressed = await sharp(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      const uploaded = await uploadToCloudinary(compressed, "visitorPhotos");
      photoUrl = uploaded.secure_url;
    } catch (uploadError) {
      console.error("allowEntry photo upload error:", uploadError);
      // Sahi OTP wala attempt wapas do, guard dobara try kar sake
      await Visitor.updateOne({ _id: id }, { $inc: { otpAttempts: -1 } });
      return res.status(502).json({
        success: false,
        message: "Photo upload nahi hui. Dobara try karo.",
      });
    }

    // ── ATOMIC: do guards ek saath allow karein to sirf ek jeetega. OTP consume. ──
    const now = new Date();
    const updated = await Visitor.findOneAndUpdate(
      { _id: id, buildingCode, status: "Pending", otp: attempt.otp },
      {
        $set: {
          status: "Approved",
          guardId,
          approvedAt: now,
          entryTime: now,
          otpVerifiedAt: now,
          photoUrl,
          vehicleType,
          ...(vehicleType !== "None" && { vehicleNo }),
        },
        $unset: { otp: "" },
      },
      { new: true },
    );

    if (!updated) {
      return res
        .status(409)
        .json({ success: false, message: "Already actioned" });
    }

    // ── REAL-TIME + PUSH: best-effort ──
    // Entry save ho chuki hai. Notification fail ho to bhi guard ko success milna chahiye.
    try {
      const io = req.app.get("io");
      const guardRoom = `guard_${updated.buildingCode}`;

      const [guard, member] = await Promise.all([
        Staff.findById(guardId).select("name").lean(),
        Member.findById(updated.respondedBy).select("fcmToken").lean(),
      ]);

      io?.to(guardRoom).emit("visitor_removed_from_preapproved", {
        visitorId: updated._id,
      });
      io?.to(guardRoom).emit("visitor_finalized", { visitorId: updated._id });

      io?.to(`member_${updated.respondedBy}`).emit("visitor_status_update", {
        visitorId: updated._id,
        status: "Approved",
      });

      await notifyStaffToMember({
        io,
        buildingCode: updated.buildingCode,
        memberId: updated.respondedBy,
        memberFcmToken: member?.fcmToken,
        type: "GUEST_APPROVED",
        title: "Guest Entry Approved ✅",
        message: `${updated.name} ko ${guard?.name || "Guard"} ne entry de di`,
        referenceId: updated._id,
        data: {
          visitorId: updated._id,
          status: "Approved",
          approvedAt: updated.approvedAt,
          guardName: guard?.name || "Guard",
          name: updated.name,
          purpose: updated.purpose,
          vehicleType: updated.vehicleType || "None",
          vehicleNo: updated.vehicleNo || "",
        },
      });
    } catch (notifyError) {
      console.error("allowEntry notify error:", notifyError);
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("allowEntry error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default allowEntry;
