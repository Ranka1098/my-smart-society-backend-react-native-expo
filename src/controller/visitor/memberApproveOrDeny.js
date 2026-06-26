// ─────────────────────────────────────────────────────────────────
// POST /api/visitor/approve-or-deny
// Member taps Approve / Deny in app (FCM deep link opens this)
// Body: { visitorId, action: "approve" | "deny", rejectionReason? }
// ─────────────────────────────────────────────────────────────────
const memberApproveOrDeny = async (req, res) => {
  try {
    const { visitorId, action, rejectionReason } = req.body;

    if (!visitorId || !["approve", "deny"].includes(action)) {
      return res
        .status(400)
        .json({ success: false, message: "visitorId aur action required" });
    }

    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res
        .status(404)
        .json({ success: false, message: "Visitor record nahi mila" });
    }

    // already actioned?
    if (visitor.status !== "Pending") {
      return res.status(409).json({
        success: false,
        message: `Already ${visitor.status} — duplicate action ignore karo`,
      });
    }

    const now = new Date();

    // check if notification window expired
    if (now > visitor.notificationExpiresAt) {
      return res.status(410).json({
        success: false,
        message: "Notification expire ho gayi (1 min). Guard se baat karo.",
      });
    }

    if (action === "approve") {
      visitor.status = "Approved";
      visitor.verificationMethod = "FCM";
      visitor.approvedAt = now;
    } else {
      visitor.status = "Rejected";
      visitor.rejectedAt = now;
      visitor.rejectionReason = rejectionReason || "Member ne deny kiya";
    }

    await visitor.save();

    // TODO: push real-time update to guard via Socket.io
    // io.to(`guard_${visitor.guardId}`).emit("visitor_decision", {
    //   visitorId, action, status: visitor.status
    // });

    return res.status(200).json({
      success: true,
      message:
        action === "approve" ? "Entry approve ho gayi" : "Entry deny ho gayi",
      data: { visitorId, status: visitor.status },
    });
  } catch (error) {
    console.error("memberApproveOrDeny error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};