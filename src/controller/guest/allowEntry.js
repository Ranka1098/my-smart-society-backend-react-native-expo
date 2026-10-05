import crypto from "crypto";
import mongoose from "mongoose";
import Visitor from "../../model/Visitor.js";
import Staff from "../../model/staff.js";
import Member from "../../model/member.js";
import { notifyStaffToMember } from "../notifcation/notifyMembers.js";

// ══════════════════════════════════════════════════════════
// CONFIG + HELPERS
// ══════════════════════════════════════════════════════════
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const OTP_RE = /^\d{4}$/;

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

// ══════════════════════════════════════════════════════════
// CONTROLLER: pre-approved guest ko OTP se andar aane do
// ══════════════════════════════════════════════════════════
const allowEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

    // Middleware ke hisaab se req.staff ya req.user. Dono try kiye hain.
    const guardId = req.staff?._id ?? req.user?._id;
    const buildingCode =
      req.staff?.buildingCode ?? req.user?.buildingCode ?? req.buildingCode;

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

    // Sirf apni building ka visitor
    const visitor = await Visitor.findOne({ _id: id, buildingCode }).lean();
    if (!visitor) {
      return res.status(404).json({ success: false, message: "Nahi mila" });
    }

    // Walk-in Pending entry is route se approve nahi hogi (member ki sahmati ke bina)
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

    // Pre-approval sirf us din ke liye valid hai
    const visitISO = visitDateToISO(visitor.visitDate);
    if (visitISO && visitISO !== todayIST()) {
      return res.status(403).json({
        success: false,
        message: `Ye pre-approval ${visitor.visitDate} ke liye hai, aaj ke liye nahi`,
      });
    }

    if (!otpMatches(visitor.otp, otp)) {
      return res.status(403).json({ success: false, message: "OTP galat hai" });
    }

    // ATOMIC: do guards ek saath allow karein to sirf ek jeetega. OTP consume.
    const now = new Date();
    const updated = await Visitor.findOneAndUpdate(
      { _id: id, status: "Pending", otp: visitor.otp },
      {
        $set: {
          status: "Approved",
          guardId,
          approvedAt: now,
          entryTime: now,
          otpVerifiedAt: now,
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

      // Dashboard: Pre-OK se hatao
      io?.to(guardRoom).emit("visitor_removed_from_preapproved", {
        visitorId: updated._id,
      });
      io?.to(guardRoom).emit("visitor_finalized", { visitorId: updated._id });

      // Member: guest allow ho gaya
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
