import Visitor from "../../model/Visitor.js";
import NotificationModel from "../../model/notification.js"; // ✅ NAYA — path check karo

const memberApproveOrDeny = async (req, res) => {
  try {
    const { visitorId, action, rejectionReason } = req.body;
    const memberId = req.member._id;

    if (!visitorId || !["approve", "deny"].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: "visitorId aur action required" });
    }

    const visitor = await Visitor.findById(visitorId);
    if (!visitor)
      return res
        .status(404)
        .json({ success: false, message: "Visitor nahi mila" });

    if (visitor.status !== "Pending") {
      return res
        .status(409)
        .json({ success: false, message: `Already ${visitor.status}` });
    }

    const now = new Date();
    if (now > visitor.notificationExpiresAt) {
      return res.status(410).json({
        success: false,
        message: "Notification expire ho gayi. Guard se baat karo.",
      });
    }

    if (action === "approve") {
      visitor.status = "Approved";
      visitor.verificationMethod = "FCM";
      visitor.approvedAt = now;
      visitor.respondedBy = memberId;
    } else {
      visitor.status = "Rejected";
      visitor.rejectedAt = now;
      visitor.rejectionReason = rejectionReason || "Member ne deny kiya";
      visitor.respondedBy = memberId;
    }

    await visitor.save();

    // ── respondedBy populate karo taaki fullName mile guard ko ──
    await visitor.populate("respondedBy", "fullName");

    const io = req.app.get("io");

    io.to(`guard_${visitor.guardId}`).emit("visitor_decision", {
      visitorId: visitor._id,
      status: visitor.status,
      action,
      respondedBy: visitor.respondedBy,
    });

    // ✅ NEW: sab notified flat-members ko bhi batao, taki dusre members ka modal band ho
    (visitor.notifiedMembers || []).forEach((mId) => {
      io.to(`member_${mId}`).emit("visitor_decided", {
        visitorId: visitor._id,
        status: visitor.status,
        decidedBy: memberId,
      });
    });

    // ✅ NAYA — flat ke sabhi notified members ko DB notification bhi save karo
    const decidedByName = visitor.respondedBy?.fullName || "Member";
    await NotificationModel.insertMany(
      (visitor.notifiedMembers || []).map((mId) => ({
        buildingCode: visitor.buildingCode,
        type: action === "approve" ? "GUEST_APPROVED" : "GUEST_REJECTED",
        audience: "SPECIFIC_MEMBER",
        receiverId: mId,
        receiverModel: "MEMBER",
        title: action === "approve" ? "Guest Approved ✅" : "Guest Denied ❌",
        message:
          action === "approve"
            ? `${visitor.name} ko ${decidedByName} ne approve kiya.`
            : `${visitor.name} ko ${decidedByName} ne deny kiya.`,
        referenceId: visitor._id,
        referenceModel: "Visitor",
        data: { flatNo: visitor.flatNo, purpose: visitor.purpose },
      }))
    );

    return res.status(200).json({
      success: true,
      message: action === "approve" ? "Approved ✅" : "Denied ❌",
      data: { visitorId, status: visitor.status },
    });
  } catch (error) {
    console.error("memberApproveOrDeny error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export default memberApproveOrDeny;
