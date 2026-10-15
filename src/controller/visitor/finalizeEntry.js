import mongoose from "mongoose";
import Visitor from "../../model/Visitor.js";
import Member from "../../model/member.js";
import { notifyStaffToMember } from "../../controller/notifcation/notifyMembers.js";

const METHODS = ["FCM", "ManualCall", "ForcedEntry", "Denied", "NoResponse"];
const APPROVING = ["FCM", "ManualCall", "ForcedEntry"];
const CANCELLING = ["Denied", "NoResponse"];
const BLOCKED = ["Rejected", "Exited"];

const fail = (res, code, message) =>
  res.status(code).json({ success: false, message });

// Member ko "entry di gayi" notification (ManualCall / ForcedEntry). Best-effort.
const notifyEntry = async (io, v, method) => {
  const members = await Member.find({ _id: { $in: v.notifiedMembers || [] } })
    .select("_id fcmToken")
    .lean();

  const forced = method === "ForcedEntry";
  const title = forced ? "Force Entry Diya Gaya ⚠️" : "Visitor Entry Verified";
  const message = forced
    ? `${v.name} ko bina response ke force entry di gayi.\nReason: ${v.forcedEntryReason}`
    : `${v.name} ko call par verify karke entry di gayi.`;

  const results = await Promise.allSettled(
    members.map((m) =>
      notifyStaffToMember({
        io,
        buildingCode: v.buildingCode,
        memberId: m._id,
        memberFcmToken: m.fcmToken,
        type: "GUEST_APPROVED",
        title,
        message,
        data: { visitorId: String(v._id), status: v.status, method },
        referenceId: v._id,
      }),
    ),
  );
  results.forEach((r) => {
    if (r.status === "rejected")
      console.error("finalizeEntry notify error:", r.reason);
  });
};

const finalizeEntry = async (req, res) => {
  try {
    const {
      visitorId,
      verificationMethod: method,
      forcedEntryReason,
    } = req.body;
    const buildingCode = req.staff?.buildingCode ?? req.buildingCode;

    if (!buildingCode) return fail(res, 401, "Unauthorized");
    if (
      typeof visitorId !== "string" ||
      !mongoose.isValidObjectId(visitorId) ||
      !METHODS.includes(method)
    ) {
      return fail(res, 400, "Invalid params");
    }

    const reason =
      typeof forcedEntryReason === "string" ? forcedEntryReason.trim() : "";
    if (method === "ForcedEntry" && !reason) {
      return fail(res, 400, "Forced entry ke liye reason required");
    }

    // ── CHECKS (sirf state padho) ──
    const visitor = await Visitor.findOne({ _id: visitorId, buildingCode })
      .select("status awaitingGuardConfirm")
      .lean();
    if (!visitor) return fail(res, 404, "Visitor nahi mila");

    const awaiting = visitor.awaitingGuardConfirm === true;

    if (visitor.status === "Approved" && !awaiting && method !== "Denied") {
      return fail(res, 409, "Already Approved");
    }
    if (BLOCKED.includes(visitor.status)) {
      return fail(res, 409, `Already ${visitor.status}`);
    }
    if (method === "NoResponse" && visitor.status !== "Pending") {
      return fail(res, 409, `Already ${visitor.status}`);
    }

    // ── ATOMIC UPDATE ──
    // Filter mein purani state: do guard ek saath dabayein to sirf ek jeetega.
    const now = new Date();
    const $set = APPROVING.includes(method)
      ? {
          status: "Approved",
          approvedAt: now,
          entryTime: now,
          verificationMethod: method,
          awaitingGuardConfirm: false,
          ...(method === "ForcedEntry" && { forcedEntryReason: reason }),
        }
      : {
          status: "Rejected",
          rejectedAt: now,
          verificationMethod: method,
          awaitingGuardConfirm: false,
          rejectionReason:
            method === "NoResponse"
              ? "Response nahi aaya"
              : "Guard ne cancel kiya",
        };

    const v = await Visitor.findOneAndUpdate(
      {
        _id: visitorId,
        buildingCode,
        status: visitor.status,
        awaitingGuardConfirm: awaiting ? true : { $ne: true },
      },
      { $set },
      {
        returnDocument: "after",
        projection:
          "name buildingCode status notifiedMembers forcedEntryReason",
      },
    ).lean();

    if (!v) return fail(res, 409, "Already actioned");

    // ── REAL-TIME + PUSH: best-effort (entry save ho chuki hai) ──
    const io = req.app.get("io");
    const cancelled = CANCELLING.includes(method);

    const memberEvent = cancelled
      ? "visitor_cancelled_by_guard"
      : "visitor_decided";
    (v.notifiedMembers || []).forEach((memberId) =>
      io
        ?.to(`member_${memberId}`)
        .emit(memberEvent, { visitorId: v._id, status: v.status }),
    );

    if (!cancelled) {
      io?.to(`guard_${v.buildingCode}`).emit("visitor_finalized", {
        visitorId: v._id,
        method,
      });
    }

    if (method === "ManualCall" || method === "ForcedEntry") {
      try {
        await notifyEntry(io, v, method);
      } catch (e) {
        console.error("finalizeEntry notify error:", e);
      }
    }

    return res.status(200).json({
      success: true,
      data: { visitorId: v._id, status: v.status },
    });
  } catch (error) {
    console.error("finalizeEntry error:", error);
    return fail(res, 500, "Server error");
  }
};

export default finalizeEntry;
