import mongoose from "mongoose";
import Visitor from "../../model/Visitor.js";
import NotificationModel from "../../model/notification.js";
import Member from "../../model/member.js";
import { notifyStaffToMember } from "../../controller/notifcation/notifyMembers.js";
const MAX_REASON_LENGTH = 200;

const memberApproveOrDeny = async (req, res) => {
  try {
    const { visitorId, action, rejectionReason, leaveWithGuard } = req.body;
    const memberId = req.member._id;

    if (
      typeof visitorId !== "string" ||
      !mongoose.isValidObjectId(visitorId) ||
      !["approve", "deny"].includes(action)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "visitorId aur action required" });
    }

    const isApprove = action === "approve";
    const now = new Date();
    const isParcel = !isApprove && leaveWithGuard === true;

    const reason = isParcel
      ? "Member ne guard ke paas rukne/chhodne ko kaha"
      : typeof rejectionReason === "string" && rejectionReason.trim()
        ? rejectionReason.trim().slice(0, MAX_REASON_LENGTH)
        : "Member ne deny kiya";
    const update = isApprove
      ? {
          status: "Approved",
          verificationMethod: "FCM",
          approvedAt: now,
          respondedBy: memberId,
          awaitingGuardConfirm: true,
        }
      : {
          status: "Denied",
          rejectedAt: now,
          rejectionReason: reason,
          respondedBy: memberId,
          leaveWithGuard: isParcel,
        };

    // ATOMIC: check + update ek saath. Do members ek saath dabayein to sirf ek jeetega.
    // - status Pending ho
    // - ye member notified list me ho (doosre flat/building ka member approve na kar sake,
    //   aur pre-approved OTP entry bhi isse approve nahi hogi, uski notifiedMembers khali hai)
    // - notification expire na hui ho
    const visitor = await Visitor.findOneAndUpdate(
      {
        _id: visitorId,
        status: "Pending",
        notifiedMembers: memberId,
        notificationExpiresAt: { $gte: now },
      },
      { $set: update },
      { returnDocument: "after" },
    ).populate("respondedBy", "fullName");

    if (!visitor) {
      // Fail kyu hua, wo batao
      const existing = await Visitor.findById(visitorId)
        .select("status notifiedMembers")
        .lean();

      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Visitor nahi mila" });
      }

      const isNotified = (existing.notifiedMembers ?? []).some(
        (id) => String(id) === String(memberId),
      );
      if (!isNotified) {
        return res
          .status(403)
          .json({ success: false, message: "Ye request aapke liye nahi hai" });
      }

      if (existing.status !== "Pending") {
        return res
          .status(409)
          .json({ success: false, message: `Already ${existing.status}` });
      }

      return res.status(410).json({
        success: false,
        message: "Notification expire ho gayi. Guard se baat karo.",
      });
    }

    // ── REAL-TIME + DB NOTIFICATION: best-effort ──
    // Decision save ho chuka hai. Yahan fail hone par member ko error nahi dikhna chahiye.
    // ── REAL-TIME + DB NOTIFICATION: best-effort ──
    try {
      const io = req.app.get("io");
      const parcel = isParcel && ["Delivery", "Cab"].includes(visitor.purpose);
      const isCab = visitor.purpose === "Cab";

      io?.to(`guard_${visitor.buildingCode}`).emit("visitor_decision", {
        visitorId: visitor._id,
        status: visitor.status,
        action,
        respondedBy: visitor.respondedBy,
        leaveWithGuard: parcel,
      });

      // Baaki notified members ka modal band karo
      (visitor.notifiedMembers ?? []).forEach((mId) => {
        io?.to(`member_${mId}`).emit("visitor_decided", {
          visitorId: visitor._id,
          status: visitor.status,
          decidedBy: memberId,
        });
      });

      const decidedByName = visitor.respondedBy?.fullName || "Member";

      // 3 case: approve / parcel-wait / deny
      let title, message, type;
      if (isApprove) {
        title = "Guest Approved ✅";
        message = `${visitor.name} ko ${decidedByName} ne approve kiya.`;
        type = "GUEST_APPROVED";
      } else if (parcel) {
        title = isCab
          ? "Cab Ko Gate Par Wait Karne Diya 🚕"
          : "Parcel Guard Ke Paas Chhod Do 📦";
        message = isCab
          ? `${decidedByName} ne kaha: ${visitor.name} ko gate par wait karne do.`
          : `${decidedByName} ne kaha: ${visitor.name} ka parcel guard ke paas chhod do.`;
        type = "GUEST_REJECTED";
      } else {
        title = "Guest Denied ❌";
        message = `${visitor.name} ko ${decidedByName} ne deny kiya.`;
        type = "GUEST_REJECTED";
      }

      const members = await Member.find({
        _id: { $in: visitor.notifiedMembers ?? [] },
      })
        .select("_id fcmToken")
        .lean();

      const results = await Promise.allSettled(
        members.map((m) =>
          notifyStaffToMember({
            io,
            buildingCode: visitor.buildingCode,
            memberId: m._id,
            memberFcmToken: m.fcmToken,
            type,
            title,
            message,
            data: {
              visitorId: String(visitor._id),
              status: visitor.status,
              flatNo: visitor.flatNo,
              purpose: visitor.purpose,
              leaveWithGuard: String(parcel), // FCM data string only
            },
            referenceId: visitor._id,
          }),
        ),
      );
      results.forEach((r) => {
        if (r.status === "rejected")
          console.error("memberApproveOrDeny notify error:", r.reason);
      });
    } catch (notifyError) {
      console.error("memberApproveOrDeny notify error:", notifyError);
    }

    return res.status(200).json({
      success: true,
      message: isApprove ? "Approved ✅" : "Denied ❌",
      data: { visitorId, status: visitor.status },
    });
  } catch (error) {
    console.error("memberApproveOrDeny error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default memberApproveOrDeny;
