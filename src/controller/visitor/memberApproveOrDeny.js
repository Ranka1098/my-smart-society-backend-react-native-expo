import Visitor from "../../model/Visitor.js";

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
