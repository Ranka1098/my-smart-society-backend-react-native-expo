import mongoose from "mongoose";
import Visitor from "../../model/Visitor.js";
import NotificationModel from "../../model/notification.js";

const MAX_REASON_LENGTH = 200;

const memberApproveOrDeny = async (req, res) => {
  try {
    const { visitorId, action, rejectionReason } = req.body;
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

    const reason =
      typeof rejectionReason === "string" && rejectionReason.trim()
        ? rejectionReason.trim().slice(0, MAX_REASON_LENGTH)
        : "Member ne deny kiya";

    const update = isApprove
      ? {
          status: "Approved",
          verificationMethod: "FCM",
          approvedAt: now,
          respondedBy: memberId,
        }
      : {
          status: "Denied",
          rejectedAt: now,
          rejectionReason: reason,
          respondedBy: memberId,
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
      { new: true },
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
    try {
      const io = req.app.get("io");

      io?.to(`guard_${visitor.buildingCode}`).emit("visitor_decision", {
        visitorId: visitor._id,
        status: visitor.status,
        action,
        respondedBy: visitor.respondedBy,
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
      await NotificationModel.insertMany(
        (visitor.notifiedMembers ?? []).map((mId) => ({
          buildingCode: visitor.buildingCode,
          type: isApprove ? "GUEST_APPROVED" : "GUEST_REJECTED",
          audience: "SPECIFIC_MEMBER",
          receiverId: mId,
          receiverModel: "MEMBER",
          title: isApprove ? "Guest Approved ✅" : "Guest Denied ❌",
          message: isApprove
            ? `${visitor.name} ko ${decidedByName} ne approve kiya.`
            : `${visitor.name} ko ${decidedByName} ne deny kiya.`,
          referenceId: visitor._id,
          referenceModel: "Visitor",
          data: { flatNo: visitor.flatNo, purpose: visitor.purpose },
        })),
      );
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
